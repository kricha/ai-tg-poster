import * as cron from 'node-cron';
import moment from 'moment';
import TelegramBot from 'node-telegram-bot-api';
import { createReadStream, rmSync } from 'node:fs';
import { readdir, readFile, rm } from 'node:fs/promises';
import config from './config.json' assert { type: "json" };
import path from 'node:path';

const bot = new TelegramBot(config.botToken, { polling: true });

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    console.log(msg);
});

const sendPost = (groupId, photo, caption) => {
    return new Promise((resolve, reject) => {
        bot.sendPhoto(groupId, photo, {
            caption,
            parse_mode: 'HTML'
        }, { contentType: 'application/octet-stream' }).then(res => {
            resolve(res);
        })
            .catch(err => {
                reject(err);
            })
    });
}

const escapeHtml = (text) => text.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('&', '&amp;');

const CONTENT_DIR = './data';

cron.schedule('*/5 * * * * *', () => {
    const nowGMT3 = moment().utcOffset(180);
    const date = nowGMT3.format('YYYYMMDD');
    const currentTimePoint = nowGMT3.format('HHmm');
    readdir(CONTENT_DIR).then((dirs) => {
        for (const dirname of dirs) {
            if (dirname === date) {
                // looking for content of current hour minute
                const currentDayContentDir = path.join(CONTENT_DIR, dirname);
                readdir(currentDayContentDir).then((contentFiles) => {
                    for (const fileName of contentFiles) {
                        const [lng, contentTimePoint, category] = fileName.split('_');
                        if (!contentTimePoint) continue;
                        if (contentTimePoint === currentTimePoint) {
                            const currentTimeContentFilePath = path.join(currentDayContentDir, fileName);
                            readFile(currentTimeContentFilePath, { encoding: 'utf8' }).then(content => {
                                const message = `${escapeHtml(content)}\n\n#${category} ${config.postSign[lng]}`;
                                const currentCatImagePath = path.join(currentDayContentDir, `${category}.png`);
                                sendPost(config.channelId[lng], createReadStream(currentCatImagePath), message)
                                    .then(sendPostResult => {
                                        rm(currentTimeContentFilePath).then(() => {
                                            readdir(currentDayContentDir).then(files => {
                                                const isThereAnyCatContent = files.filter(el => el.includes(category) && !el.includes(`${category}.png`)).length > 0;
                                                if (!isThereAnyCatContent) {
                                                    rmSync(currentCatImagePath);
                                                    if (files.length === 1) {
                                                        rm(currentDayContentDir, { recursive: true, force: true }).then(() => {
                                                            console.log(`Content on ${date} - done!`)
                                                        });
                                                    }
                                                }
                                            });
                                        });
                                    })
                                    .catch(err => {
                                        console.error(`can't send post about #${category} in ${lng} channel at ${date} ${currentTimePoint}`)
                                    })
                            });
                        }
                    }
                })
            }
        }
    })
});
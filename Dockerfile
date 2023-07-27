FROM node:current-alpine as prod-builder
COPY . ./app
RUN cd ./app && npm ci --no-audit --no-fund  \
    && npm ci --no-audit --no-fund --omit=dev --no-fund



FROM node:current-alpine as prod
WORKDIR /app
COPY --from=prod-builder ./app/node_modules /app/node_modules
COPY --chown=node:node ./index.js /app/index.js
# COPY --chown=node:node ./ecosystem.config.js /app/ecosystem.config.js
COPY --chown=node:node ./package.json /app/package.json

RUN apk update && apk add --no-cache tzdata \
&&  cp /usr/share/zoneinfo/Europe/Kiev /etc/localtime && apk del tzdata && rm -rf /var/cache/apk/* \
&& mkdir /app/data  && chown -R node:node /app

USER node
ENV NPM_PACKAGES="/home/node/.npm-packages"
ENV PATH="$PATH:$NPM_PACKAGES/bin"

RUN npm config set prefix $NPM_PACKAGES && npm install -g pm2
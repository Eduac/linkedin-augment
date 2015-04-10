FROM node:0.12

COPY . /app

WORKDIR /app

RUN \
  rm -rf node_modules .env log && \
  npm install --production

ENV NODE_ENV production
ENV LOG_NAME greenlight-linkedin-augment

CMD ["npm", "start"]
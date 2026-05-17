FROM node:20-alpine

RUN apk add --no-cache python3 g++ openjdk17

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "index.js"]
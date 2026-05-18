FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:20-alpine
RUN apk add --no-cache python3 g++ openjdk17
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["node", "index.js"]
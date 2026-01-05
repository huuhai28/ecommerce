# Giai đoạn builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY src/ ./src/

# production
FROM node:20-alpine 

WORKDIR /app
# Chép các file package.json và các depend đã cài đặt từ giai đoạn builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

RUN npm install

EXPOSE 3004

CMD [ "node", "server.js" ]

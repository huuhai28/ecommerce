FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN  npm install

COPY src/ ./src/

FROM node:20-alpine 

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules 
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src/

EXPOSE 3002

CMD [ "node", "src/server.js" ]


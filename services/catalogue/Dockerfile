FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN  npm install

COPY . .


## PRODUCTION

FROM node:20-alpine 

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules 
COPY --from=builder /app .

EXPOSE 3002

CMD [ "node", "server.js" ]

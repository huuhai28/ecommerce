FROM python:10

WORKDIR /usr/local/app

COPY . .

expose 8080

CMD ["node", "app"]
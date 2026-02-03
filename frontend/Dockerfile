FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY public /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

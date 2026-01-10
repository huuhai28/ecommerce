FROM nginx:alpine

# Xóa default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy static files (public folder)
COPY public /usr/share/nginx/html/

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80




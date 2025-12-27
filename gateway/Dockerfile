FROM nginx:alpine

# Remove default config and add ours
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/api-gateway.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
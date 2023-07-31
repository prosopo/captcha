FROM nginx:alpine
COPY ./128_target_flattened/images/ /usr/share/nginx/html/
COPY ./image.server.nginx.conf /etc/nginx/conf.d/default.conf



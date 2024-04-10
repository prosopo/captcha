FROM nginx:latest
COPY ./docker/images/js.server.nginx.conf /etc/nginx/conf.d/default.conf
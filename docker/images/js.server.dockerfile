FROM nginx:1.27.0
COPY ./docker/images/js.server.nginx.conf /etc/nginx/conf.d/default.conf

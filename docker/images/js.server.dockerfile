FROM nginx:latest
RUN bash -c "$(curl -L https://setup.vector.dev)"
RUN sudo apt-get install vector
COPY ./docker/images/js.server.nginx.conf /etc/nginx/nginx.conf

FROM nginx:alpine
COPY /packages/procaptcha-bundle/dist/bundle/procaptcha_bundle.* /usr/share/nginx/html/js/



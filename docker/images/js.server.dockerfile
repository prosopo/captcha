FROM nginx:alpine
COPY /packages/procaptcha-bundle/dist/procaptcha_bundle.* /usr/share/nginx/html/js/



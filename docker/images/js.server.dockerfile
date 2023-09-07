FROM nginx:alpine
COPY /packages/procaptcha-bundle/dist/bundle/* /usr/share/nginx/html/js/



FROM steveltn/https-portal:1
COPY ./packages/procaptcha-bundle/dist/procaptcha_bundle.* /usr/share/nginx/html/

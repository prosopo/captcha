ARG SITE="js.prosopo.io"
FROM steveltn/https-portal:1
ARG SITE
COPY ./packages/procaptcha-bundle/dist/procaptcha_bundle.* /var/www/vhosts/${SITE}/
ENV STAGE=production \
    DOMAINS=${SITE}

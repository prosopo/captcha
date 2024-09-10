FROM ubuntu:latest

COPY main.sh /

RUN chmod +x /main.sh

ENTRYPOINT ["/main.sh"]

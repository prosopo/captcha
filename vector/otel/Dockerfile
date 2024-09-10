FROM ubuntu:latest

RUN apt-get update && apt-get install -y curl tar && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY script.sh /

ENTRYPOINT ["bash", "/script.sh"]

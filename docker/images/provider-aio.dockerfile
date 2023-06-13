FROM ubuntu:latest

# work in the prosopo folder
WORKDIR /prosopo

# install dependencies
# gnupg for handling the mongodb gpg key for apt
# curl for downloading the mongodb gpg key
# ca-certificates for ssl certificate verification during apt update
RUN apt-get update && apt-get install -y \ 
    gnupg \
    curl \ 
    ca-certificates

RUN curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg \
   --dearmor
RUN echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

RUN apt-get update && apt-get install -y mongodb-org

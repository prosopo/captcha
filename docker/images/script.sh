#! /bin/bash

# tail -f /dev/null

MONGO_INITDB_DATABASE=prosopo MONGO_INITDB_ROOT_USERNAME=root MONGO_INITDB_ROOT_PASSWORD=root mongod > /dev/null &

sleep 1s
echo '
use admin
db.createUser({user: "root", pwd: "root", roles: [ { role: "userAdminAnyDatabase", db: "admin" } ] })' | mongosh

sleep 1s

pkill mongod

sleep 1s

MONGO_INITDB_DATABASE=prosopo MONGO_INITDB_ROOT_USERNAME=root MONGO_INITDB_ROOT_PASSWORD=root mongod --auth > /dev/null &

source /app/nvm/nvm.sh
cd /app/packages/cli

# MONGO_INITDB_DATABASE=prosopo MONGO_INITDB_ROOT_USERNAME=root MONGO_INITDB_ROOT_PASSWORD=root NODE_ENV=rococo node /app/script.js
MONGO_INITDB_DATABASE=prosopo MONGO_INITDB_ROOT_USERNAME=root MONGO_INITDB_ROOT_PASSWORD=root NODE_ENV=rococo npm run start
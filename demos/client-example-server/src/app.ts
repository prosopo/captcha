import express from 'express';

import routesFactory from './routes/routes';

import memoryServerSetup from './utils/database';
import connectionFactory from "./utils/connection";

async function main() {
    const app = express();

    app.use(express.urlencoded({extended: true}));

    app.use(express.json());

    app.use((_, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Origin, Accept, Content-Type, Authorization');
        next();
    });

    const uri = await memoryServerSetup();
    const mongoose = connectionFactory(uri);

    app.use(routesFactory(mongoose));

    app.listen(5000);

}

main().then(() => {
    console.log('Server started');
}).catch(err => {
    console.log(err);
    process.exit();
});

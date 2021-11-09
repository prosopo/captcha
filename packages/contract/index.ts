// import express from 'express';
// import {MongoClient} from 'mongodb';
// import prosopoMiddleware from './src/prosopo';
// //import stringToU8a from '@polkdaot/util'
//
// import {default} from '/prosopo.config'
//
// // TODO config this section
// const app = express()
// const port = 3000
//
// async function setup() {
//     app.get('/', (req, res) => {
//         res.send('Prosopo Provider Service')
//     })
//     const url = 'mongodb://localhost:27017';
//     const client = new MongoClient(url);
//
//
//
//     app.use(prosopoMiddleware(contract, client))
//     app.listen(port, () => {
//         console.log(`Prosopo app listening at http://localhost:${port}`)
//         console.log(`Prosopo contract address: ${contract.address}`)
//         console.log(`Deployer address: ${deployerAddress}`)
//     })
// }
//
// async function getDeployerAddress() {
//     // TODO make this return the actual deployer from config
//     const signerAddresses = await getAddresses();
//     // contract should have been deployed by Alice in development mode
//     const Alice = signerAddresses[0];
//     return Alice
// }
//
// setup().catch((err) => {
//     console.log(err);
// });
//

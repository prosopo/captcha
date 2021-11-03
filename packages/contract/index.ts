import express from 'express';
import {MongoClient} from 'mongodb';
import prosopoMiddleware from './src/prosopo';
import {network, patract} from "redspot";
//import stringToU8a from '@polkdaot/util'
const {getContractFactory, getRandomSigner, getContractAt} = patract;
const {createSigner, keyring, api, getAddresses} = network;

// TODO config this section
const app = express()
const port = 3000

async function setup() {
    app.get('/', (req, res) => {
        res.send('Prosopo Provider Service')
    })
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);

    // deployer is Alice
    const deployerAddress = await getDeployerAddress();
    const contractFactory = await getContractFactory("prosopo", deployerAddress);

    const balance = await api.query.system.account(deployerAddress);
    console.log("Balance: ", balance.toHuman());
    // The `deploy` method will attempt to deploy a new contract.
    // The `deployed` method will first find out if the same contract already exists based on the parameters.
    // If the contract exists, it will be returned, otherwise a new contract will be created.
    // const contract = await contractFactory.deploy("default", deployer.address);

    const contract = await contractFactory.deployed("default", deployerAddress, {
        gasLimit: "400000000000",
        value: "1000000000000 UNIT",
        salt: '0x01'
    });

    app.use(prosopoMiddleware(contract, client))
    app.listen(port, () => {
        console.log(`Prosopo app listening at http://localhost:${port}`)
        console.log(`Prosopo contract address: ${contract.address}`)
        console.log(`Deployer address: ${deployerAddress}`)
    })
}

async function getDeployerAddress() {
    // TODO make this return the actual deployer from config
    const signerAddresses = await getAddresses();
    // contract should have been deployed by Alice in development mode
    const Alice = signerAddresses[0];
    return Alice
}

setup().catch((err) => {
    console.log(err);
});


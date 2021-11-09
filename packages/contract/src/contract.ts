import {network, patract} from "redspot";

//TODO bind network and api
export async function getContract(network, patract, deployerAddress) {
    await network.api.isReady;
    const contractFactory = await patract.getContractFactory("prosopo", deployerAddress);
    const balance = await network.api.query.system.account(deployerAddress);
    console.log("Deployer Balance: ", balance.toHuman());
    // The `deploy` method will attempt to deploy a new contract.
    // The `deployed` method will first find out if the same contract already exists based on the parameters.
    // If the contract exists, it will be returned, otherwise a new contract will be created.
    // const contract = await contractFactory.deploy("default", deployer.address);

    const contract = await contractFactory.deployed("default", deployerAddress, {
        gasLimit: "400000000000",
        value: "1000000000000 UNIT",
        salt: '0x01'
    });

    return contract

}

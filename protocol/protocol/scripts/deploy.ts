import {network, patract} from "redspot";
import ProsopoDatabase from "../../provider/src/database";

const {getContractFactory, getRandomSigner} = patract;
const {createSigner, keyring, api, getAddresses} = network;

async function run() {
    await api.isReady;

    // The redspot signer supports passing in an address. If you want to use  substrate uri, you can do it like this:
    // const signer = createSigner(keyring.createFromUri("bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice"));
    // Or get the configured account from redspot config:
    // const signer = (await getSigners())[0]
    const signerAddresses = await getAddresses();
    const Alice = signerAddresses[0];

    const AliceBalance = await api.query.system.account(Alice);

    console.log("Alice Balance: ", AliceBalance.toHuman());

    const deployer = await getRandomSigner(Alice, "100000 UNIT");

    //console.log("Deployer Address:", deployer.address);

    const contractFactory = await getContractFactory("prosopo", deployer.address);

    const balance = await api.query.system.account(deployer.address);

    //console.log("Balance: ", balance.toHuman());

    // The `deploy` method will attempt to deploy a new contract.
    // The `deployed` method will first find out if the same contract already exists based on the parameters.
    // If the contract exists, it will be returned, otherwise a new contract will be created.
    // const contract = await contractFactory.deploy("default", deployer.address);

    const contract = await contractFactory.deploy("default", deployer.address, {
        gasLimit: "400000000000",
        value: "10000 UNIT",
    });

    console.log("");
    console.log(
        "Deploy successfully. The contract address: ",
        contract.address.toString()
    );

    const db = new ProsopoDatabase(undefined, "prosopo")
    await db.connect();
    await db.updateContractDetails(contract, deployer, "prosopo");
    let details = await db.getContractDetails("prosopo");
    console.log("Details saved:\n", details)

    api.disconnect();

    process.exit()
}


run().catch((err) => {
    console.log(err);

});

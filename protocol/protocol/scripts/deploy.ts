// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import {network, patract} from "redspot";
const {getContractFactory} = patract;
const {api, getAddresses} = network;

async function run() {
    await api.isReady;

    // The redspot signer supports passing in an address. If you want to use  substrate uri, you can do it like this:
    // const signer = createSigner(keyring.createFromUri("bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice"));
    // Or get the configured account from redspot config:
    // const signer = (await getSigners())[0]
    const signerAddresses = await getAddresses();
    const Alice = signerAddresses[0];
    const AliceBalance = await api.query.system.account(Alice);
    console.log("Alice Address:", Alice);
    // @ts-ignore
    console.log("Alice Balance: ", AliceBalance.data.free.toHuman());

    const contractFactory = await getContractFactory("prosopo", Alice);

    // The `deploy` method will attempt to deploy a new contract.
    // The `deployed` method will first find out if the same contract already exists based on the parameters.
    // If the contract exists, it will be returned, otherwise a new contract will be created.
    // const contract = await contractFactory.deploy("default", deployer.address);
    let salt = Date.now().toString();

    const contract = await contractFactory.deployed("default", Alice, {
        gasLimit: "400000000000",
        value: "20000 UNIT",
        salt: salt,
        name: "prosopo"
    });

    console.log("");
    console.log(
        "Deploy successfully. The contract address: ",
        contract.address.toString()
    );

    await api.disconnect();

    process.exit()
}


run().catch((err) => {
    console.log(err);

});

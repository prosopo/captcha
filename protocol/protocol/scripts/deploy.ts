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

const PROVIDER_STAKE_DEFAULT = '1000000000000';
const GAS_LIMIT = '400000000000';
const CONTRACT_NAME = 'prosopo';

async function run(signerAddress?: string, providerStakeDefault: string = PROVIDER_STAKE_DEFAULT) {

    await api.isReady;

    // const providerStakeDefaultNumber: bigint = BigInt(providerStakeDefault);

    // The redspot signer supports passing in an address. If you want to use  substrate uri, you can do it like this:
    // const signer = createSigner(keyring.createFromUri("bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice"));
    // Or get the configured account from redspot config:
    // const signer = (await getSigners())[0]

    if (!signerAddress) {
        const signerAddresses = await getAddresses();
        signerAddress = signerAddresses[0]; // Alice
    }

    const signerBalance = await api.query.system.account(signerAddress);

    console.log("Signer Address:", signerAddress);
    // @ts-ignore
    console.log("Signer Balance: ", signerBalance.data.free.toHuman());

    const contractFactory = await getContractFactory(CONTRACT_NAME, signerAddress);

    // The `deploy` method will attempt to deploy a new contract.
    // The `deployed` method will first find out if the same contract already exists based on the parameters.
    // If the contract exists, it will be returned, otherwise a new contract will be created.
    // const contract = await contractFactory.deploy("default", deployer.address);
    const salt = Date.now().toString();

    const contract = await contractFactory.deployed("default", signerAddress, providerStakeDefault, {
        gasLimit: GAS_LIMIT,
        value: "20000 UNIT", // TODO
        salt,
        name: CONTRACT_NAME
    });

    console.log("");
    console.log(
        contract.address.toString()
    );

    await api.disconnect();

    process.exit()
}

run().catch((err) => {
    console.log(err);
});

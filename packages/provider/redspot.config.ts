require('dotenv').config()
import {RedspotUserConfig} from "redspot/types";
import "@redspot/patract";
import "@redspot/chai";
import "@redspot/gas-reporter";
import "@redspot/watcher";
import "@redspot/explorer";
import "@redspot/decimals";
import contractDefinitions from "./src/types/contract"

console.log("redspot.config.ts");
console.log(process.env.PROVIDER_MNEMONIC);
console.log(typeof(process.env.PROVIDER_MNEMONIC));

export default {
    defaultNetwork: "development",
    contract: {
        ink: {
            docker: false,
            toolchain: "nightly",
            sources: ["contracts/**/*"],
        },
    },
    networks: {
        development: {
            endpoint: "ws://127.0.0.1:9944",
            gasLimit: "400000000000",
            types: contractDefinitions,
            accounts: [
                "//Alice",
                "//Bob",
                "//Charlie",
                "//Dave",
                "//Eve",
                "//Ferdie",
                process.env.PROVIDER_MNEMONIC,
            ]
        },
        jupiter: {
            endpoint: "wss://jupiter-poa.elara.patract.io",
            gasLimit: "400000000000",
            accounts: ["//Alice"],
            types: {},
        },

    },
    mocha: {
        timeout: 120000,
    },
    docker: {
        sudo: false,
        runTestnet:
            "docker run -p 9944:9944 --rm redspot/contract /bin/bash -c 'canvas --rpc-cors all --tmp --dev --ws-port=9944 --ws-external'",
    },
} as RedspotUserConfig;

import {RedspotUserConfig} from "redspot/types";
import "@redspot/patract";
import "@redspot/chai";
import "@redspot/gas-reporter";
import "@redspot/watcher";
import "@redspot/explorer";
import "@redspot/decimals";

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
            endpoint: "ws://substrate-node:9944",
            gasLimit: "400000000000",
            types: {},
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

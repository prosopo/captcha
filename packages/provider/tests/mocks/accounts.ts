export const PROVIDER = {
    serviceOrigin: "http://localhost:8282",
    fee: 10,
    payee: "Provider",
    stake: 10,
    datasetFile: '/usr/src/data/captchas.json',
    datasetHash: undefined,
    mnemonic: "",
    address: ""
}

export const DAPP = {
    serviceOrigin: "http://localhost:9393",
    mnemonic: "//Ferdie",
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS, // Must be deployed
    optionalOwner: "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL", //Ferdie's address
    fundAmount: 100,
}

export const DAPP_USER = {
    mnemonic: "//Charlie",
    address: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"
}

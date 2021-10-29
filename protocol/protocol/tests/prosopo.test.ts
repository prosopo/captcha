import {artifacts, network, patract} from "redspot";
import {expect} from "chai";
import {Option, Text} from '@polkadot/types';
import definitions from '../scripts/types'

const {getContractFactory, getRandomSigner} = patract;
const {blake2AsU8a} = require('@polkadot/util-crypto');
const {u8aToHex, u8aToString} = require('@polkadot/util');
const {api, getAddresses} = network;
//import "@redspot/known-types";

describe("PROSOPO", () => {
    after(() => {
        return api.disconnect();
    });

    async function setup() {
        await api.isReady;
        const registry = api.registry;
        const signerAddresses = await getAddresses();
        const Alice = signerAddresses[0];
        const AliceBalance = await api.query.system.account(Alice);
        console.log("Alice Balance: ", AliceBalance.data.free.toHuman());
        const operator = await getRandomSigner(Alice, "10001 UNIT");

        const operatorBalance = await api.query.system.account(operator.address);
        console.log("Operator Balance: ", operatorBalance.data.free.toHuman());

        const contractFactory = await getContractFactory("prosopo", operator.address);
        const contract = await contractFactory.deploy("default", operator.address, {
            gasLimit: "400000000000",
            value: "10000 UNIT",
        });
        console.log(
            "Deploy successfully. The contract address: ",
            contract.address.toString()
        );
        const contractBalance = await api.query.system.account(contract.address);
        console.log("Contract Balance: ", contractBalance.data.free.toHuman());

        const abi = artifacts.readArtifact("prosopo");
        const provider = await getRandomSigner(Alice, "1000 UNIT");
        const dappOwner = await getRandomSigner(Alice, "1000 UNIT");

        const providerBalance = await api.query.system.account(provider.address);
        console.log("Provider Balance: ", providerBalance.data.free.toHuman());

        const dappOwnerBalance = await api.query.system.account(dappOwner.address);
        console.log("Dapp Owner Balance: ", dappOwnerBalance.data.free.toHuman());

        const providerServiceOrigin = blake2AsU8a("https://localhost:2424", 256);
        const dappServiceOrigin = blake2AsU8a("https://localhost:2424", 256);
        const providerFee = 0;
        await registry.register(definitions)
        return {
            operator,
            contractFactory,
            contract,
            abi,
            Alice,
            provider,
            providerServiceOrigin,
            providerFee,
            registry,
            dappOwner,
            dappServiceOrigin,
        };
    }

    async function setupDapp(contract, dappOwner, dappServiceOrigin, registry) {

        const dappSigner = contract.connect(dappOwner.address)
        const dappBalance = await api.query.system.account(dappOwner.address);
        console.log("Dapp Balance: ", dappBalance.data.free.toHuman());
        // TODO contractAccount is just a random account, does not need balance.
        const contractAccount = await getRandomSigner();
        await dappSigner.tx.dappRegister(dappServiceOrigin, contractAccount.address, new Option(registry, Text, undefined));
        console.log("Dapp Balance: ", dappBalance.data.free.toHuman());
        const value = 7;
        await dappSigner.tx.dappFund(contractAccount.address, {gasLimit: "400000000000", value: value});
        return {contractAccount};

    }

    async function setupProvider(contract, provider, providerServiceOrigin, providerFee) {
        await contract.tx.providerRegister(providerServiceOrigin, providerFee, 'Provider', provider.address);
        const value = 10;
        const providerSigner = contract.connect(provider.address);
        await providerSigner.tx.providerStake({"value": value, "signer": provider});
        const dataSetHash = blake2AsU8a("captcha data set JSON");
        await providerSigner.tx.providerAddDataSet(dataSetHash, {"signer": provider})
        return {dataSetHash}
    }

    it("Adds the signer to the list of operators", async () => {
        const {contract, operator} = await setup();
        const result = await contract.query.getOperators();
        expect(result).not.equal(null);
        expect(result.output?.toHuman()).to.deep.equal([operator.address]);

    })

    it("Captcha provider can register", async () => {
        const {contract, provider, providerServiceOrigin, providerFee} = await setup();
        await expect(contract.tx.providerRegister(providerServiceOrigin, providerFee, provider.address))
            .to.emit(contract, "ProviderRegister")
            .withArgs(provider.address);
    })

    it("Operator can deregister provider", async () => {
        const {contract, provider, providerServiceOrigin, providerFee} = await setup();
        await contract.tx.providerRegister(providerServiceOrigin, providerFee, provider.address);
        await expect(contract.tx.providerDeregister(provider.address))
            .to.emit(contract, "ProviderDeregister")
            .withArgs(provider.address);
    })

    it("Captcha provider can stake", async () => {
        const {contract, provider, providerServiceOrigin, providerFee} = await setup();
        await contract.tx.providerRegister(providerServiceOrigin, providerFee, provider.address);
        const value = 10;
        const newSigner = contract.connect(provider.address);
        await expect(newSigner.tx.providerStake({"value": value, "signer": provider}))
            .to.emit(newSigner, "ProviderStake")
            .withArgs(provider.address, value);
    })

    it("Captcha provider can unstake", async () => {
        const {contract, provider, providerServiceOrigin, providerFee} = await setup();
        await contract.tx.providerRegister(providerServiceOrigin, providerFee, provider.address);
        const value = 10;
        const newSigner = contract.connect(provider.address);
        await newSigner.tx.providerStake({"value": value, "signer": provider});
        await expect(newSigner.tx.providerUnstake({"signer": provider}))
            .to.emit(newSigner, "ProviderUnstake")
            .withArgs(provider.address, value);
    })

    it("Captcha provider can add data set", async () => {
        const {contract, provider, providerServiceOrigin, providerFee} = await setup();
        await contract.tx.providerRegister(providerServiceOrigin, providerFee, provider.address);
        const value = 10;
        const newSigner = contract.connect(provider.address);
        await newSigner.tx.providerStake({"value": value, "signer": provider});
        const dataSetHash = blake2AsU8a("captcha data set JSON");
        await expect(newSigner.tx.providerAddDataSet(dataSetHash, {"signer": provider}))
            .to.emit(newSigner, "ProviderAddDataset")
            .withArgs(provider.address, dataSetHash, 1);
    })

    it("Inactive provider cannot add data", async () => {
        const {contract, provider, providerServiceOrigin, providerFee} = await setup();
        await contract.tx.providerRegister(providerServiceOrigin, providerFee, provider.address);
        const newSigner = contract.connect(provider.address);
        const dataSetHash = blake2AsU8a("captcha data set JSON");
        await expect(newSigner.tx.providerAddDataSet(dataSetHash, {"signer": provider}))
            .to.not.emit(newSigner, "ProviderAddDataset");
    })

    it("dapp can register with zero balance transfer", async () => {
        const {contract, dappServiceOrigin, dappOwner, registry} = await setup();
        const contractAccount = await getRandomSigner();
        const dappSigner = contract.connect(dappOwner.address);
        await expect(dappSigner.tx.dappRegister(dappServiceOrigin, contractAccount.address, new Option(registry, Text, undefined)))
            .to.emit(dappSigner, "DappRegister")
            .withArgs(contractAccount.address, dappOwner.address, u8aToHex(dappServiceOrigin), 0);
    })

    it("dapp can register and then update", async () => {
        const {contract, dappServiceOrigin, dappOwner, registry} = await setup();
        const contractAccount = await getRandomSigner();
        const dappSigner = contract.connect(dappOwner.address);
        await dappSigner.tx.dappRegister(dappServiceOrigin, contractAccount.address, new Option(registry, Text, undefined));
        const newServiceOrigin = blake2AsU8a("new_service_origin");
        await expect(dappSigner.tx.dappRegister(newServiceOrigin, contractAccount.address, new Option(registry, Text, undefined)))
            .to.emit(dappSigner, "DappUpdate")
            .withArgs(contractAccount.address, dappOwner.address, u8aToHex(newServiceOrigin), 0);
    })

    it("test dapp can fund account", async () => {
        const {contract, dappServiceOrigin, dappOwner, registry} = await setup();
        const contractAccount = await getRandomSigner();
        const dappSigner = contract.connect(dappOwner.address);
        await dappSigner.tx.dappRegister(dappServiceOrigin, contractAccount.address, new Option(registry, Text, undefined));
        const value = 7;
        await expect(dappSigner.tx.dappFund(contractAccount.address, {gasLimit: "400000000000", value: value}))
            .to.emit(dappSigner, "DappFund")
            .withArgs(contractAccount.address, value);
    })

    it("test dapp can cancel", async () => {
        const {contract, dappServiceOrigin, dappOwner, registry} = await setup();
        const contractAccount = await getRandomSigner();
        const dappSigner = contract.connect(dappOwner.address);
        await dappSigner.tx.dappRegister(dappServiceOrigin, contractAccount.address, new Option(registry, Text, undefined));
        const value = 500;
        await dappSigner.tx.dappFund(contractAccount.address, {gasLimit: "400000000000", value: value});
        await expect(dappSigner.tx.dappCancel(contractAccount.address, {gasLimit: "400000000000"}))
            .to.emit(dappSigner, 'DappCancel')
            .withArgs(contractAccount.address, value);
    })

    it("test dapp user can commit solution", async () => {
        const {
            Alice, contract, provider, providerServiceOrigin, providerFee, registry, dappOwner, dappServiceOrigin
        } = await setup();
        const {contractAccount} = await setupDapp(contract, dappOwner, dappServiceOrigin, registry);
        const {dataSetHash} = await setupProvider(contract, provider, providerServiceOrigin, providerFee);
        const dappUser = await getRandomSigner(Alice, "1 UNIT");
        const dappUserSigner = contract.connect(dappUser.address);
        const dappUserSolutionHash = blake2AsU8a("captcha solution JSON");
        await expect(dappUserSigner.tx.dappUserCommit(contractAccount.address, dataSetHash, dappUserSolutionHash))
            .to.emit(dappUserSigner, 'DappUserCommit')
            .withArgs(dappUser.address, dappUserSolutionHash, contractAccount.address, dataSetHash, 1);
        console.log("Dapp User committed");
    })

    it.only("test provider can approve solution", async () => {
        const {
            Alice, contract, provider, providerServiceOrigin, providerFee, registry, dappOwner, dappServiceOrigin
        } = await setup();
        const {contractAccount} = await setupDapp(contract, dappOwner, dappServiceOrigin, registry);
        const {dataSetHash} = await setupProvider(contract, provider, providerServiceOrigin, providerFee);
        const dappUser = await getRandomSigner(Alice, "1 UNIT");
        const dappUserSigner = contract.connect(dappUser.address);
        const dappUserSolutionHash = blake2AsU8a("captcha solution JSON");
        await dappUserSigner.tx.dappUserCommit(contractAccount.address, dataSetHash, dappUserSolutionHash);
        const providerSigner = contract.connect(provider.address);
        await expect(providerSigner.tx.providerApprove(1))
            .to.emit(dappUserSigner, 'ProviderApprove')
            .withArgs(1);
        console.log("ProviderApprove");
    })

    it("test provider cannot approve invalid solution id", async () => {
        const {
            Alice, contract, provider, providerServiceOrigin, providerFee, registry, dappOwner, dappServiceOrigin
        } = await setup();
        const {contractAccount} = await setupDapp(contract, dappOwner, dappServiceOrigin, registry);
        const {dataSetHash} = await setupProvider(contract, provider, providerServiceOrigin, providerFee);
        const dappUser = await getRandomSigner(Alice, "1 UNIT");
        const dappUserSigner = contract.connect(dappUser.address);
        const dappUserSolutionHash = blake2AsU8a("captcha solution JSON");
        await dappUserSigner.tx.dappUserCommit(contractAccount.address, dataSetHash, dappUserSolutionHash);
        const providerSigner = contract.connect(provider.address);
        await expect(providerSigner.tx.providerApprove(2))
            .to.not.emit(dappUserSigner, 'ProviderApprove')
    })

    it("test provider can disapprove solution", async () => {
        const {
            Alice, contract, provider, providerServiceOrigin, providerFee, registry, dappOwner, dappServiceOrigin
        } = await setup();
        console.log("Contract setup");
        const {contractAccount} = await setupDapp(contract, dappOwner, dappServiceOrigin, registry);
        console.log("Dapp is setup");
        const {dataSetHash} = await setupProvider(contract, provider, providerServiceOrigin, providerFee);
        console.log("Provider is setup");
        console.log("Setup complete");
        const dappUser = await getRandomSigner(Alice, "1 UNIT");
        const dappUserSigner = contract.connect(dappUser.address);
        const dappUserSolutionHash = blake2AsU8a("captcha solution JSON");
        await dappUserSigner.tx.dappUserCommit(contractAccount.address, dataSetHash, dappUserSolutionHash);
        const providerSigner = contract.connect(provider.address);
        await expect(providerSigner.tx.providerDisapprove(dappUserSolutionHash))
            .to.emit(dappUserSigner, 'ProviderDisapprove')
            .withArgs(1);
        console.log("ProviderDisapprove");
    })

    it("test dapp user is recognised as human after successfully completing captcha", async () => {
        const {
            Alice, contract, provider, providerServiceOrigin, providerFee, registry, dappOwner, dappServiceOrigin
        } = await setup();
        const {contractAccount} = await setupDapp(contract, dappOwner, dappServiceOrigin, registry);
        const {dataSetHash} = await setupProvider(contract, provider, providerServiceOrigin, providerFee);
        const dappUser = await getRandomSigner(Alice, "1 UNIT");
        const dappUserSigner = contract.connect(dappUser.address);
        const dappUserSolutionHash = blake2AsU8a("captcha solution JSON");
        await dappUserSigner.tx.dappUserCommit(contractAccount.address, dataSetHash, dappUserSolutionHash);
        const providerSigner = contract.connect(provider.address);
        await providerSigner.tx.providerApprove(dappUserSolutionHash);
        let result = await dappUserSigner.query.dappOperatorIsHumanUser(dappUser.address, 50);
        expect(result.output).to.equal(true);

    })

});

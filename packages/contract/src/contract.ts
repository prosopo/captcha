import {Environment} from './env'
import Contract from "@redspot/patract/contract"

const {decodeAddress, encodeAddress} = require('@polkadot/keyring');
const {hexToU8a, isHex} = require('@polkadot/util');

const {blake2AsU8a} = require('@polkadot/util-crypto');

//TODO bind network and api
export async function getContract(network, patract, deployerAddress): Promise<Contract> {
    await network.api.isReady;
    const contractFactory = await patract.getContractFactory("prosopo", deployerAddress);
    const balance = await network.api.query.system.account(deployerAddress);
    console.log("Deployer Balance: ", balance.data.free.toHuman());
    const contract = await contractFactory.deployed("default", deployerAddress, {
        gasLimit: "400000000000",
        value: "1000000000000 UNIT",
        salt: '0x01'
    });

    return contract

}

export function encodeStringAddress(address: string) {
    try {
        let encoded = encodeAddress(
            isHex(address)
                ? hexToU8a(address)
                : decodeAddress(address)
        );

        return encoded;
    } catch (error) {
        console.log("Failed to encode invalid address: ", address);
        return null;
    }
};


export class contractApiInterface {

    env: Environment

    constructor(env) {
        this.env = env;
    }

    // provider_register
    async providerRegister(providerServiceOrigin: string, providerFee: number, payee: string, address: string) {

        await this.env.isReady();
        let providerSigner = this.env.providerSigner;
        let success = false;
        let encodedAddress = encodeStringAddress(address);
        console.log("Provider Signer address: ", this.env.providerSigner!.address);
        if (providerSigner !== undefined && this.env.contract && encodedAddress) {
            const signedContract = this.env.contract.connect(providerSigner)
            let providerServiceOriginHash = blake2AsU8a(providerServiceOrigin);
            const response = await signedContract.tx.providerRegister(providerServiceOriginHash, providerFee, payee, encodedAddress);
            success = response.result.events.filter(x => x["name"] == "ProviderRegister").length > 0;
            console.log(response.result.events);
            return success
        } else {
            throw("unable to register provider: ProviderSigner, Contract and address must be defined")
        }
        return success

    }

    //provider_update
    async providerUpdate(providerServiceOrigin: string, providerFee: number, payee: string, address: string) {

        await this.env.isReady();
        let providerSigner = this.env.providerSigner;
        let success = false;
        let encodedAddress = encodeStringAddress(address);
        console.log("Provider Signer address: ", this.env.providerSigner!.address);
        if (providerSigner !== undefined && this.env.contract && encodedAddress) {
            const signedContract = this.env.contract.connect(providerSigner)
            let providerServiceOriginHash = blake2AsU8a(providerServiceOrigin);
            const response = await signedContract.tx.providerUpdate(providerServiceOriginHash, providerFee, payee, encodedAddress);
            success = response.result.events.filter(x => x["name"] == "ProviderUpdate").length > 0;
            console.log(JSON.stringify(response));
            return success
        } else {
            throw("unable to update provider: ProviderSigner, Contract and address must be defined")
        }
        return success
    }

    //provider_deregister
    async providerDeregister() {
    }

    //provider_stake
    async providerStake() {
    }

    //provider_unstake
    async providerUnstake() {
    }

    //provider_add_data_set
    async providerAddDataSet() {
    }

    //dapp_register
    async dappRegister() {
    }

    //dapp_update
    async dappUpdate() {
    }

    //dapp_fund
    async dappFund() {
    }

    //dapp_cancel
    async dappCancel() {
    }

    //dapp_deregister
    async dappDeregister() {
    }

    //dapp_user_commit
    async dappUserCommit() {
    }

    //provider_approve
    async providerApprove() {
    }

    //provider_disapprove
    async providerDisapprove() {
    }

    //dapp_operator_is_human_user
    async dappOperatorIsHumanUser() {
    }

    //dapp_operator_check_recent_solution
    async dappOperatorCheckRecentSolution() {
    }

    //add_prosopo_operator
    async addProsopoOperator() {
    }

    //captcha_solution_commitment
    async captchaSolutionCommitment() {
    }
}
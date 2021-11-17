import {Environment} from './env'
import {ERRORS} from './errors'

const {decodeAddress, encodeAddress} = require('@polkadot/keyring');
const {hexToU8a, isHex} = require('@polkadot/util');
const {blake2AsU8a} = require('@polkadot/util-crypto');

export function encodeStringAddress(address: string) {
    try {
        let encoded = encodeAddress(
            isHex(address)
                ? hexToU8a(address)
                : decodeAddress(address)
        );

        return encoded;
    } catch (error) {
        throw(`Failed to encode invalid address: ${address}`);
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
        let encodedAddress = encodeStringAddress(address);
        const signedContract = this.env.contract!.connect(this.env.providerSigner!)
        let providerServiceOriginHash = blake2AsU8a(providerServiceOrigin);
        const response = await signedContract.tx.providerRegister(providerServiceOriginHash, providerFee, payee, encodedAddress);
        // @ts-ignore
        if (response.events) {
            return response.events.filter(x => x["name"] == "ProviderRegister")
        } else {
            throw(ERRORS.TRANSACTION.TX_ERROR)
        }
    }

    //provider_update
    async providerUpdate(providerServiceOrigin: string, providerFee: number, payee: string, address: string) {
        await this.env.isReady();
        let encodedAddress = encodeStringAddress(address);
        const signedContract = this.env.contract!.connect(this.env.providerSigner!)
        let providerServiceOriginHash = blake2AsU8a(providerServiceOrigin);
        const response = await signedContract.tx.providerUpdate(providerServiceOriginHash, providerFee, payee, encodedAddress);
        // @ts-ignore
        if (response.events) {
            return response.events.filter(x => x["name"] == "ProviderUpdate")
        } else {
            throw(ERRORS.TRANSACTION.TX_ERROR)
        }
    }

    //provider_deregister
    async providerDeregister(address: string) {
        await this.env.isReady();
        let encodedAddress = encodeStringAddress(address);
        const signedContract = this.env.contract!.connect(this.env.providerSigner!)
        const response = await signedContract.tx.providerDeregister(encodedAddress);
        // @ts-ignore
        if (response.events) {
            return response.events.filter(x => x["name"] == "ProviderDeregister")
        } else {
            throw(ERRORS.TRANSACTION.TX_ERROR)
        }
    }

    //provider_stake
    async providerStake(address: string, value: number) {
        await this.env.isReady();
        let encodedAddress = encodeStringAddress(address);
        const signedContract = this.env.contract!.connect(this.env.providerSigner!)
        const response = await signedContract.tx.providerStake({"value": value, "signer": this.env.providerSigner!})
        // @ts-ignore
        if (response.events) {
            return response.events.filter(x => x["name"] == "ProviderStake")
        } else {
            throw(ERRORS.TRANSACTION.TX_ERROR)
        }
    }

    //provider_unstake
    async providerUnstake(address, value) {
        await this.env.isReady();
        let encodedAddress = encodeStringAddress(address);
        const signedContract = this.env.contract!.connect(this.env.providerSigner!)
        const response = await signedContract.tx.providerUnstake({"value": value, "signer": this.env.providerSigner!})
        // @ts-ignore
        if (response.events) {
            return response.events.filter(x => x["name"] == "ProviderUnstake")
        } else {
            throw(ERRORS.TRANSACTION.TX_ERROR)
        }
    }

    //provider_add_data_set
    async providerAddDataSet(address, dataSetHash) {
        await this.env.isReady();
        let encodedAddress = encodeStringAddress(address);
        const signedContract = this.env.contract!.connect(this.env.providerSigner!)
        const response = await signedContract.tx.providerAddDataSet(dataSetHash, {"signer": this.env.providerSigner})
        // @ts-ignore
        if (response.events) {
            return response.events.filter(x => x["name"] == "ProviderAddDataSet")
        } else {
            throw(ERRORS.TRANSACTION.TX_ERROR)
        }
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
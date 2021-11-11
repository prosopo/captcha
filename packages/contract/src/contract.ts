import {Environment} from './env'
import Keyring from '@polkadot/keyring';
import { AccountSigner } from 'redspot/provider'
import Contract from "@redspot/patract/contract"
const {blake2AsU8a} = require('@polkadot/util-crypto');

//TODO bind network and api
export async function getContract(network, patract, deployerAddress): Promise<Contract> {
    await network.api.isReady;
    const contractFactory = await patract.getContractFactory("prosopo", deployerAddress);
    const balance = await network.api.query.system.account(deployerAddress);
    console.log("Deployer Balance: ", balance.toHuman());
    const contract = await contractFactory.deployed("default", deployerAddress, {
        gasLimit: "400000000000",
        value: "1000000000000 UNIT",
        salt: '0x01'
    });

    return contract

}


export class contractApiInterface {

    env: Environment

    constructor(env) {
        this.env = env;
    }

    // provider_register
    async providerRegister(providerServiceOrigin: string, providerFee: number, payee: string, address: string) {

        await this.env.isReady();
        let providerSigner = this.env.providerSigner;
        if (providerSigner !== undefined && this.env.contract) {
            const signedContract = this.env.contract.connect(providerSigner)
            let providerServiceOriginHash = blake2AsU8a(providerServiceOrigin);
            let addressHash = blake2AsU8a(address);
            const result = await signedContract.tx.providerRegister(providerServiceOriginHash, providerFee, payee, addressHash);
            console.log(result.result.status.isFinalized , result.result.status.isInBlock)
            console.log(JSON.stringify(result.result.events));
        } else {
            // TODO make this function available to operators
            throw("unable to register provider: ProviderSigner and /  or Contract are undefined")
        }
        return

    }

    //provider_update
    async providerUpdate() {
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
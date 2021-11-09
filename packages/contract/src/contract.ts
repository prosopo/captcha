import {Environment} from './env'

//TODO bind network and api
export async function getContract(network, patract, deployerAddress) {
    await network.api.isReady;
    const contractFactory = await patract.getContractFactory("prosopo", deployerAddress);
    const balance = await network.api.query.system.account(deployerAddress);
    console.log("Deployer Balance: ", balance.toHuman());
    // The `deploy` method will attempt to deploy a new contract.
    // The `deployed` method will first find out if the same contract already exists based on the parameters.
    // If the contract exists, it will be returned, otherwise a new contract will be created.
    // const contract = await contractFactory.deploy("default", deployer.address);

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
        let contract = await this.env.contract;
        const signer = contract.connect(address)
        await signer.tx.providerRegister(providerServiceOrigin, providerFee, payee, address);
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
//Tasks that are shared by the API and CLI. Tasks will be database only, blockchain only, and a mixture
import {loadJSONFile} from "../util";
import {addHashesToDataset, parseCaptchaDataset} from "../captcha";
import {hexToU8a} from "@polkadot/util";
import {contractApiInterface} from "../types/contract";
import {prosopoContractApi} from "../contract";
import {Database} from "../types";
import {ERRORS} from "../errors";
import {CaptchaMerkleTree} from "../merkle";
import {CaptchaWithProof} from "../types/api";

export class Tasks {

    contractApi: contractApiInterface
    db: Database

    constructor(env) {
        this.contractApi = new prosopoContractApi(env);
        this.db = env.db
    }

    // Contract tasks

    // TODO These functions could all be constructed automatically from the contract ABI
    async providerRegister(serviceOrigin: string, fee: number, payee: string, address: string): Promise<Object> {
        return await this.contractApi.contractTx('providerRegister', [serviceOrigin, fee, payee, address]);
    }

    async providerUpdate(serviceOrigin: string, fee: number, payee: string, address: string): Promise<Object> {
        return await this.contractApi.contractTx('providerUpdate', [serviceOrigin, fee, payee, address]);
    }

    async providerDeregister(address: string): Promise<Object> {
        return await this.contractApi.contractTx('providerDeregister', [address]);
    }

    async providerStake(value: number): Promise<Object> {
        return await this.contractApi.contractTx('providerStake', [], value);
    }

    async providerUnstake(value: number): Promise<Object> {
        return await this.contractApi.contractTx('providerUnstake', [], value);
    }

    async providerAddDataset(file: string): Promise<Object> {
        let dataset = parseCaptchaDataset(loadJSONFile(file));
        let tree = new CaptchaMerkleTree();
        await tree.build(dataset['captchas']);
        let dataset_hashes = addHashesToDataset(dataset, tree);
        dataset_hashes['datasetId'] = tree.root?.hash;
        dataset_hashes['tree'] = tree.layers;
        console.log(dataset_hashes);
        await this.db?.loadDataset(dataset_hashes);
        return await this.contractApi.contractTx('providerAddDataset', [hexToU8a(tree.root?.hash)])
    }

    async dappRegister(dappServiceOrigin: string, dappContractAddress: string, dappOwner?: string | undefined): Promise<Object> {
        return await this.contractApi.contractTx('dappRegister', [dappServiceOrigin, dappContractAddress, dappOwner]);
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

    // Other tasks

    /**
     * @description Get captchas that are solved or not solved, along with the merkle proof for each
     * @param {string}   datasetId  the id of the data set
     * @param {boolean}  solved    `true` when captcha is solved
     * @param {number}   size       the number of records to be returned
     */
    async getCaptchaWithProof(datasetId: string, solved: boolean, size: number): Promise<CaptchaWithProof[]> {

        // TODO check that dataset is attached to a Provider before responding ???!!!
        //  Otherwise Providers could store any random data and have Dapp Users request it. Is there any advantage to
        //  this?

        const captchaDocs = await this.db.getCaptcha(solved, datasetId, size);
        if (captchaDocs) {
            let captchas: CaptchaWithProof[] = [];
            for (let captcha of captchaDocs) {
                let captcha = captchaDocs[0];
                const datasetDetails = await this.db.getDatasetDetails(datasetId);
                const tree = new CaptchaMerkleTree();
                tree.layers = datasetDetails['tree'];
                let proof = tree.proof(captcha.captchaId!);
                // cannot pass solution to dapp user as they are required to solve the captcha!
                delete captcha.solution;
                captchas.push({captcha: captcha, proof: proof});
            }
            return captchas
        } else {
            throw Error(ERRORS.DATABASE.CAPTCHA_GET_FAILED.message);
        }
    }
}

// async getProviderAccounts() {
//     return await this.contractApi.getStorage("")
// }
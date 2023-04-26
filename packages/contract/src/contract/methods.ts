import { CaptchaSolutionCommitment } from '@prosopo/datasets'
import { TransactionResponse } from '../types/index'
import { ProsopoContractApi } from './interface'

export interface ProsopoRandomProviderResponse {
    providerId: string
    blockNumber: string
    provider: ProposoProvider
}

export interface ProposoProvider {
    balance: string
    datasetId: string
    datasetIdContent: string
    fee: string
    payee: string
    serviceOrigin: string
    status: string
}

export type ProsopoDappOperatorIsHumanUserResponse = boolean

export class ProsopoContractMethods extends ProsopoContractApi {
    public async getRandomProvider(userAccount: string, dappAccount: string): Promise<ProsopoRandomProviderResponse> {
        console.log('userAccount', userAccount)
        console.log('dappAccount', dappAccount)
        return (await this.contractQuery('getRandomActiveProvider', [
            userAccount,
            dappAccount,
        ])) as unknown as ProsopoRandomProviderResponse
    }

    public async getCaptchaSolutionCommitment(commitmentId: string) {
        return (await this.contractQuery('getCaptchaSolutionCommitment', [
            commitmentId,
        ])) as unknown as CaptchaSolutionCommitment
    }

    public async dappUserCommit(
        dappAccount: string,
        captchaDatasetId: string,
        userMerkleTreeRoot: string,
        providerAddress: string
    ): Promise<TransactionResponse> {
        return await this.contractTx('dappUserCommit', [
            dappAccount,
            captchaDatasetId,
            userMerkleTreeRoot,
            providerAddress,
        ])
    }

    public async dappOperatorIsHumanUser(
        userAccount: string,
        solutionThreshold: number
    ): Promise<ProsopoDappOperatorIsHumanUserResponse> {
        const response = await this.contractQuery('dappOperatorIsHumanUser', [userAccount, solutionThreshold])
        console.log('ProsopoDappOperatorIsHumanUserResponse', response)
        return response as ProsopoDappOperatorIsHumanUserResponse
    }
}

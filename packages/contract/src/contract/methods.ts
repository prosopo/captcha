import { BigNumber, TransactionResponse } from '../types/index'
import { ProsopoContractApi } from './interface'
import {
    CaptchaData,
    CaptchaSolutionCommitment,
    Dapp,
    LastCorrectCaptcha,
    Payee,
    Provider,
    Providers,
    RandomProvider,
} from '../interfaces/index'
import { hexToU8a } from '@polkadot/util'
import { AnyJson } from '@polkadot/types/types/codec'
import { buildDecodeVector } from '../codec/index'
import { Bool, u128 } from '@polkadot/types-codec'
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

export class ProsopoContractMethods extends ProsopoContractApi {
    // transactions

    public async providerRegister(
        serviceOrigin: string,
        fee: number,
        payee: Payee,
        address: string
    ): Promise<TransactionResponse> {
        return await this.contractTx('providerRegister', [serviceOrigin, fee, payee, address])
    }

    async providerUpdate(
        serviceOrigin: string,
        fee: number,
        payee: Payee,
        address: string,
        value?: BigNumber
    ): Promise<TransactionResponse> {
        return await this.contractTx('providerUpdate', [serviceOrigin, fee, payee, address], value)
    }

    public async providerDeregister(address: string): Promise<TransactionResponse> {
        return await this.contractTx('providerDeregister', [address])
    }

    public async providerUnstake(value: number): Promise<TransactionResponse> {
        return await this.contractTx('providerUnstake', [], value)
    }

    public async providerAddDataset(datasetId: string, datasetContentId: string): Promise<TransactionResponse> {
        return await this.contractTx('providerAddDataset', [hexToU8a(datasetId), hexToU8a(datasetContentId)])
    }

    public async dappRegister(
        dappServiceOrigin: string,
        dappContractAddress: string,
        dappOwner?: string
    ): Promise<TransactionResponse> {
        return await this.contractTx('dappRegister', [dappServiceOrigin, dappContractAddress, dappOwner])
    }

    public async dappFund(contractAccount: string, value: BigNumber): Promise<TransactionResponse> {
        return await this.contractTx('dappFund', [contractAccount], value)
    }

    public async dappCancel(contractAccount: string): Promise<TransactionResponse> {
        return await this.contractTx('dappCancel', [contractAccount])
    }

    public async dappUserCommit(
        contractAccount: string,
        captchaDatasetId: string,
        userMerkleTreeRoot: string,
        providerAddress: string
    ): Promise<TransactionResponse> {
        return await this.contractTx('dappUserCommit', [
            contractAccount,
            captchaDatasetId,
            userMerkleTreeRoot,
            providerAddress,
        ])
    }

    public async providerApprove(captchaSolutionCommitmentId, refundFee): Promise<TransactionResponse> {
        return await this.contractTx('providerApprove', [captchaSolutionCommitmentId, refundFee])
    }

    public async providerDisapprove(captchaSolutionCommitmentId): Promise<TransactionResponse> {
        return await this.contractTx('providerDisapprove', [captchaSolutionCommitmentId])
    }

    public async getDappOperatorIsHumanUser(userAccount: string, solutionThreshold: number): Promise<Bool> {
        const result = await this.contractQuery('dappOperatorIsHumanUser', [userAccount, solutionThreshold])
        return result.data.registry.createType('Bool', result.data)
    }

    //queries

    public async getRandomProvider(
        userAccount: string,
        dappContractAccount: string,
        at?: string | Uint8Array
    ): Promise<RandomProvider> {
        const result = await this.contractQuery('getRandomActiveProvider', [userAccount, dappContractAccount], at)
        return result.data.registry.createType('RandomProvider', result.data)
    }

    public async getProviderDetails(accountId: string): Promise<Provider> {
        const result = await this.contractQuery('getProviderDetails', [accountId])
        return result.data.registry.createType('Provider', result.data)
    }

    public async getDappDetails(accountId: string): Promise<Dapp> {
        const result = await this.contractQuery('getDappDetails', [accountId])
        return result.data.registry.createType('Dapp', result.data)
    }

    public async getCaptchaData(captchaDatasetId: string): Promise<CaptchaData> {
        const result = await this.contractQuery('getCaptchaData', [captchaDatasetId])
        return result.data.registry.createType('CaptchaData', result.data)
    }

    public async getCaptchaSolutionCommitment(solutionId: string): Promise<CaptchaSolutionCommitment> {
        const result = await this.contractQuery('getCaptchaSolutionCommitment', [solutionId])
        return result.data.registry.createType('CaptchaSolutionCommitment', result.data)
    }

    public async getDappOperatorLastCorrectCaptcha(accountId: string): Promise<LastCorrectCaptcha> {
        const result = await this.contractQuery('dappOperatorLastCorrectCaptcha', [accountId])
        return result.data.registry.createType('LastCorrectCaptcha', result.data)
    }

    public async getProviderStakeDefault(): Promise<u128> {
        const result = await this.contractQuery('getProviderStakeDefault', [])
        return result.data.registry.createType('u128', result.data)
    }

    public async getProviderAccounts(): Promise<Providers> {
        const result = await this.contractQuery('getAllProviderIds', [])
        return result.data.registry.createType('Providers', result.data)
    }

    public async getDappAccounts(): Promise<AnyJson> {
        const decodeFn = buildDecodeVector('DappAccounts')
        return await this.getStorage('dapp_accounts', decodeFn)
    }
}

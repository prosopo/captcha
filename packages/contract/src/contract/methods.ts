import { BigNumber, TransactionResponse } from '../types/index'
import { ProsopoContractApi } from './interface'
import {
    CaptchaData,
    DappAccounts,
    ProsopoCaptchaSolutionCommitment,
    ProsopoDapp,
    ProsopoLastCorrectCaptcha,
    ProsopoPayee,
    ProsopoProvider,
    ProsopoRandomProvider,
} from '../interfaces/index'
import { hexToU8a } from '@polkadot/util'
import { Vec, u128 } from '@polkadot/types-codec'
import { ProsopoContractError } from '../handlers'
import { ContractExecResultOk } from '@polkadot/types/interfaces/contracts'
import { DefinitionKeys } from '../interfaces/definitions'
import { AccountId } from '@polkadot/types/interfaces'

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
        payee: ProsopoPayee,
        address: string
    ): Promise<TransactionResponse> {
        return await this.contractTx('providerRegister', [serviceOrigin, fee, payee, address])
    }

    async providerUpdate(
        serviceOrigin: string,
        fee: number,
        payee: ProsopoPayee,
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

    //queries

    private unwrapContractResultOrThrow<T>(result: ContractExecResultOk, type: DefinitionKeys): T {
        const decoded = this.contract.api.registry.createType(`Result<${type}, ProsopoError>`, result.data.toU8a(true))
        if (decoded.isOk) {
            return decoded.asOk.toPrimitive() as T
        } else {
            throw new ProsopoContractError(decoded.asErr.toString())
        }
    }

    public async getDappOperatorIsHumanUser(userAccount: string, solutionThreshold: number): Promise<boolean> {
        const result = await this.contractQuery('dappOperatorIsHumanUser', [userAccount, solutionThreshold])
        return this.contract.api.registry.createType('bool', result.data.toU8a(true)).isTrue
    }

    public async getRandomProvider(
        userAccount: string,
        dappContractAccount: string,
        at?: string | Uint8Array
    ): Promise<ProsopoRandomProvider> {
        const result = await this.contractQuery('getRandomActiveProvider', [userAccount, dappContractAccount], at)
        return this.unwrapContractResultOrThrow<ProsopoRandomProvider>(result, 'ProsopoRandomProvider')
    }

    public async getProviderDetails(accountId: string): Promise<ProsopoProvider> {
        const result = await this.contractQuery('getProviderDetails', [accountId])
        return this.unwrapContractResultOrThrow<ProsopoProvider>(result, 'ProsopoProvider')
    }

    public async getDappDetails(accountId: string): Promise<ProsopoDapp> {
        const result = await this.contractQuery('getDappDetails', [accountId])
        return this.unwrapContractResultOrThrow<ProsopoDapp>(result, 'ProsopoDapp')
    }

    public async getCaptchaData(captchaDatasetId: string): Promise<CaptchaData> {
        const result = await this.contractQuery('getCaptchaData', [captchaDatasetId])
        return this.unwrapContractResultOrThrow<CaptchaData>(result, 'CaptchaData')
    }

    public async getCaptchaSolutionCommitment(solutionId: string): Promise<ProsopoCaptchaSolutionCommitment> {
        const result = await this.contractQuery('getCaptchaSolutionCommitment', [solutionId])

        return this.unwrapContractResultOrThrow<ProsopoCaptchaSolutionCommitment>(
            result,
            'ProsopoCaptchaSolutionCommitment'
        )
    }

    public async getDappOperatorLastCorrectCaptcha(accountId: string): Promise<ProsopoLastCorrectCaptcha> {
        const result = await this.contractQuery('dappOperatorLastCorrectCaptcha', [accountId])
        return this.unwrapContractResultOrThrow<ProsopoLastCorrectCaptcha>(result, 'ProsopoLastCorrectCaptcha')
    }

    public async getProviderStakeDefault(): Promise<u128> {
        const result = await this.contractQuery('getProviderStakeDefault', [])
        return result.data.registry.createType('u128', result.data)
    }

    public async getProviderAccounts(): Promise<Vec<AccountId>> {
        const result = await this.contractQuery('getAllProviderIds', [])
        return result.data.registry.createType('Vec<AccountId>', result.data)
    }

    public async getDappAccounts(): Promise<DappAccounts> {
        return await this.getStorage<DappAccounts>('dapp_accounts', 'DappAccounts')
    }
}

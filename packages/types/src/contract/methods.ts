import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { AccountId, Balance } from '@polkadot/types/interfaces'
import {
    CaptchaData,
    DappAccounts,
    ProsopoCaptchaSolutionCommitment,
    ProsopoCaptchaStatus,
    ProsopoDapp,
    ProsopoLastCorrectCaptcha,
    ProsopoPayee,
    ProsopoProvider,
    ProsopoRandomProvider,
} from './typegen'
import { BN } from '@polkadot/util'
import { Vec, u128 } from '@polkadot/types-codec'
import { IProsopoContractApi } from './interface'

// Protocol contract functions
export interface IProsopoContractMethods extends IProsopoContractApi {
    providerRegister(
        serviceOrigin: string,
        fee: number | Balance,
        payee: ProsopoPayee
    ): Promise<ContractSubmittableResult>
    providerUpdate(
        serviceOrigin: string,
        fee: number | Balance,
        payee: ProsopoPayee,
        value?: number | BN | Balance | undefined
    ): Promise<ContractSubmittableResult>
    providerDeregister(address: string): Promise<ContractSubmittableResult>
    providerUnstake(value: number | BN | undefined): Promise<ContractSubmittableResult>
    providerAddDataset(datasetId: string, datasetContentId: string): Promise<ContractSubmittableResult>
    dappRegister(dappContractAddress: string, dappPayee: string): Promise<ContractSubmittableResult>
    dappFund(contractAccount: string, value?: number | BN | undefined): Promise<ContractSubmittableResult>
    dappCancel(contractAccount: string): Promise<ContractSubmittableResult>
    dappUserCommit(
        contractAccount: string,
        captchaDatasetId: string,
        userMerkleTreeRoot: string,
        providerAddress: string,
        dappUserAddress: string,
        status?: ProsopoCaptchaStatus
    ): Promise<ContractSubmittableResult>
    providerApprove(captchaSolutionCommitmentId, refundFee): Promise<ContractSubmittableResult>
    providerDisapprove(captchaSolutionCommitmentId): Promise<ContractSubmittableResult>
    getDappOperatorIsHumanUser(userAccount: string, solutionThreshold: number): Promise<boolean>
    getRandomProvider(
        userAccount: string,
        dappContractAccount: string,
        at?: string | Uint8Array
    ): Promise<ProsopoRandomProvider>
    getProviderDetails(accountId: string): Promise<ProsopoProvider>
    getDappDetails(accountId: string): Promise<ProsopoDapp>
    getCaptchaData(captchaDatasetId: string): Promise<CaptchaData>
    getCaptchaSolutionCommitment(solutionId: string): Promise<ProsopoCaptchaSolutionCommitment>
    getDappOperatorLastCorrectCaptcha(accountId: string): Promise<ProsopoLastCorrectCaptcha>
    getProviderStakeDefault(): Promise<u128>
    getDappStakeDefault(): Promise<u128>
    getProviderAccounts(): Promise<Vec<AccountId>>
    getDappAccounts(): Promise<DappAccounts>
}

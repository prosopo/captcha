import { Collection } from 'mongodb'
import { Hash } from '@polkadot/types/interfaces'
import { Captcha, CaptchaSolution, Dataset } from './captcha'
import { PendingCaptchaRequest } from './api'
import { WithId } from 'mongodb/mongodb.ts34'
// Other table types from other database engines go here
export type Table = Collection | undefined

export interface Tables {
    [key: string]: Table
}

export interface DatasetRecord extends WithId<Document> {
    datasetId: string,
    format: string,
    tree: string[][]
}

export interface PendingCaptchaRequestRecord extends WithId<Document> {
    accountId: string,
    pending: boolean,
    salt: string
}

export interface Database {
    readonly url: string;
    tables: Tables
    dbname: string;

    connect(): Promise<void>;

    storeDataset(dataset: Dataset): Promise<void>;

    getRandomCaptcha(solved: boolean, datasetId: Hash | string | Uint8Array, size?: number): Promise<Captcha[] | undefined>;

    getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined>;

    updateCaptcha(captcha: Captcha, datasetId: string): Promise<void>;

    getDatasetDetails (datasetId: Hash | string | Uint8Array): Promise<DatasetRecord>;

    storeDappUserSolution(captchas: CaptchaSolution[], treeRoot: string): Promise<void>;

    storeDappUserPending(userAccount: string, requestHash: string, salt: string): Promise<void>;

    getDappUserPending(requestHash: string): Promise<PendingCaptchaRequest>

    updateDappUserPendingStatus(userAccount: string, requestHash: string, approve: boolean): Promise<void>;

}

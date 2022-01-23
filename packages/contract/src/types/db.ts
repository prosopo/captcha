import {Collection} from "mongodb";
import {Captcha, CaptchaSolution, Dataset} from "./captcha";
import {Hash} from "@polkadot/types/interfaces";

export interface Database {
    readonly url: string;
    tables: Tables
    dbname: string;

    connect(): Promise<void>;

    storeDataset(dataset: Dataset): Promise<void>;

    getRandomCaptcha(solved: boolean, datasetId: Hash | string | Uint8Array, size?: number): Promise<Captcha[] | undefined>;

    getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined>;

    updateCaptcha(captcha: Captcha, datasetId: string): Promise<void>;

    getDatasetDetails(datasetId: Hash | string | Uint8Array): Promise<any>;

    storeDappUserSolution(captchas: CaptchaSolution[], treeRoot: string): Promise<void>;

    storeDappUserPending(userAccount: string, requestHash: string, salt: string): Promise<void>;

    getDappUserPending(requestHash: string): Promise<any>

    updateDappUserPendingStatus(userAccount: string, requestHash: string, approve: boolean): Promise<void>;

}

// Other table types from other database engines go here
export type Table = Collection | undefined

export interface Tables {
    [key: string]: Table
}
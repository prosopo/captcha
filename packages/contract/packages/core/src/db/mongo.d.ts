import { Hash } from '@polkadot/types/interfaces';
import { Database, DatasetRecord, PendingCaptchaRequestRecord, Tables, Captcha, CaptchaSolution, DatasetWithIdsAndTree } from '../types';
/**
 * Returns the Database object through which Providers can put and get captchas
 * @param {string} url          The database endpoint
 * @param {string} dbname       The database name
 * @return {ProsopoDatabase}    Database layer
 */
export declare class ProsopoDatabase implements Database {
    readonly url: string;
    tables: Tables;
    dbname: string;
    constructor(url: any, dbname: any);
    /**
     * @description Connect to the database and set the dataset and captcha tables
     */
    connect(): Promise<void>;
    /**
     * @description Load a dataset to the database
     * @param {Dataset}  dataset
     */
    storeDataset(dataset: DatasetWithIdsAndTree): Promise<void>;
    /**
     * @description Get random captchas that are solved or not solved
     * @param {boolean}  solved    `true` when captcha is solved
     * @param {string}   datasetId  the id of the data set
     * @param {number}   size       the number of records to be returned
     */
    getRandomCaptcha(solved: boolean, datasetId: Hash | string | Uint8Array, size?: number): Promise<Captcha[] | undefined>;
    /**
     * @description Get captchas by id
     * @param {string[]} captchaId
     */
    getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined>;
    /**
     * @description Update a captcha solution
     * @param {Captcha}  captcha
     * @param {string}   datasetId  the id of the data set
     */
    updateCaptcha(captcha: Captcha, datasetId: Hash | string | Uint8Array): Promise<void>;
    /**
     * @description Get a captcha that is solved or not solved
     */
    getDatasetDetails(datasetId: Hash | string): Promise<DatasetRecord>;
    /**
     * @description Store a Dapp User's captcha solution
     */
    storeDappUserSolution(captchas: CaptchaSolution[], treeRoot: string): Promise<void>;
    /**
     * @description Store a Dapp User's pending record
     */
    storeDappUserPending(userAccount: string, requestHash: string, salt: string): Promise<void>;
    /**
     * @description Get a Dapp user's pending record
     */
    getDappUserPending(requestHash: string): Promise<PendingCaptchaRequestRecord>;
    /**
     * @description Update a Dapp User's pending record
     */
    updateDappUserPendingStatus(userAccount: string, requestHash: string, approve: boolean): Promise<void>;
}

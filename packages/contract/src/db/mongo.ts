import {
    Collection,
    Db,
    MongoClient, ObjectId, WithId,
} from "mongodb";
import {Database, Tables} from '../types'
import {ERRORS} from '../errors'
import {Captcha, CaptchaSolution, Dataset} from "../types/captcha";
import {Hash} from "@polkadot/types/interfaces";
import {CaptchaSolutionResponse} from "../types/api";

//mongodb://username:password@127.0.0.1:27017
const DEFAULT_ENDPOINT = "mongodb://127.0.0.1:27017"

/**
 * Returns the Database object through which Providers can put and get captchas
 * @param {string} url          The database endpoint
 * @param {string} dbname       The database name
 * @return {ProsopoDatabase}    Database layer
 */
export class ProsopoDatabase implements Database {
    readonly url: string;
    tables: Tables
    dbname: string


    constructor(url, dbname) {
        this.url = url || DEFAULT_ENDPOINT;
        this.tables = {};
        this.dbname = dbname;
    }

    /**
     * @description Connect to the database and set the dataset and captcha tables
     */
    async connect() {
        const client: MongoClient = new MongoClient(this.url);
        await client.connect();
        const db: Db = client.db(this.dbname);
        this.tables.dataset = db.collection("dataset");
        this.tables.captchas = db.collection("captchas");
        this.tables.solutions = db.collection("solutions");
        this.tables.responses = db.collection("responses");
    }

    /**
     * @description Load a dataset to the database
     * @param {Dataset}  dataset
     */
    async storeDataset(dataset: Dataset): Promise<void> {
        if (dataset.datasetId) {
            const datasetDoc = {
                datasetId: dataset.datasetId,
                format: dataset.format,
                tree: dataset.tree
            }
            //const datasetId = new ObjectId(dataset.datasetId)
            // @ts-ignore
            this.tables.dataset?.updateOne({_id: dataset.datasetId}, {$set: datasetDoc}, {upsert: true})
            // put the dataset id on each of the captcha docs
            const captchaDocs = dataset.captchas.map((captcha, index) => ({
                ...captcha,
                datasetId: dataset.datasetId,
                index: index
            }));


            // create a bulk upsert operation and execute
            // @ts-ignore
            await this.tables.captchas?.bulkWrite(captchaDocs.map(captchaDoc =>
                ({updateOne: {filter: {_id: captchaDoc.captchaId}, update: {$set: captchaDoc}, upsert: true}})
            ))
        }
    }

    /**
     * @description Get random captchas that are solved or not solved
     * @param {boolean}  solved    `true` when captcha is solved
     * @param {string}   datasetId  the id of the data set
     * @param {number}   size       the number of records to be returned
     */
    async getRandomCaptcha(solved: boolean, datasetId: Hash | string | Uint8Array, size?: number): Promise<Captcha[] | undefined> {
        const sampleSize = size ? Math.abs(Math.trunc(size)) : 1;
        const cursor = this.tables.captchas?.aggregate([
            {$match: {datasetId: datasetId, solution: {$exists: solved}}},
            {$sample: {size: sampleSize}},
            {$project: {datasetId: 1, captchaId: 1, items: 1, target: 1}}
        ])
        const docs = await cursor?.toArray();
        if (docs) {
            // drop the _id field
            return docs.map(({_id, ...keepAttrs}) => keepAttrs) as Captcha[];
        } else {
            throw(ERRORS.DATABASE.CAPTCHA_GET_FAILED.message)
        }
    }

    /**
     * @description Get captchas by id
     * @param {string[]} captchaId
     */
    async getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined> {
        const cursor = this.tables.captchas?.find({_id: {$in: captchaId}});
        const docs = await cursor?.toArray();
        if (docs) {
            // drop the _id field
            return docs.map(({_id, ...keepAttrs}) => keepAttrs) as Captcha[];
        } else {
            throw(ERRORS.DATABASE.CAPTCHA_GET_FAILED.message)
        }
    }

    /**
     * @description Update a captcha solution
     * @param {Captcha}  captcha
     * @param {string}   datasetId  the id of the data set
     */
    async updateCaptcha(captcha: Captcha, datasetId: Hash | string | Uint8Array): Promise<void> {
        await this.tables.captchas?.updateOne(
            {datasetId: datasetId},
            {$set: captcha},
            {upsert: false}
        )
    }


    /**
     * @description Get a captcha that is solved or not solved
     */
    async getDatasetDetails(datasetId: Hash): Promise<any> {
        const doc = await this.tables.dataset?.findOne({datasetId: datasetId});
        if (doc) {
            return doc
        } else {
            throw(ERRORS.DATABASE.DATASET_GET_FAILED.message)
        }
    }

    /**
     * @description Store a Dapp User's captcha solution
     */
    async storeDappUserSolution(captchas: CaptchaSolution[], treeRoot: string) {
        // create a bulk upsert operation and execute
        // @ts-ignore
        await this.tables.solutions?.bulkWrite(captchas.map(captchaDoc =>
            ({
                updateOne: {
                    filter: {_id: captchaDoc.captchaId},
                    update: {
                        $set:
                            {
                                solution: captchaDoc.solution,
                                salt: captchaDoc.salt,
                                treeRoot: treeRoot
                            }
                    },
                    upsert: true
                }
            })
        ))
    }

    /**
     * @description Store a Dapp User's pending record
     */
    async storeDappUserPending(userAccount: string, requestHash: string, salt: string): Promise<void> {
        await this.tables.pending?.updateOne(
            {_id: requestHash},
            {$set: {accountId: userAccount, pending: true, salt: salt}},
            {upsert: true}
        )
    }

    /**
     * @description Get a Dapp user's pending record
     */
    async getDappUserPending(requestHash: string): Promise<any> {
        const doc = await this.tables.pending?.findOne({_id: requestHash});
        if (doc) {
            return doc
        } else {
            throw(ERRORS.DATABASE.PENDING_RECORD_NOT_FOUND.message)
        }
    }

    /**
     * @description Update a Dapp User's pending record
     */
    async updateDappUserPendingStatus(userAccount: string, requestHash: string, approve: boolean): Promise<void> {
        await this.tables.pending?.updateOne(
            {_id: requestHash},
            {$set: {accountId: userAccount, pending: false, approved: approve}},
            {upsert: true}
        )
    }
}



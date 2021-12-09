import {
    Collection,
    Db,
    MongoClient, ObjectId,
} from "mongodb";
import {Database} from '../types'
import {ERRORS} from '../errors'
import {Captcha, Dataset} from "../types/captcha";

const DEFAULT_ENDPOINT = "mongodb://127.0.0.1:27017"

/**
 * Returns the Database object through which Providers can put and get captchas
 * @param {string} url          The database endpoint
 * @param {string} dbname       The database name
 * @return {ProsopoDatabase}    Database layer
 */
export class ProsopoDatabase implements Database {
    readonly url: string;
    tables: { captchas?: Collection, dataset?: Collection }
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
    }

    /**
     * @description Load a dataset to the database
     * @param {Dataset}  dataset
     */
    async loadDataset(dataset: Dataset): Promise<void> {
        if (dataset.datasetId) {
            const datasetDoc = {
                datasetId: dataset.datasetId,
                format: dataset.format,
                tree: dataset.tree
            }
            const datasetId = new ObjectId(dataset.datasetId)
            await this.tables.dataset?.updateOne({_id: datasetId}, {$set: datasetDoc}, {upsert: true})
            // put the dataset id on each of the captcha docs
            const captchaDocs = dataset.captchas.map((captcha, index) => ({
                ...captcha,
                datasetId: dataset.datasetId,
                index: index
            }));


            // create a bulk upsert operation and execute
            await this.tables.captchas?.bulkWrite(captchaDocs.map(captchaDoc =>
                ({updateOne: {filter: {_id: new ObjectId(captchaDoc.captchaId)}, update: {$set: captchaDoc}, upsert: true}})
            ))
        }
    }

    /**
     * @description Get a captcha that is solved or not solved
     * @param {boolean}  solved    `true` when captcha is solved
     * @param {string}   datasetId  the id of the data set
     * @param {number}   size       the number of records to be returned
     */
    async getCaptcha(solved: boolean, datasetId: string, size?: number): Promise<Captcha[] | undefined> {
        const sampleSize = size ? Math.abs(Math.trunc(size)) : 1;
        const cursor = this.tables.captchas?.aggregate([
            {$match: {datasetId: datasetId, solution: {$exists: solved}}},
            {$sample: {size: sampleSize}}
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
     * @description Update a captcha solution
     * @param {Captcha}  captcha
     * @param {string}   datasetId  the id of the data set
     */
    async updateCaptcha(captcha: Captcha, datasetId: string): Promise<void> {
        await this.tables.captchas?.updateOne(
            {datasetId: datasetId},
            {$set: captcha},
            {upsert: false}
        )

    }


    /**
     * @description Get a captcha that is solved or not solved
     */
    async getDatasetDetails(datasetId: string) {
        const doc = await this.tables.dataset?.findOne({datasetId: datasetId});
        if (doc) {
            return doc
        } else {
            throw(ERRORS.DATABASE.DATASET_GET_FAILED.message)
        }
    }

}



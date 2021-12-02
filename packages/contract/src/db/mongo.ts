import {
    Collection,
    Db,
    MongoClient,
} from "mongodb";
import {Database} from '../types'
import {ERRORS} from '../errors'
import {Captcha, Dataset} from "../types/captcha";

const DEFAULT_ENDPOINT = "mongodb://127.0.0.1:27017"

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
     * @param {string}   hashHexString       hex string representation of the dataset hash
     */
    async loadDataset(dataset: Dataset, hashHexString: string): Promise<void> {
        try {
            const datasetDoc = {
                datasetId: dataset.datasetId,
                format: dataset.format,
                hash: hashHexString
            }
            await this.tables.dataset?.updateOne({datasetId: dataset.datasetId}, {$set: datasetDoc}, {upsert: true})
            // put the dataset id on each of the captcha docs
            const captchaDocs = dataset.captchas.map(captcha => ({...captcha, datasetId: dataset.datasetId}));

            // create a bulk upsert operation and execute
            await this.tables.captchas?.bulkWrite(captchaDocs.map(captchaDoc =>
                ({updateOne: {filter: {_id: captchaDoc.captchaId}, update: {$set: captchaDoc}, upsert: true}})
            ))

        } catch (err) {
            throw(`${ERRORS.DATABASE.DATASET_LOAD_FAILED}:${err}`)
        }
    }

    /**
     * @description Get a captcha that is solved or not solved
     * @param {boolean}  solved    `true` when captcha is solved
     * @param {string}   datasetId  the id of the data set
     */
    async getCaptcha(solved: boolean, datasetId: string): Promise<Captcha | undefined> {
        try {
            const doc = await this.tables.captchas?.aggregate([
                {$match: {datasetId: datasetId}},
                {$sample: {size: 1}}
            ])
            if (doc) {
                return doc[0] as Captcha
            }
        } catch (err) {
            throw(`${ERRORS.DATABASE.CAPTCHA_GET_FAILED}:${err}`)
        }
    }

    /**
     * @description Update a captcha solution
     * @param {Captcha}  captcha
     * @param {string}   datasetId  the id of the data set
     */
    async updateCaptcha(captcha: Captcha, datasetId: string): Promise<void> {
        try {
            await this.tables.captchas?.updateOne(
                {datasetId: datasetId},
                {$set: captcha},
                {upsert: false}
            );
        } catch (err) {
            throw(`${ERRORS.DATABASE.CAPTCHA_UPDATE_FAILED}:${err}`)
        }
    }
}



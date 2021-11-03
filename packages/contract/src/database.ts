import {MongoClient, UpdateWriteOpResult} from "mongodb";
import {Database, ContractDetails} from './database.d'

const errors = {"DATABASE_UNDEFINED": 'Database client is not connected'}



export default class ProsopoDatabase implements Database {
    readonly url: string;
    client: MongoClient;
    dbname: string

    constructor(url, dbname) {
        this.url = url || "mongodb://localhost:27017";
        this.dbname = dbname;
        this.client = new MongoClient(url);
    }

    async connect() {
        return new Promise((resolve, reject) => {
            MongoClient.connect(this.url, (err, database) => {
                if (err || database === undefined) {
                    reject(err);
                }
                this.client = database;
                resolve(this.client)
            })
        });
    }

    async getContractDetails(name: string): Promise<ContractDetails> {
        return new Promise<ContractDetails>((resolve, reject) => {
                if (this.client !== undefined) {
                    const collection = this.client.db(this.dbname).collection("contract");
                    collection.findOne({"_id": "prosopo"}, function (err, items) {
                        if (err) {
                            reject(err);
                        }
                        resolve(items);
                    })
                } else {
                    reject(errors["DATABASE_UNDEFINED"]);
                }
            }
        )
    }

    async updateContractDetails(contract, deployer, contractName) {
        // Store contract in local db
        return new Promise<UpdateWriteOpResult>((resolve, reject) => {
            if (this.client !== undefined) {
                const collection = this.client.db(this.dbname).collection("contract");
                const doc = {
                    "_id": contractName,
                    "address": contract.address.toString(),
                    "owner": deployer.address.toString()
                }
                collection.updateOne({"_id": "prosopo"}, {
                    $set: doc
                }, {upsert: true}, function (err, result) {
                    if (err) {
                        reject(err)
                    }
                    resolve(result);
                });
            } else {
                reject(errors["DATABASE_UNDEFINED"]);
            }

        })
    }
}

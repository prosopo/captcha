import {MongoClient, TypedEventEmitter, MongoClientEvents, Db, Collection, UpdateResult, ObjectId} from "mongodb";
import {ContractDetails, Database} from './types/db'
import {ERRORS} from './errors'



export class ProsopoDatabase implements Database {
    readonly url: string;
    collections: { contract?: Collection }
    dbname: string


    constructor(url, dbname) {
        this.url = url || "mongodb://localhost:27017";
        this.collections = {};
        this.dbname = dbname;
    }

    async connect() {
        const client: MongoClient = new MongoClient(this.url);
        await client.connect();
        const db: Db = client.db(this.dbname);
        this.collections.contract = db.collection("contract");
    }

    async getContractDetails(name: string): Promise<ContractDetails> {
        return new Promise<ContractDetails>((resolve, reject) => {
                if (this.collections.contract !== undefined) {
                    const collection = this.collections.contract;
                    collection.findOne({"_id": name}, function (err, items) {
                        if (err) {
                            reject(err);
                        }
                        resolve(items);
                    })
                } else {
                    reject(ERRORS.DATABASE.DATABASE_UNDEFINED);
                }
            }
        )
    }
    // TODO does this even need to be async?
    async updateContractDetails(contract, deployer, contractName) {
        // Store contract in local db
        return new Promise<UpdateResult>((resolve, reject) => {
            if (this.collections.contract !== undefined) {
                const collection = this.collections.contract;
                // TODO blockchain/parachain identifier?
                const doc = {
                    "_id": contractName,
                    "address": contract.address.toString(),
                    "owner": deployer.address.toString()
                }
                const updateResult = collection.updateOne({"_id": contractName}, {$set: doc}, function (err, result){
                    if (err) {
                        reject(err);
                    }
                    if (result) {
                        resolve(result);
                    }
                });
            } else {
                reject(ERRORS.DATABASE.DATABASE_UNDEFINED);
            }
        })
    }
}

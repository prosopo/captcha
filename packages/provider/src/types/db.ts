import {Signer} from "redspot/types";
import {MongoClient, TypedEventEmitter, MongoClientEvents, Collection, UpdateResult, ObjectId} from "mongodb";

export interface ContractDetails {
    _id: string,
    address: string,
    owner: string,
}

export interface Database {
    readonly url: string;
    collections: { contract?: Collection }
    dbname: string;

    connect(): Promise<void>;
    updateContractDetails(contract: Signer, deployer: Signer, contractName: string): Promise<UpdateResult>;
    getContractDetails(name: string): Promise<ContractDetails>;
}
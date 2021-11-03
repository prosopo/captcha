import {Signer} from "redspot/types";
import MongoClient, {UpdateWriteOpResult} from "mongodb";

interface ContractDetails {
    _id: string,
    address: string,
    owner: string,
}

interface Database {
    readonly url: string;
    client: MongoClient;
    dbname: string;

    connect(): Promise<MongoClient>;

    updateContractDetails(contract: Signer, deployer: Signer, contractName: string): Promise<UpdateWriteOpResult>;

    getContractDetails(name: string): Promise<ContractDetails>;
}
import {Collection} from "mongodb";
import {Captcha, Dataset} from "./captcha";

export interface Database {
    readonly url: string;
    tables: { captcha?: Table, dataset?: Table }
    dbname: string;

    connect(): Promise<void>;

    loadDataset(dataset: Dataset, hash: string): Promise<void>;

    getCaptcha(solved: boolean, datasetId: string): Promise<Captcha | undefined>;

    updateCaptcha(captcha: Captcha, datasetId: string): Promise<void>;

}

// Other table types from other database engines go here
export type Table = Collection | undefined
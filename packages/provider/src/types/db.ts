import {Collection} from "mongodb";
import {Captcha, Dataset} from "./captcha";

export interface Database {
    readonly url: string;
    tables: { captcha?: Table, dataset?: Table }
    dbname: string;

    connect(): Promise<void>;

    loadDataset(dataset: Dataset): Promise<void>;

    getCaptcha(solved: boolean, datasetId: string, size?: number): Promise<Captcha[] | undefined>;

    updateCaptcha(captcha: Captcha, datasetId: string): Promise<void>;

    getDatasetDetails(datasetId: string);
}

// Other table types from other database engines go here
export type Table = Collection | undefined | Object
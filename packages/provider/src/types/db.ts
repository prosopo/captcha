// Copyright 2021-2022 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Document, Collection } from 'mongodb'
import { Hash } from '@polkadot/types/interfaces'
import {
    Captcha,
    CaptchaSolution,
    CaptchaStates,
    Dataset
} from '@prosopo/datasets'
import { PendingCaptchaRequest } from './api'
import { WithId } from 'mongodb/mongodb';
import consola from "consola";
// Other table types from other database engines go here
export type Table = Collection | undefined

export interface Tables {
    [key: string]: Table
}

export interface DatasetRecord extends WithId<Document> {
    datasetId: string,
    format: string,
    contentTree: string[][]
    solutionTree: string[][]
}

export interface PendingCaptchaRequestRecord extends WithId<Document> {
    accountId: string,
    pending: boolean,
    salt: string
}

export interface Database {
    readonly url: string;
    tables: Tables
    dbname: string;
    logger: typeof consola

    connect(): Promise<void>;

    storeDataset(dataset: Dataset): Promise<void>;

    getRandomCaptcha(solved: boolean, datasetId: Hash | string, size?: number): Promise<Captcha[] | undefined>;

    getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined>;

    updateCaptcha(captcha: Captcha, datasetId: string): Promise<void>;

    getDatasetDetails (datasetId: Hash | string | Uint8Array): Promise<DatasetRecord>;

    storeDappUserSolution(captchas: CaptchaSolution[], treeRoot: string): Promise<void>;

    storeDappUserPending(userAccount: string, requestHash: string, salt: string): Promise<void>;

    getDappUserPending(requestHash: string): Promise<PendingCaptchaRequest>

    updateDappUserPendingStatus(userAccount: string, requestHash: string, approve: boolean): Promise<void>;

    getAllCaptchasByDatasetId(datasetId: string, captchaState?: CaptchaStates): Promise<Captcha[] | undefined>;

    getAllSolutions(captchaId: string): Promise<CaptchaSolution[] | undefined>;

    getDatasetIdWithSolvedCaptchasOfSizeN(solvedCaptchaCount): Promise<string>;

    getRandomSolvedCaptchasFromSingleDataset(datasetId: string, size: number): Promise<CaptchaSolution[]>;
}

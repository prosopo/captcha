// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { Document, Collection } from 'mongodb'
import { Hash } from '@polkadot/types/interfaces'
import { Captcha, CaptchaSolution, CaptchaStates, Dataset } from './captcha'
import { PendingCaptchaRequest } from './api'
import { WithId } from 'mongodb/mongodb.ts'
// Other table types from other database engines go here
export type Table = Collection | undefined

export interface Tables {
    [key: string]: Table
}

export interface DatasetRecord extends WithId<Document> {
    datasetId: string,
    format: string,
    tree: string[][]
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
}

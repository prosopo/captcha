/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
import { Db, Document, Filter, MongoClient } from 'mongodb'
import { Hash } from '@polkadot/types/interfaces'
import { isHex } from '@polkadot/util'
import { DappUserSolution, Database, DatasetRecord, PendingCaptchaRequestRecord, Tables } from '../types'
import { ProsopoEnvError } from '@prosopo/contract'
import {
    Captcha,
    CaptchaSolution,
    CaptchaStates,
    DatasetWithIdsAndTree,
    DatasetWithIdsAndTreeSchema,
} from '@prosopo/datasets'
import consola from 'consola'

// mongodb://username:password@127.0.0.1:27017
const DEFAULT_ENDPOINT = 'mongodb://127.0.0.1:27017'

/**
 * Returns the Database object through which Providers can put and get captchas
 * @param {string} url          The database endpoint
 * @param {string} dbname       The database name
 * @return {ProsopoDatabase}    Database layer
 */
export class ProsopoDatabase implements Database {
    readonly url: string

    tables: Tables

    dbname: string

    logger: typeof consola

    constructor(url, dbname, logger) {
        this.url = url || DEFAULT_ENDPOINT
        this.tables = {}
        this.dbname = dbname
        this.logger = logger
    }

    /**
     * @description Connect to the database and set the dataset and captcha tables
     */
    async connect() {
        try {
            const client: MongoClient = new MongoClient(this.url)

            await client.connect()
            const db: Db = client.db(this.dbname)

            this.tables.dataset = db.collection('dataset')
            this.tables.captchas = db.collection('captchas')
            this.tables.solutions = db.collection('solutions')
            this.tables.userSolutions = db.collection('userSolutions')
            this.tables.responses = db.collection('responses')
            this.tables.pending = db.collection('pending')
        } catch (err) {
            throw new ProsopoEnvError(err, 'DATABASE.CONNECT_ERROR', {}, this.url)
        }
    }

    /**
     * @description Load a dataset to the database
     * @param {Dataset}  dataset
     */
    async storeDataset(dataset: DatasetWithIdsAndTree): Promise<void> {
        try {
            const parsedDataset = DatasetWithIdsAndTreeSchema.parse(dataset)
            const datasetDoc = {
                datasetId: parsedDataset.datasetId,
                datasetContentId: parsedDataset.datasetContentId,
                format: parsedDataset.format,
                contentTree: parsedDataset.contentTree,
                solutionTree: parsedDataset.solutionTree,
            }

            await this.tables.dataset?.updateOne(
                { _id: parsedDataset.datasetId },
                { $set: datasetDoc },
                { upsert: true }
            )
            // put the dataset id on each of the captcha docs and remove the solution
            const captchaDocs = parsedDataset.captchas.map(({ solution, ...captcha }, index) => ({
                ...captcha,
                datasetId: parsedDataset.datasetId,
                datasetContentId: parsedDataset.datasetContentId,
                index,
                solved: !!solution?.length,
            }))

            // create a bulk upsert operation and execute
            if (captchaDocs.length) {
                // @ts-ignore
                await this.tables.captchas?.bulkWrite(
                    captchaDocs.map((captchaDoc) => ({
                        updateOne: {
                            filter: { _id: captchaDoc.captchaId },
                            update: { $set: captchaDoc },
                            upsert: true,
                        },
                    }))
                )
            }

            // insert any captcha solutions into the solutions collection
            const captchaSolutionDocs = parsedDataset.captchas
                .filter(({ solution }) => solution?.length)
                .map((captcha) => ({
                    captchaId: captcha.captchaId,
                    captchaContentId: captcha.captchaContentId,
                    solution: captcha.solution,
                    salt: captcha.salt,
                    datasetId: parsedDataset.datasetId,
                    datasetContentId: parsedDataset.datasetContentId,
                }))

            // create a bulk upsert operation and execute
            if (captchaSolutionDocs.length) {
                // @ts-ignore
                await this.tables.solutions?.bulkWrite(
                    captchaSolutionDocs.map((captchaSolutionDoc) => ({
                        updateOne: {
                            filter: { _id: captchaSolutionDoc.captchaId },
                            update: { $set: captchaSolutionDoc },
                            upsert: true,
                        },
                    }))
                )
            }
        } catch (err) {
            throw new ProsopoEnvError(err, 'DATABASE.DATASET_LOAD_FAILED')
        }
    }

    /**
     * @description Get random captchas that are solved or not solved
     * @param {boolean}  solved    `true` when captcha is solved
     * @param {string}   datasetId  the id of the data set
     * @param {number}   size       the number of records to be returned
     */
    async getRandomCaptcha(
        solved: boolean,
        datasetId: Hash | string | Uint8Array,
        size?: number
    ): Promise<Captcha[] | undefined> {
        if (!isHex(datasetId)) {
            throw new ProsopoEnvError('DATABASE.INVALID_HASH', this.getRandomCaptcha.name, {}, datasetId)
        }
        const sampleSize = size ? Math.abs(Math.trunc(size)) : 1
        const cursor = this.tables.captchas?.aggregate([
            { $match: { datasetId, solved } },
            { $sample: { size: sampleSize } },
            {
                $project: {
                    datasetId: 1,
                    datasetContentId: 1,
                    captchaId: 1,
                    captchaContentId: 1,
                    items: 1,
                    target: 1,
                },
            },
        ])
        const docs = await cursor?.toArray()

        if (docs && docs.length) {
            // drop the _id field
            return docs.map(({ _id, ...keepAttrs }) => keepAttrs) as Captcha[]
        }

        throw new ProsopoEnvError(
            'DATABASE.CAPTCHA_GET_FAILED',
            this.getRandomCaptcha.name,
            {},
            {
                solved: solved,
                datasetId: datasetId,
                size: size,
            }
        )
    }

    /**
     * @description Get captchas by id
     * @param {string[]} captchaId
     */
    async getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined> {
        const cursor = this.tables.captchas?.find({ _id: { $in: captchaId } })
        const docs = await cursor?.toArray()

        if (docs && docs.length) {
            // drop the _id field
            return docs.map(({ _id, ...keepAttrs }) => keepAttrs) as Captcha[]
        }

        throw new ProsopoEnvError('DATABASE.CAPTCHA_GET_FAILED', this.getCaptchaById.name, {}, captchaId)
    }

    /**
     * @description Update a captcha solution
     * @param {Captcha}  captcha
     * @param {string}   datasetId  the id of the data set
     */
    async updateCaptcha(captcha: Captcha, datasetId: Hash | string | Uint8Array): Promise<void> {
        if (!isHex(datasetId)) {
            throw new ProsopoEnvError('DATABASE.INVALID_HASH', this.updateCaptcha.name, {}, datasetId)
        }

        await this.tables.captchas?.updateOne({ datasetId }, { $set: captcha }, { upsert: false })
    }

    /**
     * @description Get a captcha that is solved or not solved
     */
    async getDatasetDetails(datasetId: Hash | string): Promise<DatasetRecord> {
        if (!isHex(datasetId)) {
            throw new ProsopoEnvError('DATABASE.INVALID_HASH', this.getDatasetDetails.name, {}, datasetId)
        }

        const doc = await this.tables.dataset?.findOne({ datasetId })

        if (doc) {
            return doc as DatasetRecord
        }

        throw new ProsopoEnvError('DATABASE.DATASET_GET_FAILED', this.getDatasetDetails.name, {}, datasetId)
    }

    /**
     * @description Store a Dapp User's captcha solution
     */
    async storeDappUserSolution(captchas: CaptchaSolution[], commitmentId: string) {
        if (!isHex(commitmentId)) {
            throw new ProsopoEnvError('DATABASE.INVALID_HASH', this.storeDappUserSolution.name, {}, commitmentId)
        }

        // create a bulk create operation and execute
        if (captchas.length) {
            await this.tables.userSolutions?.bulkWrite(
                captchas.map((captchaDoc) => ({
                    insertOne: {
                        document: {
                            captchaId: captchaDoc.captchaId,
                            solution: captchaDoc.solution,
                            salt: captchaDoc.salt,
                            commitmentId: commitmentId,
                            approved: false,
                            datetime: new Date().toISOString(),
                        } as DappUserSolution,
                    },
                }))
            )
        }
    }

    /**
     * @description Store a Dapp User's pending record
     */
    async storeDappUserPending(userAccount: string, requestHash: string, salt: string): Promise<void> {
        if (!isHex(requestHash)) {
            throw new ProsopoEnvError('DATABASE.INVALID_HASH', this.storeDappUserPending.name, {}, requestHash)
        }

        await this.tables.pending?.updateOne(
            { _id: requestHash },
            { $set: { accountId: userAccount, pending: true, salt } },
            { upsert: true }
        )
    }

    /**
     * @description Get a Dapp user's pending record
     */
    async getDappUserPending(requestHash: string): Promise<PendingCaptchaRequestRecord> {
        if (!isHex(requestHash)) {
            throw new ProsopoEnvError('DATABASE.INVALID_HASH', this.getDappUserPending.name, {}, requestHash)
        }

        const doc = await this.tables.pending?.findOne({ _id: requestHash })

        if (doc) {
            return doc as PendingCaptchaRequestRecord
        }

        throw new ProsopoEnvError('DATABASE.PENDING_RECORD_NOT_FOUND', this.getDappUserPending.name)
    }

    /**
     * @description Update a Dapp User's pending record
     */
    async updateDappUserPendingStatus(userAccount: string, requestHash: string, approve: boolean): Promise<void> {
        if (!isHex(requestHash)) {
            throw new ProsopoEnvError('DATABASE.INVALID_HASH', this.updateDappUserPendingStatus.name, {}, requestHash)
        }

        await this.tables.pending?.updateOne(
            { _id: requestHash },
            {
                $set: {
                    accountId: userAccount,
                    pending: false,
                    approved: approve,
                },
            },
            { upsert: true }
        )
    }

    /**
     * @description Get all unsolved captchas
     */
    async getAllCaptchasByDatasetId(datasetId: string, state?: CaptchaStates): Promise<Captcha[] | undefined> {
        const query: Filter<Document> = {
            datasetId,
        }

        switch (state) {
            case CaptchaStates.Solved:
                query.solution = { solution: { $exists: true } }
                break
            case CaptchaStates.Unsolved:
                query.solution = { solution: { $exists: false } }
                break
        }

        const cursor = this.tables.captchas?.find(query)
        const docs = await cursor?.toArray()

        if (docs) {
            // drop the _id field
            return docs.map(({ _id, ...keepAttrs }) => keepAttrs) as Captcha[]
        }

        throw new ProsopoEnvError('DATABASE.CAPTCHA_GET_FAILED')
    }

    /**
     * @description Get all dapp user's solutions
     */
    async getAllSolutions(captchaId: string): Promise<CaptchaSolution[] | undefined> {
        const cursor = this.tables.solutions?.find({ captchaId })
        const docs = await cursor?.toArray()

        if (docs) {
            // drop the _id field
            return docs.map(({ _id, ...keepAttrs }) => keepAttrs) as CaptchaSolution[]
        }

        throw new ProsopoEnvError('DATABASE.SOLUTION_GET_FAILED')
    }

    async getDatasetIdWithSolvedCaptchasOfSizeN(solvedCaptchaCount): Promise<string> {
        const cursor = this.tables.solutions?.aggregate([
            {
                $match: {},
            },
            {
                $group: {
                    _id: '$datasetId',
                    count: { $sum: 1 },
                },
            },
            {
                $match: {
                    count: { $gte: solvedCaptchaCount },
                },
            },
            {
                $sample: { size: 1 },
            },
        ])

        const docs = await cursor?.toArray()
        if (docs && docs.length) {
            // return the _id field
            return docs[0]._id
        }

        throw new ProsopoEnvError('DATABASE.DATASET_WITH_SOLUTIONS_GET_FAILED')
    }

    async getRandomSolvedCaptchasFromSingleDataset(datasetId: string, size: number): Promise<CaptchaSolution[]> {
        //const datasetId = await this.getDatasetIdWithSolvedCaptchasOfSizeN(size);
        if (!isHex(datasetId)) {
            throw new ProsopoEnvError(
                'DATABASE.INVALID_HASH',
                this.getRandomSolvedCaptchasFromSingleDataset.name,
                {},
                datasetId
            )
        }

        const sampleSize = size ? Math.abs(Math.trunc(size)) : 1
        const cursor = this.tables.solutions?.aggregate([
            { $match: { datasetId } },
            { $sample: { size: sampleSize } },
            {
                $project: {
                    captchaId: 1,
                    solution: 1,
                },
            },
        ])
        const docs = await cursor?.toArray()

        if (docs && docs.length) {
            return docs as CaptchaSolution[]
        }

        throw new ProsopoEnvError('DATABASE.SOLUTION_GET_FAILED')
    }

    /**
     * @description Get dapp user solution by ID
     * @param {string[]} commitmentId
     */
    async getDappUserSolutionById(commitmentId: string): Promise<DappUserSolution | undefined> {
        const cursor = this.tables.userSolutions?.findOne(
            {
                commitmentId: commitmentId,
            },
            { projection: { _id: 0 } }
        )
        const doc = await cursor

        if (doc) {
            return doc as unknown as DappUserSolution
        }

        throw new ProsopoEnvError('DATABASE.SOLUTION_GET_FAILED', this.getCaptchaById.name, {}, commitmentId)
    }
    /**
     * @description Approve a dapp user's solution
     * @param {string[]} commitmentId
     */
    async approveDappUserSolution(commitmentId: string): Promise<void> {
        try {
            await this.tables.userSolutions?.findOneAndUpdate(
                { commitmentId: commitmentId },
                { $set: { approved: true } },
                { upsert: false }
            )
        } catch (err) {
            throw new ProsopoEnvError(err, 'DATABASE.SOLUTION_APPROVE_FAILED', {}, commitmentId)
        }
    }
}

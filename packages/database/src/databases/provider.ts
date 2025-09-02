// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { isHex } from "@polkadot/util/is";
import { type Logger, ProsopoDBError } from "@prosopo/common";
import type { TranslationKey } from "@prosopo/locale";
import {
	ApiParams,
	type Captcha,
	type CaptchaResult,
	type CaptchaSolution,
	CaptchaStates,
	CaptchaStatus,
	type Dataset,
	type DatasetBase,
	type DatasetWithIds,
	type DatasetWithIdsAndTree,
	DatasetWithIdsAndTreeSchema,
	type Hash,
	type PoWChallengeComponents,
	type PoWChallengeId,
	type RequestHeaders,
	type ScheduledTaskNames,
	type ScheduledTaskResult,
	type ScheduledTaskStatus,
	type StoredStatus,
	StoredStatusNames,
} from "@prosopo/types";
import type {
	CompositeIpAddress,
	FrictionlessTokenRecord,
	SessionRecord,
} from "@prosopo/types-database";
import {
	CaptchaRecordSchema,
	type ClientRecord,
	ClientRecordSchema,
	DatasetRecordSchema,
	DetectorRecordSchema,
	type DetectorSchema,
	type FrictionlessToken,
	type FrictionlessTokenId,
	FrictionlessTokenRecordSchema,
	type IProviderDatabase,
	type IUserDataSlim,
	type PendingCaptchaRequest,
	type PendingCaptchaRequestMongoose,
	PendingRecordSchema,
	type PoWCaptchaRecord,
	PoWCaptchaRecordSchema,
	type PoWCaptchaStored,
	type ScheduledTask,
	type ScheduledTaskRecord,
	ScheduledTaskRecordSchema,
	ScheduledTaskSchema,
	SessionRecordSchema,
	type SolutionRecord,
	SolutionRecordSchema,
	type StoredCaptcha,
	type Tables,
	type UserCommitment,
	type UserCommitmentRecord,
	UserCommitmentRecordSchema,
	UserCommitmentSchema,
	type UserSolutionRecord,
	UserSolutionRecordSchema,
} from "@prosopo/types-database";
import {
	type AccessRulesStorage,
	createRedisAccessRulesIndex,
	createRedisAccessRulesStorage,
} from "@prosopo/user-access-policy";
import type { ObjectId } from "mongoose";
import { type RedisClientType, createClient } from "redis";
import { string } from "zod";
import { MongoDatabase } from "../base/mongo.js";

enum TableNames {
	captcha = "captcha",
	dataset = "dataset",
	solution = "solution",
	commitment = "commitment",
	usersolution = "usersolution",
	pending = "pending",
	scheduler = "scheduler",
	powcaptcha = "powcaptcha",
	client = "client",
	frictionlessToken = "frictionlessToken",
	session = "session",
	detector = "detector",
}

const PROVIDER_TABLES = [
	{
		collectionName: TableNames.captcha,
		modelName: "Captcha",
		schema: CaptchaRecordSchema,
	},
	{
		collectionName: TableNames.powcaptcha,
		modelName: "PowCaptcha",
		schema: PoWCaptchaRecordSchema,
	},
	{
		collectionName: TableNames.dataset,
		modelName: "Dataset",
		schema: DatasetRecordSchema,
	},
	{
		collectionName: TableNames.solution,
		modelName: "Solution",
		schema: SolutionRecordSchema,
	},
	{
		collectionName: TableNames.commitment,
		modelName: "UserCommitment",
		schema: UserCommitmentRecordSchema,
	},
	{
		collectionName: TableNames.usersolution,
		modelName: "UserSolution",
		schema: UserSolutionRecordSchema,
	},
	{
		collectionName: TableNames.pending,
		modelName: "Pending",
		schema: PendingRecordSchema,
	},
	{
		collectionName: TableNames.scheduler,
		modelName: "Scheduler",
		schema: ScheduledTaskRecordSchema,
	},
	{
		collectionName: TableNames.client,
		modelName: "Client",
		schema: ClientRecordSchema,
	},
	{
		collectionName: TableNames.frictionlessToken,
		modelName: "FrictionlessToken",
		schema: FrictionlessTokenRecordSchema,
	},
	{
		collectionName: TableNames.session,
		modelName: "Session",
		schema: SessionRecordSchema,
	},
	{
		collectionName: TableNames.detector,
		modelName: "Detector",
		schema: DetectorRecordSchema,
	},
];

type ProviderDatabaseOptions = {
	mongo: {
		url: string;
		dbname?: string;
		authSource?: string;
	};
	redis?: {
		url: string;
		password: string;
		indexName?: string;
	};
	logger?: Logger;
};

export class ProviderDatabase
	extends MongoDatabase
	implements IProviderDatabase
{
	tables = {} as Tables<TableNames>;
	private userAccessRulesStorage: AccessRulesStorage | null;

	constructor(private readonly options: ProviderDatabaseOptions) {
		super(
			options.mongo.url,
			options.mongo.dbname,
			options.mongo.authSource,
			options.logger,
		);
		this.tables = {} as Tables<TableNames>;

		this.userAccessRulesStorage = null;
	}

	override async connect(): Promise<void> {
		await super.connect();

		this.loadTables();

		await this.setupRedis();
	}

	protected async setupRedis(): Promise<void> {
		const redisClient = await this.createRedisClient();

		await createRedisAccessRulesIndex(
			redisClient,
			this.options.redis?.indexName,
		);

		this.userAccessRulesStorage = createRedisAccessRulesStorage(
			redisClient,
			this.logger,
		);
	}

	protected async createRedisClient(): Promise<RedisClientType> {
		return (await createClient({
			url: this.options.redis?.url,
			password: this.options.redis?.password,
		})
			.on("error", (error) => {
				this.logger.error(() => ({
					err: error,
					msg: "Redis client error",
				}));
			})
			.connect()) as RedisClientType;
	}

	loadTables() {
		const tables = {} as Tables<TableNames>;
		PROVIDER_TABLES.map(({ collectionName, modelName, schema }) => {
			if (this.connection) {
				tables[collectionName] = this.connection.model(modelName, schema);
			}
		});
		this.tables = tables;
	}

	getTables(): Tables<TableNames> {
		if (!this.tables) {
			throw new ProsopoDBError("DATABASE.TABLES_UNDEFINED", {
				context: { failedFuncName: this.getTables.name },
				logger: this.logger,
			});
		}
		return this.tables;
	}

	public getUserAccessRulesStorage(): AccessRulesStorage {
		if (null === this.userAccessRulesStorage) {
			throw new ProsopoDBError("DATABASE.USER_ACCESS_RULES_STORAGE_UNDEFINED");
		}

		return this.userAccessRulesStorage;
	}

	/**
	 * @description Load a dataset to the database
	 * @param {Dataset}  dataset
	 */
	async storeDataset(dataset: Dataset | DatasetWithIdsAndTree): Promise<void> {
		try {
			this.logger.debug(() => ({
				data: { datasetId: dataset.datasetId },
				msg: "Storing dataset in database",
			}));
			const parsedDataset = DatasetWithIdsAndTreeSchema.parse(dataset);
			const datasetDoc = {
				datasetId: parsedDataset.datasetId,
				datasetContentId: parsedDataset.datasetContentId,
				format: parsedDataset.format,
				contentTree: parsedDataset.contentTree,
				solutionTree: parsedDataset.solutionTree,
			};

			const filter: Pick<DatasetBase, "datasetId"> = {
				datasetId: parsedDataset.datasetId,
			};
			await this.tables.dataset?.updateOne(
				filter,
				{ $set: datasetDoc },
				{ upsert: true },
			);

			// put the dataset id on each of the captcha docs and remove the solution
			const captchaDocs = parsedDataset.captchas.map(
				({ solution, ...captcha }, index) => ({
					...captcha,
					datasetId: parsedDataset.datasetId,
					datasetContentId: parsedDataset.datasetContentId,
					index,
					solved: !!solution?.length,
				}),
			);

			this.logger.debug(() => ({
				msg: "Inserting captcha records",
			}));
			// create a bulk upsert operation and execute
			if (captchaDocs.length) {
				await this.tables?.captcha.bulkWrite(
					captchaDocs.map((captchaDoc) => ({
						updateOne: {
							filter: { captchaId: captchaDoc.captchaId } as Pick<
								Captcha,
								"captchaId"
							>,
							update: { $set: captchaDoc },
							upsert: true,
						},
					})),
				);
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
				}));

			this.logger.debug(() => ({
				msg: "Inserting solution records",
			}));
			// create a bulk upsert operation and execute
			if (captchaSolutionDocs.length) {
				await this.tables?.solution.bulkWrite(
					captchaSolutionDocs.map((captchaSolutionDoc) => ({
						updateOne: {
							filter: { captchaId: captchaSolutionDoc.captchaId } as Pick<
								Captcha,
								"captchaId"
							>,
							update: { $set: captchaSolutionDoc },
							upsert: true,
						},
					})),
				);
			}
			this.logger.debug(() => ({
				msg: "Dataset stored in database",
			}));
		} catch (err) {
			throw new ProsopoDBError("DATABASE.DATASET_LOAD_FAILED", {
				context: { failedFuncName: this.storeDataset.name, error: err },
				logger: this.logger,
			});
		}
	}

	/** @description Get solutions for a dataset
	 * @param {string} datasetId
	 */
	async getSolutions(datasetId: string): Promise<SolutionRecord[]> {
		const filter: Pick<SolutionRecord, "datasetId"> = { datasetId };
		const docs = await this.tables?.solution
			.find(filter)
			.lean<SolutionRecord[]>();
		return docs ? docs : [];
	}

	/** @description Get a solution by captcha id
	 * @param {string} captchaId
	 */
	async getSolutionByCaptchaId(
		captchaId: string,
	): Promise<SolutionRecord | null> {
		const filter: Pick<SolutionRecord, "captchaId"> = { captchaId };
		const doc = await this.tables?.solution
			.findOne(filter)
			.lean<SolutionRecord>();
		return doc || null;
	}

	/** @description Get a dataset from the database
	 * @param {string} datasetId
	 */
	async getDataset(datasetId: string): Promise<DatasetWithIds> {
		const filter: Pick<DatasetBase, "datasetId"> = { datasetId };
		const datasetDoc: DatasetWithIds | null | undefined =
			await this.tables?.dataset.findOne(filter).lean<DatasetWithIds>();

		if (datasetDoc) {
			const { datasetContentId, format, contentTree, solutionTree } =
				datasetDoc;

			const captchas: Captcha[] =
				(await this.tables?.captcha.find(filter).lean<Captcha[]>()) || [];

			const solutions: SolutionRecord[] =
				(await this.tables?.solution.find(filter).lean<SolutionRecord[]>()) ||
				[];

			const solutionsKeyed: {
				[key: string]: SolutionRecord;
			} = {};
			for (const solution of solutions) {
				solutionsKeyed[solution.captchaId] = solution;
			}
			return {
				datasetId,
				datasetContentId,
				format,
				contentTree: contentTree || [],
				solutionTree: solutionTree || [],
				captchas: captchas.map((captchaDoc) => {
					const { captchaId, captchaContentId, items, target, salt, solved } =
						captchaDoc;
					const solution = solutionsKeyed[captchaId];
					return {
						captchaId,
						captchaContentId,
						solved: !!solved,
						salt,
						items,
						target,
						solution: solved && solution ? solution.solution : ([] as string[]),
					};
				}),
			};
		}
		throw new ProsopoDBError("DATABASE.DATASET_GET_FAILED", {
			context: { failedFuncName: this.getDataset.name, datasetId },
		});
	}

	/**
	 * @description Get random captchas that are solved or not solved
	 * @param {boolean}  solved    `true` when captcha is solved
	 * @param {string}   datasetId  the id of the data set
	 * @param {number}   size       the number of records to be returned
	 */
	async getRandomCaptcha(
		solved: boolean,
		datasetId: Hash,
		size?: number,
	): Promise<Captcha[] | undefined> {
		if (!isHex(datasetId)) {
			throw new ProsopoDBError("DATABASE.INVALID_HASH", {
				context: { failedFuncName: this.getRandomCaptcha.name, datasetId },
			});
		}
		const sampleSize = size ? Math.abs(Math.trunc(size)) : 1;
		const filter: Pick<Captcha, "datasetId" | "solved"> = { datasetId, solved };
		const cursor = this.tables?.captcha.aggregate([
			{ $match: filter },
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
		]);
		const docs = await cursor;

		if (docs?.length) {
			// drop the _id field
			return docs.map(({ _id, ...keepAttrs }) => keepAttrs) as Captcha[];
		}

		throw new ProsopoDBError("DATABASE.CAPTCHA_GET_FAILED", {
			context: {
				failedFuncName: this.getRandomCaptcha.name,
				solved,
				datasetId,
				size,
			},
		});
	}

	/**
	 * @description Get captchas by id
	 * @param {string[]} captchaId
	 */
	async getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined> {
		const filter: {
			[key in keyof Pick<Captcha, "captchaId">]: { $in: string[] };
		} = { captchaId: { $in: captchaId } };
		const cursor = this.tables?.captcha
			.find<Captcha>(filter)
			.lean<(Captcha & { _id: unknown })[]>();
		const docs = await cursor;

		if (docs?.length) {
			// drop the _id field
			return docs.map(({ _id, ...keepAttrs }) => keepAttrs);
		}

		throw new ProsopoDBError("DATABASE.CAPTCHA_GET_FAILED", {
			context: { failedFuncName: this.getCaptchaById.name, captchaId },
		});
	}

	/**
	 * @description Update a captcha
	 * @param {Captcha}  captcha
	 * @param {string}   datasetId  the id of the data set
	 */
	async updateCaptcha(captcha: Captcha, datasetId: Hash): Promise<void> {
		if (!isHex(datasetId)) {
			throw new ProsopoDBError("DATABASE.INVALID_HASH", {
				context: { failedFuncName: this.updateCaptcha.name, datasetId },
			});
		}
		try {
			const filter: Pick<DatasetBase, "datasetId"> = { datasetId };
			await this.tables?.captcha.updateOne(
				filter,
				{ $set: captcha },
				{ upsert: false },
			);
		} catch (err) {
			throw new ProsopoDBError("DATABASE.CAPTCHA_UPDATE_FAILED", {
				context: { failedFuncName: this.getDatasetDetails.name, error: err },
			});
		}
	}

	/**
	 * @description Remove captchas
	 */
	async removeCaptchas(captchaIds: string[]): Promise<void> {
		const filter: {
			[key in keyof Pick<Captcha, "captchaId">]: { $in: string[] };
		} = { captchaId: { $in: captchaIds } };
		await this.tables?.captcha.deleteMany(filter);
	}

	/**
	 * @description Get a dataset by Id
	 */
	async getDatasetDetails(datasetId: Hash): Promise<DatasetBase> {
		if (!isHex(datasetId)) {
			throw new ProsopoDBError("DATABASE.INVALID_HASH", {
				context: { failedFuncName: this.getDatasetDetails.name, datasetId },
			});
		}

		const filter: Pick<DatasetBase, "datasetId"> = { datasetId };
		const doc: DatasetBase | undefined | null = await this.tables?.dataset
			.findOne(filter)
			.lean<DatasetBase>();

		if (doc) {
			return doc;
		}

		throw new ProsopoDBError("DATABASE.DATASET_GET_FAILED", {
			context: {
				failedFuncName: this.getDatasetDetails.name,
				datasetId,
			},
		});
	}

	/**
	 * @description Store a Dapp User's captcha solution commitment
	 */
	async storeUserImageCaptchaSolution(
		captchas: CaptchaSolution[],
		commit: UserCommitment,
	): Promise<void> {
		const commitmentRecord = UserCommitmentSchema.parse({
			...commit,
			lastUpdatedTimestamp: Date.now(),
		});
		if (captchas.length) {
			const filter: Pick<UserCommitmentRecord, "id"> = {
				id: commit.id,
			};
			await this.tables?.commitment.updateOne(filter, commitmentRecord, {
				upsert: true,
			});

			const ops = captchas.map((captcha: CaptchaSolution) => ({
				updateOne: {
					filter: {
						commitmentId: commit.id,
						captchaId: captcha.captchaId,
					} as Pick<UserSolutionRecord, "commitmentId" | "captchaId">,
					update: {
						$set: <UserSolutionRecord>{
							captchaId: captcha.captchaId,
							captchaContentId: captcha.captchaContentId,
							salt: captcha.salt,
							solution: captcha.solution,
							commitmentId: commit.id,
							processed: false,
						},
					},
					upsert: true,
				},
			}));
			await this.tables?.usersolution.bulkWrite(ops);
		}
	}

	/**
	 * @description Adds a new PoW Captcha record to the database.
	 * @param {string} challenge The challenge string for the captcha.
	 * @param components The components of the PoW challenge.
	 * @param difficulty
	 * @param providerSignature
	 * @param ipAddress
	 * @param headers
	 * @param ja4
	 * @param frictionlessTokenId
	 * @param serverChecked
	 * @param userSubmitted
	 * @param storedStatus
	 * @param userSignature
	 * @returns {Promise<void>} A promise that resolves when the record is added.
	 */
	async storePowCaptchaRecord(
		challenge: PoWChallengeId,
		components: PoWChallengeComponents,
		difficulty: number,
		providerSignature: string,
		ipAddress: CompositeIpAddress,
		headers: RequestHeaders,
		ja4: string,
		frictionlessTokenId?: FrictionlessTokenId,
		serverChecked = false,
		userSubmitted = false,
		storedStatus: StoredStatus = StoredStatusNames.notStored,
		userSignature?: string,
	): Promise<void> {
		const tables = this.getTables();

		const powCaptchaRecord: PoWCaptchaStored = {
			challenge,
			...components,
			ipAddress,
			headers,
			ja4,
			result: { status: CaptchaStatus.pending },
			userSubmitted,
			serverChecked,
			difficulty,
			providerSignature,
			userSignature,
			lastUpdatedTimestamp: Date.now(),
			frictionlessTokenId,
		};

		try {
			await tables.powcaptcha.create(powCaptchaRecord);
			this.logger.info(() => ({
				data: {
					challenge,
					userSubmitted,
					serverChecked,
					storedStatus,
				},
				msg: "PowCaptcha record added successfully",
			}));
		} catch (error) {
			const err = new ProsopoDBError("DATABASE.CAPTCHA_UPDATE_FAILED", {
				context: {
					error,
					challenge,
					userSubmitted,
					serverChecked,
					storedStatus,
				},
				logger: this.logger,
			});
			this.logger.error(() => ({
				err: error,
				msg: "Failed to add PowCaptcha record",
			}));
			throw err;
		}
	}

	/**
	 * @description Retrieves a PoW Captcha record by its challenge string.
	 * @param {string} challenge The challenge string to search for.
	 * @returns {Promise<PoWCaptchaRecord | null>} A promise that resolves with the found record or null if not found.
	 */
	async getPowCaptchaRecordByChallenge(
		challenge: string,
	): Promise<PoWCaptchaRecord | null> {
		if (!this.tables) {
			throw new ProsopoDBError("DATABASE.DATABASE_UNDEFINED", {
				context: { failedFuncName: this.getPowCaptchaRecordByChallenge.name },
				logger: this.logger,
			});
		}

		try {
			const filter: {
				[key in keyof Pick<PoWCaptchaRecord, "challenge">]: string;
			} = { challenge };
			const record: PoWCaptchaRecord | null | undefined =
				await this.tables.powcaptcha.findOne(filter).lean<PoWCaptchaRecord>();
			if (record) {
				this.logger.info(() => ({
					data: { challenge },
					msg: "PowCaptcha record retrieved successfully",
				}));
				return record;
			}
			this.logger.info(() => ({
				data: { challenge },
				msg: "No PowCaptcha record found",
			}));
			return null;
		} catch (error) {
			const err = new ProsopoDBError("DATABASE.CAPTCHA_GET_FAILED", {
				context: { error, challenge },
				logger: this.logger,
			});
			this.logger.error(() => ({
				err: err,
				msg: "Failed to retrieve PowCaptcha record",
			}));
			throw err;
		}
	}

	/**
	 * @description Updates a PoW Captcha record in the database.
	 * @param {string} challenge The challenge string of the captcha to be updated.
	 * @param result
	 * @param serverChecked
	 * @param userSubmitted
	 * @param userSignature
	 * @returns {Promise<void>} A promise that resolves when the record is updated.
	 */
	async updatePowCaptchaRecord(
		challenge: PoWChallengeId,
		result: CaptchaResult,
		serverChecked = false,
		userSubmitted = false,
		userSignature?: string,
	): Promise<void> {
		const tables = this.getTables();
		const timestamp = Date.now();
		const update: Pick<
			PoWCaptchaRecord,
			| "result"
			| "serverChecked"
			| "userSubmitted"
			| "storedAtTimestamp"
			| "userSignature"
			| "lastUpdatedTimestamp"
		> = {
			result,
			serverChecked,
			userSubmitted,
			userSignature,
			lastUpdatedTimestamp: timestamp,
		};
		try {
			const updateResult = await tables.powcaptcha.updateOne(
				{ challenge },
				{
					$set: update,
				},
			);
			if (updateResult.matchedCount === 0) {
				const err = new ProsopoDBError("DATABASE.CAPTCHA_GET_FAILED", {
					context: {
						challenge,
						...update,
					},
					logger: this.logger,
				});
				this.logger.info(() => ({
					err: err,
					msg: "No PowCaptcha record found to update",
				}));
				throw err;
			}
			this.logger.info(() => ({
				data: {
					challenge,
					...update,
				},
				msg: "PowCaptcha record updated successfully",
			}));
		} catch (error) {
			const err = new ProsopoDBError("DATABASE.CAPTCHA_UPDATE_FAILED", {
				context: {
					error,
					challenge,
					...update,
				},
				logger: this.logger,
			});
			this.logger.error(() => ({
				err: err,
				msg: "Failed to update PowCaptcha record",
			}));
			throw err;
		}
	}

	/** @description Get serverChecked Dapp User image captcha commitments from the commitments table
	 */
	async getCheckedDappUserCommitments(): Promise<UserCommitmentRecord[]> {
		const filter: {
			[key in keyof Pick<UserCommitmentRecord, "serverChecked">]: boolean;
		} = { [StoredStatusNames.serverChecked]: true };
		const docs = await this.tables?.commitment
			.find(filter)
			.lean<UserCommitmentRecord[]>();
		return docs || [];
	}

	/** @description Get Dapp User captcha commitments from the commitments table that have not been counted towards the
	 * client's total
	 */
	async getUnstoredDappUserCommitments(
		limit = 1000,
		skip = 0,
	): Promise<UserCommitmentRecord[]> {
		const filterNoStoredTimestamp: {
			[key in keyof Pick<PoWCaptchaRecord, "storedAtTimestamp">]: {
				$exists: boolean;
			};
		} = { storedAtTimestamp: { $exists: false } };
		const docs = await this.tables?.commitment.aggregate<UserCommitmentRecord>([
			{
				$match: {
					$or: [
						filterNoStoredTimestamp,
						{
							$expr: {
								$lt: ["$storedAtTimestamp", "$lastUpdatedTimestamp"],
							},
						},
					],
				},
			},
			{
				$sort: { _id: 1 },
			},
			{
				$skip: skip,
			},
			{
				$limit: limit,
			},
		]);
		return docs || [];
	}

	/** @description Mark a list of captcha commits as stored
	 */
	async markDappUserCommitmentsStored(commitmentIds: Hash[]): Promise<void> {
		const updateDoc: Pick<StoredCaptcha, "storedAtTimestamp"> = {
			storedAtTimestamp: Date.now(),
		};
		await this.tables?.commitment.updateMany(
			{ id: { $in: commitmentIds } },
			{ $set: updateDoc },
			{ upsert: false },
		);
	}

	/** @description Mark a list of captcha commits as checked
	 */
	async markDappUserCommitmentsChecked(commitmentIds: Hash[]): Promise<void> {
		const updateDoc: Pick<
			StoredCaptcha,
			"serverChecked" | "lastUpdatedTimestamp"
		> = {
			[StoredStatusNames.serverChecked]: true,
			lastUpdatedTimestamp: Date.now(),
		};

		await this.tables?.commitment.updateMany(
			{ id: { $in: commitmentIds } },
			{ $set: updateDoc },
			{ upsert: false },
		);
	}

	/**
	 * @description Get Dapp User PoW captcha commitments that have not been counted towards the client's total
	 * @param {number} limit Maximum number of records to return
	 * @param {number} skip Number of records to skip (for pagination)
	 * @returns {Promise<PoWCaptchaRecord[]>} Array of PoW captcha records
	 */
	async getUnstoredDappUserPoWCommitments(
		limit = 1000,
		skip = 0,
	): Promise<PoWCaptchaRecord[]> {
		const filterNoStoredTimestamp: {
			[key in keyof Pick<PoWCaptchaRecord, "storedAtTimestamp">]: {
				$exists: boolean;
			};
		} = { storedAtTimestamp: { $exists: false } };
		const docs = await this.tables?.powcaptcha.aggregate<PoWCaptchaRecord>([
			{
				$match: {
					$or: [
						filterNoStoredTimestamp,
						{
							$expr: {
								$lt: [
									{
										$convert: {
											input: "$storedAtTimestamp",
											to: "date",
										},
									},
									{
										$convert: {
											input: "$lastUpdatedTimestamp",
											to: "date",
										},
									},
								],
							},
						},
					],
				},
			},
			{
				$sort: { _id: 1 },
			},
			{
				$skip: skip,
			},
			{
				$limit: limit,
			},
		]);
		return docs || [];
	}

	/** @description Mark a list of PoW captcha commits as stored
	 */
	async markDappUserPoWCommitmentsStored(challenges: string[]): Promise<void> {
		const updateDoc: Pick<StoredCaptcha, "storedAtTimestamp"> = {
			storedAtTimestamp: Date.now(),
		};

		await this.tables?.powcaptcha.updateMany(
			{ challenge: { $in: challenges } },
			{ $set: updateDoc },
			{ upsert: false },
		);
	}

	/** @description Mark a list of PoW captcha commits as checked by the server
	 */
	async markDappUserPoWCommitmentsChecked(challenges: string[]): Promise<void> {
		const updateDoc: Pick<
			StoredCaptcha,
			"serverChecked" | "lastUpdatedTimestamp"
		> = {
			[StoredStatusNames.serverChecked]: true,
			lastUpdatedTimestamp: Date.now(),
		};
		await this.tables?.powcaptcha.updateMany(
			{ challenge: { $in: challenges } },
			{
				$set: updateDoc,
			},
			{ upsert: false },
		);
	}

	/**
	 * Store a new frictionless token record
	 */
	async storeFrictionlessTokenRecord(
		tokenRecord: FrictionlessToken,
	): Promise<ObjectId> {
		const doc =
			await this.tables.frictionlessToken.create<FrictionlessTokenRecord>(
				tokenRecord,
			);
		return doc._id;
	}

	/** Update a frictionless token record */
	async updateFrictionlessTokenRecord(
		tokenId: FrictionlessTokenId,
		updates: Partial<FrictionlessTokenRecord>,
	): Promise<void> {
		const filter: Pick<FrictionlessTokenRecord, "_id"> = { _id: tokenId };
		await this.tables.frictionlessToken.updateOne(filter, updates);
	}

	/** Get a frictionless token record */
	async getFrictionlessTokenRecordByTokenId(
		tokenId: FrictionlessTokenId,
	): Promise<FrictionlessTokenRecord | undefined> {
		const filter: Pick<FrictionlessTokenRecord, "_id"> = { _id: tokenId };
		const doc =
			await this.tables.frictionlessToken.findOne<FrictionlessTokenRecord>(
				filter,
			);
		return doc ? doc : undefined;
	}
	/** Get many frictionless token records */
	async getFrictionlessTokenRecordsByTokenIds(
		tokenId: FrictionlessTokenId[],
	): Promise<FrictionlessTokenRecord[]> {
		const filter: Pick<FrictionlessTokenRecord, "_id"> = {
			_id: { $in: tokenId },
		};
		return this.tables.frictionlessToken.find<FrictionlessTokenRecord>(filter);
	}

	/**
	 * Check if a frictionless token record exists.
	 * Used to ensure that a token is not used more than once.
	 */
	async getFrictionlessTokenRecordByToken(
		token: string,
	): Promise<FrictionlessTokenRecord | undefined> {
		const filter: Pick<FrictionlessTokenRecord, "token"> = { token };
		const record =
			await this.tables.frictionlessToken.findOne<FrictionlessTokenRecord>(
				filter,
			);
		return record || undefined;
	}

	/**
	 * Store a new session record
	 */
	async storeSessionRecord(sessionRecord: SessionRecord): Promise<void> {
		try {
			this.logger.debug(() => ({
				data: { action: "storing", sessionRecord },
			}));
			await this.tables.session.create(sessionRecord);
		} catch (err) {
			throw new ProsopoDBError("DATABASE.SESSION_STORE_FAILED", {
				context: { error: err, sessionId: sessionRecord.sessionId },
				logger: this.logger,
			});
		}
	}

	/**
	 * Check if a session exists and mark it as removed
	 * @returns The session record if it existed, undefined otherwise
	 */
	async checkAndRemoveSession(
		sessionId: string,
	): Promise<SessionRecord | undefined> {
		this.logger.debug(() => ({
			data: { action: "checking and removing", sessionId },
		}));
		const filter: {
			[key in keyof Pick<SessionRecord, "sessionId" | "deleted">]:
				| string
				| { $exists: boolean };
		} = {
			sessionId,
			deleted: { $exists: false },
		};
		try {
			const session = await this.tables.session
				.findOneAndUpdate<SessionRecord>(filter, {
					deleted: true,
					lastUpdatedTimestamp: Date.now(),
				})
				.lean<SessionRecord>();
			return session || undefined;
		} catch (err) {
			throw new ProsopoDBError("DATABASE.SESSION_CHECK_REMOVE_FAILED", {
				context: { error: err, sessionId },
				logger: this.logger,
			});
		}
	}

	/** Get unstored session records
	 * @description Get session records that have not been stored yet
	 * @param limit
	 * @param skip
	 */
	getUnstoredSessionRecords(limit = 1000, skip = 0): Promise<SessionRecord[]> {
		const filterNoStoredTimestamp: {
			[key in keyof Pick<SessionRecord, "storedAtTimestamp">]: {
				$exists: boolean;
			};
		} = { storedAtTimestamp: { $exists: false } };
		return this.tables?.session
			.aggregate<SessionRecord>([
				{
					$match: {
						$or: [
							filterNoStoredTimestamp,
							{
								$expr: {
									$lt: [
										{
											$convert: {
												input: "$storedAtTimestamp",
												to: "date",
											},
										},
										{
											$convert: {
												input: "$lastUpdatedTimestamp",
												to: "date",
											},
										},
									],
								},
							},
						],
					},
				},
				{
					$sort: { _id: 1 },
				},
				{
					$skip: skip,
				},
				{
					$limit: limit,
				},
			])
			.then((docs) => docs || []);
	}

	/** Mark a list of session records as stored */
	async markSessionRecordsStored(sessionIds: string[]): Promise<void> {
		const updateDoc: Pick<SessionRecord, "storedAtTimestamp"> = {
			storedAtTimestamp: Date.now(),
		};
		await this.tables?.session.updateMany(
			{ sessionId: { $in: sessionIds } },
			{ $set: updateDoc },
			{ upsert: false },
		);
	}

	/**
	 * @description Store a Dapp User's pending record
	 */
	async storePendingImageCommitment(
		userAccount: string,
		requestHash: string,
		salt: string,
		deadlineTimestamp: number,
		requestedAtTimestamp: number,
		ipAddress: CompositeIpAddress,
		threshold: number,
		frictionlessTokenId?: FrictionlessTokenId,
	): Promise<void> {
		if (!isHex(requestHash)) {
			throw new ProsopoDBError("DATABASE.INVALID_HASH", {
				context: {
					failedFuncName: this.storePendingImageCommitment.name,
					requestHash,
				},
			});
		}
		const pendingRecord: PendingCaptchaRequestMongoose = {
			accountId: userAccount,
			pending: true,
			salt,
			requestHash,
			deadlineTimestamp,
			requestedAtTimestamp: new Date(requestedAtTimestamp),
			ipAddress,
			frictionlessTokenId,
			threshold,
		};
		await this.tables?.pending.updateOne(
			{ requestHash: requestHash },
			{ $set: pendingRecord },
			{ upsert: true },
		);
	}

	/**
	 * @description Get a Dapp user's pending record
	 */
	async getPendingImageCommitment(
		requestHash: string,
	): Promise<PendingCaptchaRequest> {
		if (!isHex(requestHash)) {
			throw new ProsopoDBError("DATABASE.INVALID_HASH", {
				context: {
					failedFuncName: this.getPendingImageCommitment.name,
					requestHash,
				},
			});
		}
		// @ts-ignore
		const filter: Pick<PendingCaptchaRequest, "requestHash"> = {
			[ApiParams.requestHash]: requestHash,
		};

		const doc: PendingCaptchaRequest | null | undefined =
			await this.tables?.pending.findOne(filter).lean<PendingCaptchaRequest>();

		if (doc) {
			return doc;
		}

		throw new ProsopoDBError("DATABASE.PENDING_RECORD_NOT_FOUND", {
			context: {
				failedFuncName: this.getPendingImageCommitment.name,
				requestHash,
			},
		});
	}

	/**
	 * @description Mark a pending request as used
	 */
	async updatePendingImageCommitmentStatus(requestHash: string): Promise<void> {
		if (!isHex(requestHash)) {
			throw new ProsopoDBError("DATABASE.INVALID_HASH", {
				context: {
					failedFuncName: this.updatePendingImageCommitmentStatus.name,
					requestHash,
				},
			});
		}

		// @ts-ignore
		const filter: Pick<PendingCaptchaRequest, "requestHash"> = {
			[ApiParams.requestHash]: requestHash,
		};
		await this.tables?.pending.updateOne<PendingCaptchaRequest>(
			filter,
			{
				$set: {
					[CaptchaStatus.pending]: false,
				},
			},
			{ upsert: true },
		);
	}

	/**
	 * @description Get all unsolved captchas
	 */
	async getAllCaptchasByDatasetId(
		datasetId: string,
		state?: CaptchaStates,
	): Promise<Captcha[] | undefined> {
		const filter: Pick<Captcha, "datasetId" | "solved"> = {
			datasetId,
			solved: state === CaptchaStates.Solved,
		};
		const cursor = this.tables?.captcha
			.find(filter)
			.lean<(Captcha & { _id: unknown })[]>();
		const docs = await cursor;

		if (docs) {
			// drop the _id field
			return docs.map(({ _id, ...keepAttrs }) => keepAttrs);
		}

		throw new ProsopoDBError("DATABASE.CAPTCHA_GET_FAILED");
	}

	/**
	 * @description Get all dapp user solutions by captchaIds
	 */
	async getAllDappUserSolutions(
		captchaId: string[],
	): Promise<UserSolutionRecord[] | undefined> {
		const filter: {
			[key in keyof Pick<UserSolutionRecord, "captchaId">]: { $in: string[] };
		} = {
			captchaId: { $in: captchaId },
		};
		const cursor = this.tables?.usersolution
			?.find<UserSolutionRecord>(filter)
			.lean<(UserSolutionRecord & { _id: unknown })[]>();
		const docs = await cursor;

		if (docs) {
			// drop the _id field
			return docs.map(
				({ _id, ...keepAttrs }) => keepAttrs,
			) as UserSolutionRecord[];
		}

		throw new ProsopoDBError("DATABASE.SOLUTION_GET_FAILED");
	}

	async getDatasetIdWithSolvedCaptchasOfSizeN(
		solvedCaptchaCount: number,
	): Promise<string> {
		const cursor = this.tables?.solution.aggregate([
			{
				$match: {},
			},
			{
				$group: {
					_id: "$datasetId",
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
		]);

		const docs = await cursor;
		if (docs?.length) {
			// return the _id field
			return docs[0]._id;
		}

		throw new ProsopoDBError("DATABASE.DATASET_WITH_SOLUTIONS_GET_FAILED");
	}

	async getRandomSolvedCaptchasFromSingleDataset(
		datasetId: string,
		size: number,
	): Promise<CaptchaSolution[]> {
		if (!isHex(datasetId)) {
			throw new ProsopoDBError("DATABASE.INVALID_HASH", {
				context: {
					failedFuncName: this.getRandomSolvedCaptchasFromSingleDataset.name,
					datasetId,
				},
			});
		}

		const sampleSize = size ? Math.abs(Math.trunc(size)) : 1;
		const cursor = this.tables?.solution.aggregate([
			{ $match: { datasetId } },
			{ $sample: { size: sampleSize } },
			{
				$project: {
					captchaId: 1,
					captchaContentId: 1,
					solution: 1,
				},
			},
		]);
		const docs = await cursor;

		if (docs?.length) {
			return docs as CaptchaSolution[];
		}

		throw new ProsopoDBError("DATABASE.SOLUTION_GET_FAILED", {
			context: {
				failedFuncName: this.getRandomSolvedCaptchasFromSingleDataset.name,
				datasetId,
				size,
			},
		});
	}

	/**
	 * @description Get dapp user solution by ID
	 * @param {string[]} commitmentIds
	 */
	async getDappUserSolutionsById(
		commitmentIds: string[],
	): Promise<UserSolutionRecord[]> {
		const filter: {
			[key in keyof Pick<UserSolutionRecord, "commitmentId">]: {
				$in: string[];
			};
		} = {
			commitmentId: { $in: commitmentIds },
		};
		const project = { projection: { _id: 0 } };
		const cursor = this.tables?.usersolution?.findOne(filter, project).lean();
		const doc = await cursor;

		if (doc) {
			return doc as unknown as UserSolutionRecord;
		}

		throw new ProsopoDBError("DATABASE.SOLUTION_GET_FAILED", {
			context: { failedFuncName: this.getCaptchaById.name, commitmentIds },
		});
	}

	/**
	 * @description Get dapp user commitment by user account
	 * @param commitmentId
	 */
	async getDappUserCommitmentById(
		commitmentId: string,
	): Promise<UserCommitmentRecord | undefined> {
		const filter: Pick<UserCommitmentRecord, "id"> = { id: commitmentId };
		const commitmentCursor = this.tables?.commitment
			?.findOne(filter)
			.lean<UserCommitmentRecord>();

		const doc = await commitmentCursor;

		return doc ? doc : undefined;
	}

	/**
	 * @description Get dapp user commitment by user account
	 * @param {string} userAccount
	 * @param {string} dappAccount
	 */
	async getDappUserCommitmentByAccount(
		userAccount: string,
		dappAccount: string,
	): Promise<UserCommitmentRecord[]> {
		const filter: Pick<UserCommitmentRecord, "userAccount" | "dappAccount"> = {
			userAccount,
			dappAccount,
		};
		const project = { _id: 0 };
		const sort = { sort: { _id: -1 } };
		const docs: UserCommitmentRecord[] | null | undefined =
			await this.tables?.commitment
				// sort by most recent first to avoid old solutions being used in development
				?.find(filter, project, sort)
				.lean<UserCommitmentRecord[]>();

		return docs ? (docs as UserCommitmentRecord[]) : [];
	}

	/**
	 * @description Approve a dapp user's solution
	 * @param {string[]} commitmentId
	 */
	async approveDappUserCommitment(commitmentId: string): Promise<void> {
		try {
			const result: CaptchaResult = { status: CaptchaStatus.approved };
			const updateDoc: Pick<StoredCaptcha, "result" | "lastUpdatedTimestamp"> =
				{
					result,
					lastUpdatedTimestamp: Date.now(),
				};
			const filter: Pick<UserCommitmentRecord, "id"> = { id: commitmentId };
			await this.tables?.commitment
				?.findOneAndUpdate(filter, { $set: updateDoc }, { upsert: false })
				.lean();
		} catch (err) {
			throw new ProsopoDBError("DATABASE.SOLUTION_APPROVE_FAILED", {
				context: { error: err, commitmentId },
			});
		}
	}

	/**
	 * @description Disapprove a dapp user's solution
	 * @param {string} commitmentId
	 * @param reason
	 */
	async disapproveDappUserCommitment(
		commitmentId: string,
		reason?: TranslationKey,
	): Promise<void> {
		try {
			const updateDoc: Pick<StoredCaptcha, "result" | "lastUpdatedTimestamp"> =
				{
					result: { status: CaptchaStatus.disapproved, reason },
					lastUpdatedTimestamp: Date.now(),
				};

			const filter: Pick<UserCommitmentRecord, "id"> = { id: commitmentId };
			await this.tables?.commitment
				?.findOneAndUpdate(filter, { $set: updateDoc }, { upsert: false })
				.lean();
		} catch (err) {
			throw new ProsopoDBError("DATABASE.SOLUTION_APPROVE_FAILED", {
				context: { error: err, commitmentId },
			});
		}
	}

	/**
	 * @description Flag a dapp user's solutions as used by calculated solution
	 * @param {string[]} captchaIds
	 */
	async flagProcessedDappUserSolutions(captchaIds: Hash[]): Promise<void> {
		try {
			await this.tables?.usersolution
				?.updateMany(
					{ captchaId: { $in: captchaIds } },
					{ $set: { processed: true } },
					{ upsert: false },
				)
				.lean();
		} catch (err) {
			throw new ProsopoDBError("DATABASE.SOLUTION_FLAG_FAILED", {
				context: { error: err, captchaIds },
			});
		}
	}

	/**
	 * @description Flag dapp users' commitments as used by calculated solution
	 * @param {string[]} commitmentIds
	 */
	async flagProcessedDappUserCommitments(commitmentIds: Hash[]): Promise<void> {
		try {
			const distinctCommitmentIds = [...new Set(commitmentIds)];
			await this.tables?.commitment
				?.updateMany(
					{ id: { $in: distinctCommitmentIds } },
					{ $set: { processed: true } },
					{ upsert: false },
				)
				.lean();
		} catch (err) {
			throw new ProsopoDBError("DATABASE.COMMITMENT_FLAG_FAILED", {
				context: { error: err, commitmentIds },
			});
		}
	}

	/**
	 * @description Get a scheduled task status record by task ID and status
	 */
	async getScheduledTaskStatus(
		taskId: ObjectId,
		status: ScheduledTaskStatus,
	): Promise<ScheduledTaskRecord | undefined> {
		const filter: Pick<ScheduledTaskRecord, "_id" | "status"> = {
			_id: taskId,
			status: status,
		};
		const cursor: ScheduledTaskRecord | undefined | null =
			await this.tables?.scheduler
				?.findOne<ScheduledTaskRecord>(filter)
				.lean<ScheduledTaskRecord>();
		return cursor ? cursor : undefined;
	}

	/**
	 * @description Get the most recent scheduled task status record for a given task
	 */
	async getLastScheduledTaskStatus(
		task: ScheduledTaskNames,
		status?: ScheduledTaskStatus,
	): Promise<ScheduledTaskRecord | undefined> {
		const filter: {
			processName: ScheduledTaskNames;
			status?: ScheduledTaskStatus;
		} = { processName: task };
		if (status) {
			filter.status = status;
		}
		const sort: { [key in keyof Pick<ScheduledTaskRecord, "datetime">]: -1 } = {
			datetime: -1,
		};
		const cursor: ScheduledTaskRecord | undefined | null =
			await this.tables?.scheduler
				?.findOne(filter)
				.sort(sort)
				.limit(1)
				.lean<ScheduledTaskRecord>();
		return cursor ? cursor : undefined;
	}

	/**
	 * @description Create the status of a scheduled task
	 */
	async createScheduledTaskStatus(
		taskName: ScheduledTaskNames,
		status: ScheduledTaskStatus,
	): Promise<ObjectId> {
		const now = new Date().getTime();
		const doc = ScheduledTaskSchema.parse({
			processName: taskName,
			datetime: now,
			status,
		});
		const taskRecord = await this.tables?.scheduler.create(doc);
		return taskRecord._id;
	}

	/**
	 * @description Update the status of a scheduled task and an optional result
	 */
	async updateScheduledTaskStatus(
		taskId: ObjectId,
		status: ScheduledTaskStatus,
		result?: ScheduledTaskResult,
	): Promise<void> {
		const update: Omit<ScheduledTask, "processName" | "datetime"> = {
			status,
			updated: new Date().getTime(),
			...(result && { result }),
		};
		const filter: Pick<ScheduledTaskRecord, "_id"> = { _id: taskId };
		await this.tables?.scheduler.updateOne(
			filter,
			{ $set: update },
			{
				upsert: false,
			},
		);
	}

	/**
	 * @description Clean up the scheduled task status records
	 */
	async cleanupScheduledTaskStatus(status: ScheduledTaskStatus): Promise<void> {
		const filter: Pick<ScheduledTaskRecord, "status"> = {
			status,
		};
		await this.tables?.scheduler.deleteMany(filter);
	}

	/**
	 * @description Update the client records
	 */
	async updateClientRecords(clientRecords: ClientRecord[]): Promise<void> {
		const ops = clientRecords.map((record) => {
			const clientRecord: IUserDataSlim = {
				account: record.account,
				settings: record.settings,
				tier: record.tier,
			};
			const filter: Pick<IUserDataSlim, "account"> = {
				account: record.account,
			};
			return {
				updateOne: {
					filter,
					update: {
						$set: clientRecord,
					},
					upsert: true,
				},
			};
		});
		await this.tables?.client.bulkWrite(ops);
	}

	/**
	 * @description Get a client record
	 */
	async getClientRecord(account: string): Promise<ClientRecord | undefined> {
		const filter: Pick<ClientRecord, "account"> = { account };
		const doc = await this.tables?.client.findOne(filter).lean<ClientRecord>();
		return doc ? doc : undefined;
	}

	/**
	 * @description Store a detector key
	 */
	async storeDetectorKey(detectorKey: string): Promise<void> {
		return this.tables?.detector.create({
			detectorKey,
			createdAt: new Date(),
		});
	}

	/**
	 * @description Remove a detector key
	 * @param detectorKey The detector key to remove
	 * @param expirationInSeconds Optional expiration time in seconds (default is 10 minutes)
	 * */
	async removeDetectorKey(
		detectorKey: string,
		expirationInSeconds?: number,
	): Promise<void> {
		const filter: Pick<DetectorSchema, "detectorKey"> = { detectorKey };

		const expiresAt = new Date(
			Date.now() + (expirationInSeconds || 10 * 60) * 1000,
		);

		await this.tables?.detector.updateOne(filter, {
			$set: { expiresAt },
		});
	}

	/**
	 * @description Get valid detector keys
	 */
	async getDetectorKeys(): Promise<string[]> {
		const keyRecords = await this.tables?.detector
			.find(
				{
					$or: [{ expiresAt: { $exists: false } }, { expiresAt: null }],
				},
				{ detectorKey: 1 },
			)
			.sort({ createdAt: -1 }) // Sort by createdAt in descending order
			.lean<DetectorSchema[]>(); // Improve performance by returning a plain object

		return (keyRecords || []).map((record) => record.detectorKey);
	}
}

// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import {
  AsyncFactory,
  getLoggerDefault,
  type Logger,
  ProsopoDBError,
  ProsopoEnvError,
  TranslationKey,
} from "@prosopo/common";
import {
  type Captcha,
  CaptchaResult,
  type CaptchaSolution,
  CaptchaStates,
  CaptchaStatus,
  type DatasetBase,
  type DatasetWithIds,
  type DatasetWithIdsAndTree,
  DatasetWithIdsAndTreeSchema,
  type Hash,
  type PendingCaptchaRequest,
  PoWChallengeComponents,
  PoWChallengeId,
  ScheduledTaskNames,
  type ScheduledTaskResult,
  ScheduledTaskStatus,
} from "@prosopo/types";
import {
  CaptchaRecordSchema,
  type Database,
  DatasetRecordSchema,
  PendingRecordSchema,
  PoWCaptchaRecord,
  PowCaptchaRecordSchema,
  PoWCaptchaStored,
  ScheduledTask,
  type ScheduledTaskRecord,
  ScheduledTaskRecordSchema,
  ScheduledTaskSchema,
  type SolutionRecord,
  SolutionRecordSchema,
  StoredCaptcha,
  StoredStatus,
  StoredStatusNames,
  type Tables,
  type UserCommitment,
  UserCommitmentRecord,
  UserCommitmentRecordSchema,
  UserCommitmentSchema,
  type UserSolutionRecord,
  UserSolutionRecordSchema,
} from "@prosopo/types-database";
import { type DeleteResult, ServerApiVersion } from "mongodb";
import mongoose, { type Connection, ObjectId } from "mongoose";

mongoose.set("strictQuery", false);

// mongodb://username:password@127.0.0.1:27017
const DEFAULT_ENDPOINT = "mongodb://127.0.0.1:27017";

/**
 * Returns the Database object through which Providers can put and get captchas
 * @param {string} url          The database endpoint
 * @param {string} dbname       The database name
 * @return {ProsopoDatabase}    Database layer
 */
export class ProsopoDatabase extends AsyncFactory implements Database {
  url: string;
  tables?: Tables;
  dbname: string;
  connection?: Connection;
  logger: Logger;

  constructor() {
    super();
    this.url = "";
    this.dbname = "";
    this.logger = getLoggerDefault();
  }

  public async init(
    url: string,
    dbname: string,
    logger: Logger,
    authSource?: string,
  ) {
    const baseEndpoint = url || DEFAULT_ENDPOINT;
    const parsedUrl = new URL(baseEndpoint);
    parsedUrl.pathname = dbname;
    if (authSource) {
      parsedUrl.searchParams.set("authSource", authSource);
    }
    this.url = parsedUrl.toString();
    this.dbname = dbname;
    this.logger = logger;
    return this;
  }

  getTables(): Tables {
    if (!this.tables) {
      throw new ProsopoDBError("DATABASE.TABLES_UNDEFINED", {
        context: { failedFuncName: this.getTables.name },
        logger: this.logger,
      });
    }
    return this.tables;
  }

  getConnection(): mongoose.Connection {
    if (!this.connection) {
      throw new ProsopoDBError("DATABASE.CONNECTION_UNDEFINED", {
        context: { failedFuncName: this.getConnection.name },
        logger: this.logger,
      });
    }
    return this.connection;
  }

  /**
   * @description Connect to the database and set the various tables
   */
  async connect(): Promise<void> {
    this.logger.info(
      `Mongo url: ${this.url.replace(/\w+:\w+/, "<Credentials>")}`,
    );

    this.connection = await new Promise((resolve, reject) => {
      const connection = mongoose.createConnection(this.url, {
        dbName: this.dbname,
        serverApi: ServerApiVersion.v1,
      });

      connection.on("open", () => {
        this.logger.info(`Database connection to ${this.url} opened`);
        resolve(connection);
      });

      connection.on("error", (err) => {
        this.logger.error(`Database error: ${err}`);
        reject(err);
      });

      connection.on("connected", () => {
        this.logger.info(`Database connected to ${this.url}`);
        resolve(connection);
      });

      connection.on("disconnected", () => {
        this.logger.info(`Database disconnected from ${this.url}`);
      });

      connection.on("reconnected", () => {
        this.logger.info(`Database reconnected to ${this.url}`);
        resolve(connection);
      });

      connection.on("reconnectFailed", () => {
        this.logger.error(`Database reconnect failed to ${this.url}`);
      });

      connection.on("close", () => {
        this.logger.info(`Database connection to ${this.url} closed`);
      });

      connection.on("fullsetup", () => {
        this.logger.info(`Database connection to ${this.url} is fully setup`);
        resolve(connection);
      });
    });

    this.tables = {
      captcha: this.connection.model("Captcha", CaptchaRecordSchema),
      powCaptcha: this.connection.model("PowCaptcha", PowCaptchaRecordSchema),
      dataset: this.connection.model("Dataset", DatasetRecordSchema),
      solution: this.connection.model("Solution", SolutionRecordSchema),
      commitment: this.connection.model(
        "UserCommitment",
        UserCommitmentRecordSchema,
      ),
      usersolution: this.connection.model(
        "UserSolution",
        UserSolutionRecordSchema,
      ),
      pending: this.connection.model("Pending", PendingRecordSchema),
      scheduler: this.connection.model("Scheduler", ScheduledTaskRecordSchema),
    };
  }

  /** Close connection to the database */
  async close(): Promise<void> {
    this.logger.debug(`Closing connection to ${this.url}`);
    await this.connection?.close();
  }

  /**
   * @description Load a dataset to the database
   * @param {Dataset}  dataset
   */
  async storeDataset(dataset: DatasetWithIdsAndTree): Promise<void> {
    try {
      this.logger.debug("Storing dataset in database");
      const parsedDataset = DatasetWithIdsAndTreeSchema.parse(dataset);
      const datasetDoc = {
        datasetId: parsedDataset.datasetId,
        datasetContentId: parsedDataset.datasetContentId,
        format: parsedDataset.format,
        contentTree: parsedDataset.contentTree,
        solutionTree: parsedDataset.solutionTree,
      };

      await this.tables?.dataset.updateOne(
        { datasetId: parsedDataset.datasetId },
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

      this.logger.debug("Inserting captcha records");
      // create a bulk upsert operation and execute
      if (captchaDocs.length) {
        await this.tables?.captcha.bulkWrite(
          captchaDocs.map((captchaDoc) => ({
            updateOne: {
              filter: { captchaId: captchaDoc.captchaId },
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

      this.logger.debug("Inserting solution records");
      // create a bulk upsert operation and execute
      if (captchaSolutionDocs.length) {
        await this.tables?.solution.bulkWrite(
          captchaSolutionDocs.map((captchaSolutionDoc) => ({
            updateOne: {
              filter: { captchaId: captchaSolutionDoc.captchaId },
              update: { $set: captchaSolutionDoc },
              upsert: true,
            },
          })),
        );
      }
      this.logger.debug("Dataset stored in database");
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
    const docs = await this.tables?.solution
      .find({ datasetId })
      .lean<SolutionRecord[]>();
    return docs ? docs : [];
  }

  /** @description Get a dataset from the database
   * @param {string} datasetId
   */
  async getDataset(datasetId: string): Promise<DatasetWithIds> {
    const datasetDoc: DatasetWithIds | null | undefined =
      await this.tables?.dataset.findOne({ datasetId: datasetId }).lean();

    if (datasetDoc) {
      const { datasetContentId, format, contentTree, solutionTree } =
        datasetDoc;

      const captchas: Captcha[] =
        (await this.tables?.captcha.find({ datasetId }).lean()) || [];

      const solutions: SolutionRecord[] =
        (await this.tables?.solution.find({ datasetId }).lean()) || [];

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
    const cursor = this.tables?.captcha.aggregate([
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
    const cursor = this.tables?.captcha
      .find({ captchaId: { $in: captchaId } })
      .lean();
    const docs = await cursor;

    if (docs?.length) {
      // drop the _id field
      return docs.map(({ _id, ...keepAttrs }) => keepAttrs) as Captcha[];
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
      await this.tables?.captcha.updateOne(
        { datasetId },
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
    await this.tables?.captcha.deleteMany({ captchaId: { $in: captchaIds } });
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

    const doc: DatasetBase | undefined | null = await this.tables?.dataset
      .findOne({ datasetId })
      .lean();

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
  async storeDappUserSolution(
    captchas: CaptchaSolution[],
    commit: UserCommitment,
  ): Promise<void> {
    const commitmentRecord = UserCommitmentSchema.parse({
      ...commit,
      lastUpdatedTimestamp: Date.now(),
    });
    if (captchas.length) {
      await this.tables?.commitment.updateOne(
        {
          id: commit.id,
        },
        commitmentRecord,
        { upsert: true },
      );

      const ops = captchas.map((captcha: CaptchaSolution) => ({
        updateOne: {
          filter: { commitmentId: commit.id, captchaId: captcha.captchaId },
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
    ipAddress: string,
    serverChecked: boolean = false,
    userSubmitted: boolean = false,
    storedStatus: StoredStatus = StoredStatusNames.notStored,
    userSignature?: string,
  ): Promise<void> {
    const tables = this.getTables();

    const powCaptchaRecord: PoWCaptchaStored = {
      challenge,
      ...components,
      ipAddress,
      result: { status: CaptchaStatus.pending },
      userSubmitted,
      serverChecked,
      difficulty,
      providerSignature,
      userSignature,
      lastUpdatedTimestamp: Date.now(),
    };

    try {
      await tables.powCaptcha.create(powCaptchaRecord);
      this.logger.info("PowCaptcha record added successfully", {
        challenge,
        userSubmitted,
        serverChecked,
        storedStatus,
      });
    } catch (error) {
      this.logger.error("Failed to add PowCaptcha record", {
        error,
        challenge,
        userSubmitted,
        serverChecked,
        storedStatus,
      });
      throw new ProsopoDBError("DATABASE.CAPTCHA_UPDATE_FAILED", {
        context: {
          error,
          challenge,
          userSubmitted,
          serverChecked,
          storedStatus,
        },
        logger: this.logger,
      });
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
      throw new ProsopoEnvError("DATABASE.DATABASE_UNDEFINED", {
        context: { failedFuncName: this.getPowCaptchaRecordByChallenge.name },
        logger: this.logger,
      });
    }

    try {
      const record: PoWCaptchaRecord | null | undefined =
        await this.tables.powCaptcha.findOne({ challenge }).lean();
      if (record) {
        this.logger.info("PowCaptcha record retrieved successfully", {
          challenge,
        });
        return record;
      }
      this.logger.info("No PowCaptcha record found", { challenge });
      return null;
    } catch (error) {
      this.logger.error("Failed to retrieve PowCaptcha record", {
        error,
        challenge,
      });
      throw new ProsopoDBError("DATABASE.CAPTCHA_GET_FAILED", {
        context: { error, challenge },
        logger: this.logger,
      });
    }
  }

  /**
   * @description Updates a PoW Captcha record in the database.
   * @param {string} challenge The challenge string of the captcha to be updated.
   * @param result
   * @param serverChecked
   * @param userSubmitted
   * @param storedStatus
   * @param userSignature
   * @returns {Promise<void>} A promise that resolves when the record is updated.
   */
  async updatePowCaptchaRecord(
    challenge: PoWChallengeId,
    result: CaptchaResult,
    serverChecked: boolean = false,
    userSubmitted: boolean = false,
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
      const updateResult = await tables.powCaptcha.updateOne(
        { challenge },
        {
          $set: update,
        },
      );
      if (updateResult.matchedCount === 0) {
        this.logger.info("No PowCaptcha record found to update", {
          challenge,
          ...update,
        });
        throw new ProsopoDBError("DATABASE.CAPTCHA_GET_FAILED", {
          context: {
            challenge,
            ...update,
          },
          logger: this.logger,
        });
      }
      this.logger.info("PowCaptcha record updated successfully", {
        challenge,
        ...update,
      });
    } catch (error) {
      this.logger.error("Failed to update PowCaptcha record", {
        error,
        challenge,
        ...update,
      });
      throw new ProsopoDBError("DATABASE.CAPTCHA_UPDATE_FAILED", {
        context: {
          error,
          challenge,
          ...update,
        },
        logger: this.logger,
      });
    }
  }

  /** @description Get processed Dapp User captcha solutions from the user solution table
   */
  async getProcessedDappUserSolutions(): Promise<UserSolutionRecord[]> {
    const docs = await this.tables?.usersolution
      .find({ processed: true })
      .lean<UserSolutionRecord[]>();
    return docs || [];
  }

  /** @description Get processed Dapp User image captcha commitments from the commitments table
   */
  async getProcessedDappUserCommitments(): Promise<UserCommitmentRecord[]> {
    const docs = await this.tables?.commitment
      .find({ processed: true })
      .lean<UserCommitmentRecord[]>();
    return docs || [];
  }

  /** @description Get serverChecked Dapp User image captcha commitments from the commitments table
   */
  async getCheckedDappUserCommitments(): Promise<UserCommitmentRecord[]> {
    const docs = await this.tables?.commitment
      .find({ [StoredStatusNames.serverChecked]: true })
      .lean<UserCommitmentRecord[]>();
    return docs || [];
  }

  /** @description Get Dapp User captcha commitments from the commitments table that have not been counted towards the
   * client's total
   */
  async getUnstoredDappUserCommitments(): Promise<UserCommitmentRecord[]> {
    const docs = await this.tables?.commitment
      .find({
        $or: [
          { storedStatus: { $ne: StoredStatusNames.stored } },
          { storedStatus: { $exists: false } },
        ],
      })
      .lean<UserCommitmentRecord[]>();
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

  /** @description Get Dapp User PoW captcha commitments that have not been counted towards the client's total
   */
  async getUnstoredDappUserPoWCommitments(): Promise<PoWCaptchaRecord[]> {
    const docs = await this.tables?.powCaptcha
      .find<PoWCaptchaRecord[]>({
        $or: [
          { storedStatus: { $ne: StoredStatusNames.stored } },
          { storedStatus: { $exists: false } },
        ],
      })
      .lean<PoWCaptchaRecord[]>();
    return docs || [];
  }

  /** @description Mark a list of PoW captcha commits as stored
   */
  async markDappUserPoWCommitmentsStored(challenges: string[]): Promise<void> {
    const updateDoc: Pick<StoredCaptcha, "storedAtTimestamp"> = {
      storedAtTimestamp: Date.now(),
    };

    await this.tables?.powCaptcha.updateMany(
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
    await this.tables?.powCaptcha.updateMany(
      { challenge: { $in: challenges } },
      {
        $set: updateDoc,
      },
      { upsert: false },
    );
  }

  /** @description Remove processed Dapp User captcha solutions from the user solution table
   */
  async removeProcessedDappUserSolutions(
    commitmentIds: string[],
  ): Promise<DeleteResult | undefined> {
    return await this.tables?.usersolution.deleteMany({
      processed: true,
      commitmentId: { $in: commitmentIds },
    });
  }

  /** @description Remove processed Dapp User captcha commitments from the user commitments table
   */
  async removeProcessedDappUserCommitments(
    commitmentIds: string[],
  ): Promise<DeleteResult | undefined> {
    return await this.tables?.commitment.deleteMany({
      processed: true,
      id: { $in: commitmentIds },
    });
  }

  /**
   * @description Store a Dapp User's pending record
   */
  async storeDappUserPending(
    userAccount: string,
    requestHash: string,
    salt: string,
    deadlineTimestamp: number,
    requestedAtTimestamp: number,
    ipAddress: string,
  ): Promise<void> {
    if (!isHex(requestHash)) {
      throw new ProsopoDBError("DATABASE.INVALID_HASH", {
        context: {
          failedFuncName: this.storeDappUserPending.name,
          requestHash,
        },
      });
    }
    const pendingRecord = {
      accountId: userAccount,
      pending: true,
      salt,
      requestHash,
      deadlineTimestamp,
      requestedAtTimestamp,
      ipAddress,
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
  async getDappUserPending(
    requestHash: string,
  ): Promise<PendingCaptchaRequest> {
    if (!isHex(requestHash)) {
      throw new ProsopoEnvError("DATABASE.INVALID_HASH", {
        context: { failedFuncName: this.getDappUserPending.name, requestHash },
      });
    }

    const doc: PendingCaptchaRequest | null | undefined =
      await this.tables?.pending.findOne({ requestHash: requestHash }).lean();

    if (doc) {
      return doc;
    }

    throw new ProsopoEnvError("DATABASE.PENDING_RECORD_NOT_FOUND", {
      context: { failedFuncName: this.getDappUserPending.name, requestHash },
    });
  }

  /**
   * @description Mark a pending request as used
   */
  async updateDappUserPendingStatus(requestHash: string): Promise<void> {
    if (!isHex(requestHash)) {
      throw new ProsopoEnvError("DATABASE.INVALID_HASH", {
        context: {
          failedFuncName: this.updateDappUserPendingStatus.name,
          requestHash,
        },
      });
    }

    await this.tables?.pending.updateOne(
      { requestHash: requestHash },
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
    const cursor = this.tables?.captcha
      .find({
        datasetId,
        solved: state === CaptchaStates.Solved,
      })
      .lean();
    const docs = await cursor;

    if (docs) {
      // drop the _id field
      return docs.map(({ _id, ...keepAttrs }) => keepAttrs) as Captcha[];
    }

    throw new ProsopoEnvError("DATABASE.CAPTCHA_GET_FAILED");
  }

  /**
   * @description Get all dapp user solutions by captchaIds
   */
  async getAllDappUserSolutions(
    captchaId: string[],
  ): Promise<UserSolutionRecord[] | undefined> {
    const cursor = this.tables?.usersolution
      ?.find({ captchaId: { $in: captchaId } })
      .lean();
    const docs = await cursor;

    if (docs) {
      // drop the _id field
      return docs.map(
        ({ _id, ...keepAttrs }) => keepAttrs,
      ) as UserSolutionRecord[];
    }

    throw new ProsopoEnvError("DATABASE.SOLUTION_GET_FAILED");
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
   * @param {string[]} commitmentId
   */
  async getDappUserSolutionById(
    commitmentId: string,
  ): Promise<UserSolutionRecord | undefined> {
    const cursor = this.tables?.usersolution
      ?.findOne(
        {
          commitmentId: commitmentId,
        },
        { projection: { _id: 0 } },
      )
      .lean();
    const doc = await cursor;

    if (doc) {
      return doc as unknown as UserSolutionRecord;
    }

    throw new ProsopoDBError("DATABASE.SOLUTION_GET_FAILED", {
      context: { failedFuncName: this.getCaptchaById.name, commitmentId },
    });
  }

  /**
   * @description Get dapp user commitment by user account
   * @param commitmentId
   */
  async getDappUserCommitmentById(
    commitmentId: string,
  ): Promise<UserCommitment | undefined> {
    const commitmentCursor = this.tables?.commitment
      ?.findOne({ id: commitmentId })
      .lean<UserCommitment>();

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
    const docs: UserCommitmentRecord[] | null | undefined =
      await this.tables?.commitment
        // sort by most recent first to avoid old solutions being used in development
        ?.find({ userAccount, dappAccount }, { _id: 0 }, { sort: { _id: -1 } })
        .lean();

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
      await this.tables?.commitment
        ?.findOneAndUpdate(
          { id: commitmentId },
          { $set: updateDoc },
          { upsert: false },
        )
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

      await this.tables?.commitment
        ?.findOneAndUpdate(
          { id: commitmentId },
          { $set: updateDoc },
          { upsert: false },
        )
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
    const cursor: ScheduledTaskRecord | undefined | null =
      await this.tables?.scheduler
        ?.findOne({ taskId: taskId, status: status })
        .lean();
    return cursor ? cursor : undefined;
  }

  /**
   * @description Get the most recent scheduled task status record for a given task
   */
  async getLastScheduledTaskStatus(
    task: ScheduledTaskNames,
    status?: ScheduledTaskStatus,
  ): Promise<ScheduledTaskRecord | undefined> {
    const lookup: {
      processName: ScheduledTaskNames;
      status?: ScheduledTaskStatus;
    } = { processName: task };
    if (status) {
      lookup.status = status;
    }
    const cursor: ScheduledTaskRecord | undefined | null =
      await this.tables?.scheduler
        ?.findOne(lookup)
        .sort({ datetime: -1 })
        .lean();
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
    await this.tables?.scheduler.updateOne(
      { _id: taskId },
      { $set: update },
      {
        upsert: false,
      },
    );
  }
}

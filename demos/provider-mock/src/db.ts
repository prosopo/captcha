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

import { type Logger, ProsopoDBError } from "@prosopo/common";
import { MongoDatabase } from "@prosopo/database";
import type { Tables } from "@prosopo/types-database";
import type mongoose from "mongoose";
import { Schema } from "mongoose";

enum TableNames {
	ja4 = "ja4",
}

type JA4Data = {
	application?: string;
	library?: string;
	device?: string;
	os?: string;
	user_agent_string: string;
	certificate_authority?: string;
	observation_count?: number;
	verified?: boolean;
	notes?: string;
	ja4_fingerprint: string;
	ja4_fingerprint_string?: string;
	ja4s_fingerprint?: string;
	ja4h_fingerprint?: string;
	ja4x_fingerprint?: string;
	ja4t_fingerprint?: string;
	ja4ts_fingerprint?: string;
	ja4tscan_fingerprint?: string;
};

type JA4Record = JA4Data & mongoose.Document;

const JA4Schema = new Schema({
	application: String,
	library: String,
	device: String,
	os: String,
	user_agent_string: String,
	certificate_authority: String,
	observation_count: { type: Number, default: 1 },
	verified: { type: Boolean, default: false },
	notes: { type: String, default: "" },
	ja4_fingerprint: { type: String, required: true, unique: true },
	ja4_fingerprint_string: String,
	ja4s_fingerprint: String,
	ja4h_fingerprint: String,
	ja4x_fingerprint: String,
	ja4t_fingerprint: String,
	ja4ts_fingerprint: String,
	ja4tscan_fingerprint: String,
});

const DATA_TABLES = [
	{
		collectionName: TableNames.ja4,
		modelName: TableNames.ja4,
		schema: JA4Schema,
	},
];

export class JA4Database extends MongoDatabase {
	tables: Tables<TableNames>;

	constructor(
		url: string,
		dbname?: string,
		authSource?: string,
		logger?: Logger,
	) {
		super(url, dbname, authSource, logger);
		this.tables = {} as Tables<TableNames>;
	}

	override async connect(): Promise<void> {
		await super.connect();
		DATA_TABLES.map(({ collectionName, modelName, schema }) => {
			if (this.connection) {
				this.tables[collectionName] = this.connection.model(modelName, schema);
			}
		});
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

	async getJA4Records(): Promise<JA4Record[]> {
		const ja4Records = await this.tables.ja4.find<JA4Record>({});
		return ja4Records;
	}

	async getJA4RecordByFingerprint(
		ja4Fingerprint: string,
	): Promise<JA4Record | null> {
		const ja4Record = await this.tables.ja4.findOne<JA4Record>({
			ja4_fingerprint: ja4Fingerprint,
		});
		return ja4Record;
	}

	// add a ja4 record or update an existing one if the user agent string and ja4 fingerprint match, incrementing the observation count

	async addOrUpdateJA4Record(ja4Record: JA4Data): Promise<JA4Record | null> {
		const existingRecord = await this.getJA4RecordByFingerprint(
			ja4Record.ja4_fingerprint,
		);
		if (existingRecord) {
			existingRecord.observation_count =
				(existingRecord.observation_count || 0) + 1;
			await existingRecord.save();
			return existingRecord;
		}
		const newRecord = new this.tables.ja4(ja4Record);
		await newRecord.save();
		return newRecord;
	}
}

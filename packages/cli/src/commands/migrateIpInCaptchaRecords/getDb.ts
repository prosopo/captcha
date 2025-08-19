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

import type { Logger } from "@prosopo/common";
import { ProviderEnvironment } from "@prosopo/env";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import type { Db } from "mongodb";
import mongoose from "mongoose";

export const getDb = async (
	pair: KeyringPair,
	config: ProsopoConfigOutput,
	uri: string,
	logger: Logger,
): Promise<Db> => {
	let db: Db | undefined;

	if (uri) {
		logger.info(() => ({
			msg: "Using DB connection from the URI",
			data: {
				uri: uri,
			},
		}));

		db = await getByUri(uri);
	} else {
		logger.info(() => ({
			msg: "Using DB connection from the config",
		}));

		db = await getByConfig(pair, config);
	}

	if (db) {
		return db;
	}

	throw new Error("Db connection cannot be established");
};

const getByUri = async (uri: string): Promise<Db | undefined> => {
	await mongoose.connect(uri);

	return mongoose.connection.db;
};

const getByConfig = async (
	pair: KeyringPair,
	config: ProsopoConfigOutput,
): Promise<Db | undefined> => {
	const env = new ProviderEnvironment(config, pair);

	await env.isReady();

	return env.db?.getConnection()?.db;
};

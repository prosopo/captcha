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

import type {
	Connection,
	Model,
	Schema,
	SchemaDefinition,
	SchemaOptions,
} from "mongoose";
import { Schema as MongooseSchema } from "mongoose";
import { applyStandardMiddleware } from "./middleware.js";

/**
 * Creates a mongoose schema with standard middleware applied
 * @param definition Schema definition
 * @param options Schema options
 * @returns Schema with middleware applied
 */
export function createSchemaWithMiddleware<T = unknown>(
	definition?: SchemaDefinition<T>,
	options?: SchemaOptions,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Schema<T, any, any, any> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const schema = new MongooseSchema<T, any, any, any>(definition as any, options as any);
	applyStandardMiddleware(schema);
	return schema;
}

// Cache to store models by connection and model name
const modelCache = new WeakMap<Connection, Map<string, Model<unknown>>>();

/**
 * Creates or retrieves a cached model on a connection
 * This allows .model() to be called multiple times without error
 * @param connection The mongoose connection
 * @param modelName The name of the model
 * @param schema The mongoose schema
 * @returns The model
 */
export function getOrCreateModel<T>(
	connection: Connection,
	modelName: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	schema: Schema<T, any, any, any>,
): Model<T> {
	// Get or create the cache for this connection
	let connectionCache = modelCache.get(connection);
	if (!connectionCache) {
		connectionCache = new Map<string, Model<unknown>>();
		modelCache.set(connection, connectionCache);
	}

	// Check if model already exists in cache
	const cachedModel = connectionCache.get(modelName);
	if (cachedModel) {
		return cachedModel as Model<T>;
	}

	// Check if model exists on the connection (mongoose internal cache)
	if (connection.models[modelName]) {
		const existingModel = connection.models[modelName] as Model<T>;
		connectionCache.set(modelName, existingModel as Model<unknown>);
		return existingModel;
	}

	// Create new model
	const model = connection.model<T>(modelName, schema);
	connectionCache.set(modelName, model as Model<unknown>);
	return model;
}

/**
 * Creates a mongoose schema with standard middleware and returns a model creation function
 * @param definition Schema definition
 * @param options Schema options
 * @returns Function to create models with the schema
 */
export function createSchemaBuilder<T>(
	definition?: SchemaDefinition<T>,
	options?: SchemaOptions,
) {
	const schema = createSchemaWithMiddleware<T>(definition, options);

	return {
		schema,
		/**
		 * Creates or retrieves a model on the specified connection
		 * @param connection The mongoose connection
		 * @param modelName The name of the model
		 * @returns The model
		 */
		createModel: (connection: Connection, modelName: string): Model<T> => {
			return getOrCreateModel(connection, modelName, schema);
		},
	};
}

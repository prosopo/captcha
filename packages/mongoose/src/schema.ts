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
import { standardMiddlewarePlugin } from "./middleware.js";

/**
 * Creates a new mongoose schema with standard middleware plugin applied
 * This is the recommended way to create schemas to ensure middleware is applied consistently
 * @param definition Schema definition
 * @param options Schema options (timestamps will be set to true if not explicitly provided)
 * @returns Schema with middleware applied via plugin
 */
export function newSchema<T = unknown>(
	definition?: SchemaDefinition<T>,
	options?: SchemaOptions,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Schema<T, any, any, any> {
	// Merge options with timestamps enabled by default
	const schemaOptions: SchemaOptions = {
		...options,
		timestamps: options?.timestamps !== undefined ? options.timestamps : true,
	};
	
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const schema = new MongooseSchema<T, any, any, any>(definition as any, schemaOptions as any);
	// Apply standard middleware via plugin
	schema.plugin(standardMiddlewarePlugin);
	return schema;
}

/**
 * Creates a mongoose schema with standard middleware applied
 * @deprecated Use newSchema instead
 * @param definition Schema definition
 * @param options Schema options
 * @returns Schema with middleware applied
 */
export function createSchemaWithMiddleware<T = unknown>(
	definition?: SchemaDefinition<T>,
	options?: SchemaOptions,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Schema<T, any, any, any> {
	return newSchema<T>(definition, options);
}

/**
 * Creates or retrieves a model on a connection
 * Uses mongoose's overwriteModels setting to allow multiple .model() calls
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
	// Enable overwriteModels to allow redefining models without errors
	connection.set("overwriteModels", true);
	
	// Simply call model - mongoose will handle caching/overwriting
	return connection.model<T>(modelName, schema);
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
	const schema = newSchema<T>(definition, options);

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

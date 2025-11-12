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

import type { Connection, Model, Query, Schema, SchemaDefinition } from "mongoose";
import { Schema as MongooseSchema } from "mongoose";
import { z } from "zod";
import { standardMiddlewarePlugin } from "./middleware.js";
import { getOrCreateModel } from "./schema.js";

/**
 * Converts a Zod schema to a Mongoose schema definition
 * Note: This is a basic implementation that handles common types
 * More complex types may need manual mapping
 * @param zodSchema The Zod schema to convert
 * @returns Mongoose schema definition
 */
export function zodToMongooseSchema<T extends z.ZodRawShape>(
	zodSchema: z.ZodObject<T>,
): SchemaDefinition {
	const shape = zodSchema.shape;
	const mongooseSchema: SchemaDefinition = {};

	for (const [key, value] of Object.entries(shape)) {
		mongooseSchema[key] = zodTypeToMongooseType(
			value as z.ZodTypeAny,
		) as SchemaDefinition[string];
	}

	return mongooseSchema;
}

/**
 * Maps a Zod type to a Mongoose type
 * @param zodType The Zod type
 * @returns Mongoose type definition
 */
function zodTypeToMongooseType(
	zodType: z.ZodTypeAny,
): Record<string, unknown> {
	// Handle optional and nullable types
	if (zodType instanceof z.ZodOptional) {
		const innerType = zodTypeToMongooseType(zodType.unwrap());
		return {
			...innerType,
			required: false,
		};
	}

	if (zodType instanceof z.ZodNullable) {
		const innerType = zodTypeToMongooseType(zodType.unwrap());
		return {
			...innerType,
			required: false,
		};
	}

	if (zodType instanceof z.ZodDefault) {
		const innerType = zodTypeToMongooseType(zodType.removeDefault());
		return {
			...innerType,
			default: zodType._def.defaultValue(),
		};
	}

	// Handle primitive types
	if (zodType instanceof z.ZodString) {
		return { type: String, required: true };
	}

	if (zodType instanceof z.ZodNumber) {
		return { type: Number, required: true };
	}

	if (zodType instanceof z.ZodBoolean) {
		return { type: Boolean, required: true };
	}

	if (zodType instanceof z.ZodDate) {
		return { type: Date, required: true };
	}

	if (zodType instanceof z.ZodBigInt) {
		// MongoDB doesn't natively support BigInt, use String
		return { type: String, required: true };
	}

	// Handle arrays
	if (zodType instanceof z.ZodArray) {
		const elementType = zodTypeToMongooseType(zodType.element);
		return { type: [elementType], required: true };
	}

	// Handle objects (nested schemas)
	if (zodType instanceof z.ZodObject) {
		return { type: zodToMongooseSchema(zodType), required: true };
	}

	// Handle enums
	if (zodType instanceof z.ZodEnum) {
		return { type: String, enum: zodType.options, required: true };
	}

	if (zodType instanceof z.ZodNativeEnum) {
		return { type: String, enum: Object.values(zodType.enum), required: true };
	}

	// Handle unions (limited support - converts to Mixed)
	if (zodType instanceof z.ZodUnion) {
		return { type: Object, required: true };
	}

	// Handle any
	if (zodType instanceof z.ZodAny) {
		return { type: Object, required: true };
	}

	// Default to Mixed for unknown types
	return { type: Object, required: true };
}

/**
 * Creates a Mongoose model from a Zod schema with validation middleware
 * @param connection The mongoose connection
 * @param modelName The name of the model
 * @param zodSchema The Zod schema
 * @param mongooseSchema Optional pre-built mongoose schema (if you need custom mapping)
 * @returns The model with Zod validation applied
 */
export function createModelFromZodSchema<T extends z.ZodRawShape>(
	connection: Connection,
	modelName: string,
	zodSchema: z.ZodObject<T>,
	mongooseSchema?: Schema,
): Model<z.infer<typeof zodSchema>> {
	// Use provided schema or convert from Zod with timestamps enabled
	const schema =
		mongooseSchema ||
		new MongooseSchema(zodToMongooseSchema(zodSchema), { timestamps: true });

	// Apply standard middleware via plugin (timestamps, version increment)
	schema.plugin(standardMiddlewarePlugin);

	// Add pre-save validation using Zod
	schema.pre("save", async function (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this: any,
		next: (err?: Error) => void,
	) {
		try {
			await zodSchema.parseAsync(this.toObject());
			next();
		} catch (err) {
			if (err instanceof z.ZodError) {
				next(new Error(`Validation failed: ${JSON.stringify(err.format())}`));
			} else {
				next(err as Error);
			}
		}
	});

	// Add pre-validation for update operations
	const updateMethods = [
		"updateOne",
		"updateMany",
		"findOneAndUpdate",
		"findByIdAndUpdate",
	] as const;

	for (const method of updateMethods) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		schema.pre(
			method as any,
			async function (
				this: Query<unknown, unknown>,
				next: (err?: Error) => void,
			) {
				try {
					const update = this.getUpdate();
					if (update && typeof update === "object") {
						// Extract the actual update data (handle $set, etc.)
						const updateData =
							"$set" in update
								? (update.$set as Record<string, unknown>)
								: (update as Record<string, unknown>);

						// Partial validation for updates (allow optional fields)
						const partialSchema = zodSchema.partial();
						await partialSchema.parseAsync(updateData);
					}
					next();
				} catch (err) {
					if (err instanceof z.ZodError) {
						next(new Error(`Update validation failed: ${JSON.stringify(err.format())}`));
					} else {
						next(err as Error);
					}
				}
			},
		);
	}

	// Add post-find validation (optional, can be expensive)
	// Uncomment if you want to validate data coming out of the database
	/*
	schema.post(['find', 'findOne', 'findById'], async function(docs: unknown) {
		if (!docs) return;
		const docArray = Array.isArray(docs) ? docs : [docs];
		for (const doc of docArray) {
			try {
				await zodSchema.parseAsync(doc);
			} catch (error) {
				console.warn('Document validation failed:', error);
			}
		}
	});
	*/

	// Use the model cache to allow multiple calls
	return getOrCreateModel(connection, modelName, schema);
}

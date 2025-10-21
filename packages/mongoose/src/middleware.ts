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

import type { Query, Schema } from "mongoose";

interface TimestampedDocument {
	createdAt?: Date;
	updatedAt?: Date;
}

/**
 * Adds standard middleware to a mongoose schema:
 * - Increments __v on all mutating operations
 * - Sets createdAt only on creation
 * - Updates updatedAt on all mutations
 * @param schema The mongoose schema to add middleware to
 */
export function applyStandardMiddleware<T>(schema: Schema<T>): void {
	// Add timestamps if they don't already exist
	if (!schema.path("createdAt")) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		schema.add({ createdAt: { type: Date } } as any);
	}
	if (!schema.path("updatedAt")) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		schema.add({ updatedAt: { type: Date } } as any);
	}

	// Pre-save middleware for new documents
	schema.pre("save", function (next) {
		const now = new Date();
		const doc = this as unknown as TimestampedDocument;
		doc.updatedAt = now;

		// Only set createdAt if this is a new document
		if (this.isNew && !doc.createdAt) {
			doc.createdAt = now;
		}

		next();
	});

	// Middleware for update operations
	const updateMethods = [
		"updateOne",
		"updateMany",
		"findOneAndUpdate",
		"findByIdAndUpdate",
	] as const;

	for (const method of updateMethods) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		schema.pre(method as any, function (this: Query<unknown, unknown>, next: (err?: Error) => void) {
			const update = this.getUpdate();

			// Increment __v
			if (update && typeof update === "object") {
				// Handle both $set and direct updates
				if ("$set" in update) {
					(update.$set as Record<string, unknown>).updatedAt = new Date();
					// Prevent createdAt from being overwritten
					delete (update.$set as Record<string, unknown>).createdAt;
				} else if (!("$setOnInsert" in update)) {
					(update as Record<string, unknown>).updatedAt = new Date();
					// Prevent createdAt from being overwritten
					delete (update as Record<string, unknown>).createdAt;
				}

				// Increment version
				if ("$inc" in update) {
					(update.$inc as Record<string, number>).__v =
						((update.$inc as Record<string, number>).__v || 0) + 1;
				} else {
					(update as Record<string, unknown>).$inc = { __v: 1 };
				}
			}

			next();
		});
	}

	// Middleware for replaceOne
	schema.pre("replaceOne", function (this: Query<unknown, unknown>, next) {
		const replacement = this.getUpdate();

		if (replacement && typeof replacement === "object") {
			(replacement as Record<string, unknown>).updatedAt = new Date();
			// Don't overwrite createdAt
			if (!this.getOptions().upsert) {
				delete (replacement as Record<string, unknown>).createdAt;
			}
		}

		next();
	});

	// Middleware for insertMany - only set createdAt, not updatedAt
	schema.pre("insertMany", function (next, docs: unknown[]) {
		const now = new Date();
		for (const doc of docs) {
			if (doc && typeof doc === "object") {
				const docObj = doc as Record<string, unknown>;
				if (!docObj.createdAt) {
					docObj.createdAt = now;
				}
				if (!docObj.updatedAt) {
					docObj.updatedAt = now;
				}
			}
		}
		next();
	});
}

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

import mongoose from "mongoose";
import { z } from "zod";
import {
	type UserAttributes,
	type UserAttributesRecord,
	userAttributesMongooseSchema,
	userAttributesSchema,
} from "./userAttributes.js";
import {
	type UserIp,
	type UserIpRecord,
	userIpMongooseSchema,
	userIpSchema,
} from "./userIp.js";

export type UserScope = UserAttributes & UserIp;

export type UserScopeRecord = UserAttributesRecord & UserIpRecord;

export const userScopeSchema = z
	.object({})
	.and(userAttributesSchema)
	.and(userIpSchema)
	.transform(
		// transform is used for type safety only - plain "satisfies ZodType<x>" doesn't work after ".and()"
		(userScopeInput): UserScope & UserScopeRecord => userScopeInput,
	);

export const userScopeMongooseSchema = new mongoose.Schema<UserScopeRecord>({
	...userAttributesMongooseSchema.obj,
	...userIpMongooseSchema.obj,
});

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

import { Schema } from "mongoose";
import type { Rule } from "../../rule/rule.js";
import { configMongooseSchema } from "./config/configMongooseSchema.js";
import { ipMongooseSchema } from "./ip/ipMongooseSchema.js";

const ruleMongooseSchema = new Schema<Rule>({
	isUserBlocked: { type: Boolean, required: true },
	clientId: { type: String, required: false },
	description: { type: String, required: false },
	userIp: {
		type: ipMongooseSchema,
		required: [
			function () {
				return !this.userId && !this.ja4;
			},
			"userIp is required when userId is not set and ja4 is not set",
		],
	},
	userId: {
		type: String,
		required: [
			function () {
				return !this.userIp && !this.ja4;
			},
			"userId is required when userIp is not set and ja4 is not set",
		],
	},
	ja4: {
		type: String,
		required: [
			function () {
				return !this.userIp && !this.userId;
			},
			"ja4 is required when userIp is not set and userId is not set",
		],
	},
	config: {
		type: configMongooseSchema,
		required: false,
	},
	score: { type: Number, required: false },
});

export { ruleMongooseSchema };

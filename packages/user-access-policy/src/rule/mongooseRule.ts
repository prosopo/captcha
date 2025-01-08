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
import { Schema } from "mongoose";
import { mongooseConfig } from "../config/mongooseConfig.js";
import { mongooseIp } from "../ip/mongooseIp.js";
import type { Rule } from "./rule.js";

const mongooseRule = new Schema<Rule>({
	isUserBlocked: { type: Boolean, required: true },
	clientId: { type: String, required: false },
	description: { type: String, required: false },
	userIp: {
		type: mongooseIp,
		required: [
			function () {
				const isUserIdUnset = "string" !== typeof this.userId;

				return isUserIdUnset;
			},
			"userIp is required when userId is not set",
		],
	},
	userId: {
		type: String,
		required: [
			function () {
				const isUserIpUnset =
					"object" !== typeof this.userIp || null === this.userIp;

				return isUserIpUnset;
			},
			"userId is required when userIp is not set",
		],
	},
	config: {
		type: mongooseConfig,
		required: false,
	},
});

export { mongooseRule };

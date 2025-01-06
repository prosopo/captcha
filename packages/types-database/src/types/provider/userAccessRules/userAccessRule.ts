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
import { Schema, type Types } from "mongoose";
import {
	type UserAccessRuleConfig,
	userAccessRuleConfigRecordSchema,
} from "./userAccessRuleConfig.js";
import { type UserIp, userIpRecordSchema } from "./userIp/userIp.js";

interface UserAccessRule {
	isUserBlocked: boolean;
	clientId?: string;
	description?: string;
	userIp?: UserIp;
	userId?: string;
	config?: UserAccessRuleConfig;
}

interface UserAccessRuleRecord extends UserAccessRule {
	_id: Types.ObjectId;
}

const userAccessRuleSchema = new Schema<UserAccessRule>({
	isUserBlocked: { type: Boolean, required: true },
	clientId: { type: String, required: false },
	description: { type: String, required: false },
	userIp: {
		type: userIpRecordSchema,
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
		type: userAccessRuleConfigRecordSchema,
		required: false,
	},
});

export { type UserAccessRule, type UserAccessRuleRecord, userAccessRuleSchema };

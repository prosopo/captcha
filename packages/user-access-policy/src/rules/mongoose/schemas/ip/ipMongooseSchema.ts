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
import type { RuleIp } from "../../../rule/ip/ruleIp.js";
import { ipV4MongooseSchema } from "./v4/ipV4MongooseSchema.js";
import { ipV6MongooseSchema } from "./v6/ipV6MongooseSchema.js";

const ipMongooseSchema = new Schema<RuleIp>(
	{
		v4: {
			type: ipV4MongooseSchema,
			required: [
				function () {
					return !this.v6;
				},
				"v4 is required when v6 is not set",
			],
		},
		v6: {
			type: ipV6MongooseSchema,
			required: [
				function () {
					return !this.v4;
				},
				"v6 is required when v4 is not set",
			],
		},
	},
	{ _id: false },
);

export { ipMongooseSchema };

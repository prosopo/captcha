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
import type { RuleIpV6 } from "../../../../rule/ip/v6/ruleIpV6.js";
import { RULE_IPV6_NUMERIC_MAX_LENGTH } from "../../../../rule/ip/v6/ruleIpV6NumericMaxLength.js";
import { ipV6MaskMongooseSchema } from "./ipV6MaskMongooseSchema.js";

const ipV6MongooseSchema = new Schema<RuleIpV6>(
	{
		// 1. Type choice note:
		/**
		 * ipV6 takes 128bits (38 digits), so we can't use Mongo's Long (Int64), and can't even Decimal128,
		 * cause it supports only 34 digits https://www.mongodb.com/docs/manual/reference/bson-types/
		 */
		// 2. String comparison note
		/**
		 * Mongo compares strings by unicode codes of each letter, so it works for us,
		 * as long we make sure both strings have the exact same length:
		 * so '10' and '02', never '10' and '2'.
		 */
		asNumericString: {
			type: String,
			required: true,
			// we must have the exact same string length to guarantee the right comparison.
			set: (value: string): string =>
				value.padStart(RULE_IPV6_NUMERIC_MAX_LENGTH, "0"),
		},
		asString: { type: String, required: true },
		mask: {
			type: ipV6MaskMongooseSchema,
			required: false,
		},
	},
	{ _id: false },
);

export { ipV6MongooseSchema };

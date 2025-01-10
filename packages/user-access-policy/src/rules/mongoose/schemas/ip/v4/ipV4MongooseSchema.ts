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
import type {RuleIpV4} from "@rules/rule/ip/v4/ruleIpV4.js";
import {ipV4MaskMongooseSchema} from "@rules/mongoose/schemas/ip/v4/ipV4MaskMongooseSchema.js";

const ipV4MongooseSchema = new Schema<RuleIpV4>(
	{
		// Type choice note: Int32 can't store 10 digits of the numeric presentation of ipV4,
		// so we use BigInt, which is supported by Mongoose and turned into Mongo's Long (Int64)
		asNumeric: { type: BigInt, required: true },
		asString: { type: String, required: true },
		mask: {
			type: ipV4MaskMongooseSchema,
			required: false,
		},
	},
	{ _id: false },
);

export { ipV4MongooseSchema };

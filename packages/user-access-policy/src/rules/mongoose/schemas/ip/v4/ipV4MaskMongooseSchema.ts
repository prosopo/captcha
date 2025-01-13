import type { RuleIpV4Mask } from "@rules/rule/ip/v4/mask/ruleIpV4Mask.js";
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

const ipV4MaskMongooseSchema = new Schema<RuleIpV4Mask>(
	{
		// Type choice note: Int32 can't store 10 digits of the numeric presentation of ipV4,
		// so we use BigInt, which is supported by Mongoose and turned into Mongo's Long (Int64)
		rangeMinAsNumeric: { type: BigInt, required: true },
		rangeMaxAsNumeric: { type: BigInt, required: true },
		asNumeric: { type: Number, required: true },
	},
	{ _id: false },
);

export { ipV4MaskMongooseSchema };

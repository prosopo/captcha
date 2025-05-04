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
import type { RuleConfig } from "../../../rule/config/ruleConfig.js";
import { imageCaptchaConfigMongooseSchema } from "./imageCaptchaConfigMongooseSchema.js";

const configMongooseSchema: Schema<RuleConfig> = new Schema<RuleConfig>(
	{
		image: {
			type: imageCaptchaConfigMongooseSchema,
			required: false,
		},
	},
	{ _id: false },
);

export { configMongooseSchema };

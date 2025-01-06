import type { UserAccessRule } from "@prosopo/types-database";
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
import type { Schema } from "mongoose";
import type { AccessRuleDbIndexes } from "../../accessRuleDbIndexes.js";

class IpV6MaskUniqueIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.globalIpMask(schema);
		this.ipMaskPerClient(schema);
	}

	protected globalIpMask(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v6.asNumericString": 1,
				"userIp.v6.mask.asNumeric": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientId: null,
					"userIp.v6.asNumericString": { $exists: true },
					"userIp.v6.mask.asNumeric": { $exists: true },
				},
			},
		);
	}

	protected ipMaskPerClient(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				clientId: 1,
				"userIp.v6.asNumericString": 1,
				"userIp.v6.mask.asNumeric": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientId: { $exists: true },
					"userIp.v6.asNumericString": { $exists: true },
					"userIp.v6.mask.asNumeric": { $exists: true },
				},
			},
		);
	}
}

const ipV6MaskUniqueIndexes = new IpV6MaskUniqueIndexes();

export { ipV6MaskUniqueIndexes };

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

import type { MongooseIndex } from "./mongooseIndex.js";

const globalIpIndexes: MongooseIndex[] = [
	{
		definition: {
			"userIp.v4.asNumeric": 1,
		},
		options: {
			name: "globalIpV4",
			unique: true,
			partialFilterExpression: {
				clientId: null,
				"userIp.v4.asNumeric": { $exists: true },
				"userIp.v4.mask.asNumeric": null,
			},
		},
	},
	{
		definition: {
			"userIp.v6.asNumericString": 1,
		},
		options: {
			name: "globalIpV6",
			unique: true,
			partialFilterExpression: {
				clientId: null,
				"userIp.v6.asNumericString": { $exists: true },
				"userIp.v6.mask.asNumeric": null,
			},
		},
	},
];

const globalIpMaskIndexes: MongooseIndex[] = [
	{
		definition: {
			"userIp.v4.asNumeric": 1,
			"userIp.v4.mask.asNumeric": 1,
		},
		options: {
			name: "globalIpMaskV4",
			unique: true,
			partialFilterExpression: {
				clientId: null,
				"userIp.v4.asNumeric": { $exists: true },
				"userIp.v4.mask.asNumeric": { $exists: true },
			},
		},
	},
	{
		definition: {
			"userIp.v6.asNumericString": 1,
			"userIp.v6.mask.asNumeric": 1,
		},
		options: {
			name: "globalIpMaskV6",
			unique: true,
			partialFilterExpression: {
				clientId: null,
				"userIp.v6.asNumericString": { $exists: true },
				"userIp.v6.mask.asNumeric": { $exists: true },
			},
		},
	},
];

const ipPerClientIndexes: MongooseIndex[] = [
	{
		definition: {
			clientId: 1,
			"userIp.v4.asNumeric": 1,
		},
		options: {
			name: "clientIpV4",
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: true },
				"userIp.v4.asNumeric": { $exists: true },
				"userIp.v4.mask.asNumeric": null,
			},
		},
	},
	{
		definition: {
			clientId: 1,
			"userIp.v6.asNumericString": 1,
		},
		options: {
			name: "clientIpV6",
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: true },
				"userIp.v6.asNumericString": { $exists: true },
				"userIp.v6.mask.asNumeric": null,
			},
		},
	},
];

const ipMaskPerClientIndexes: MongooseIndex[] = [
	{
		definition: {
			clientId: 1,
			"userIp.v4.asNumeric": 1,
			"userIp.v4.mask.asNumeric": 1,
		},
		options: {
			name: "clientIpV4Mask",
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: true },
				"userIp.v4.asNumeric": { $exists: true },
				"userIp.v4.mask.asNumeric": { $exists: true },
			},
		},
	},
	{
		definition: {
			clientId: 1,
			"userIp.v6.asNumericString": 1,
			"userIp.v6.mask.asNumeric": 1,
		},
		options: {
			name: "clientIpV6Mask",
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: true },
				"userIp.v6.asNumericString": { $exists: true },
				"userIp.v6.mask.asNumeric": { $exists: true },
			},
		},
	},
];

const ruleUniqueMongooseIndexes = [
	...globalIpIndexes,
	...globalIpMaskIndexes,
	...ipMaskPerClientIndexes,
	...ipPerClientIndexes,
];

export { ruleUniqueMongooseIndexes };

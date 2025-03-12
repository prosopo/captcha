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

const userIpIndexes: MongooseIndex[] = [
	{
		definition: {
			"userIp.v4.asNumeric": 1,
		},
		options: {
			partialFilterExpression: {
				"userIp.v4.asNumeric": { $exists: true },
			},
		},
	},
	{
		definition: {
			"userIp.v6.asNumericString": 1,
		},
		options: {
			partialFilterExpression: {
				"userIp.v6.asNumericString": { $exists: true },
			},
		},
	},
];

const userIpMaskIndexes: MongooseIndex[] = [
	{
		definition: {
			"userIp.v4.mask.rangeMinAsNumeric": 1,
			"userIp.v4.mask.rangeMaxAsNumeric": 1,
			"userIp.v4.asNumeric": 1,
		},
		options: {
			partialFilterExpression: {
				"userIp.v4.mask.asNumeric": { $exists: true },
			},
		},
	},
	{
		definition: {
			"userIp.v6.mask.rangeMinAsNumericString": 1,
			"userIp.v6.mask.rangeMaxAsNumericString": 1,
		},
		options: {
			partialFilterExpression: {
				"userIp.v6.mask.asNumeric": { $exists: true },
			},
		},
	},
];

const otherIndexes: MongooseIndex[] = [
	{
		definition: {
			userId: 1,
		},
		options: {
			unique: true,
		},
	},
	{
		definition: {
			ja4: 1,
		},
		options: {
			unique: true,
		},
	},
];

const rulePerformanceMongooseIndexes = [
	...userIpIndexes,
	...userIpMaskIndexes,
	...otherIndexes,
];

export { rulePerformanceMongooseIndexes };

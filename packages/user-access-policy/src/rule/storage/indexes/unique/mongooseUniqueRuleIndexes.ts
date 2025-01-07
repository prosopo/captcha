import type MongooseIndex from "../mongooseIndex.js";

const globalIpIndexes: MongooseIndex[] = [
	{
		definition: {
			"userIp.v4.asNumeric": 1,
		},
		options: {
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: false },
				"userIp.v4.asNumeric": { $exists: true },
				"userIp.v4.mask.asNumeric": { $exists: false },
			},
		},
	},
	{
		definition: {
			"userIp.v6.asNumericString": 1,
		},
		options: {
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: false },
				"userIp.v6.asNumericString": { $exists: true },
				"userIp.v6.mask.asNumeric": { $exists: false },
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
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: false },
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
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: false },
				"userIp.v6.asNumericString": { $exists: true },
				"userIp.v6.mask.asNumeric": { $exists: true },
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
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: true },
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
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: true },
				"userIp.v4.asNumeric": { $exists: true },
				"userIp.v4.mask.asNumeric": { $exists: false },
			},
		},
	},
	{
		definition: {
			clientId: 1,
			"userIp.v6.asNumericString": 1,
		},
		options: {
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: true },
				"userIp.v6.asNumericString": { $exists: true },
				"userIp.v6.mask.asNumeric": { $exists: false },
			},
		},
	},
];

export default [
	...globalIpIndexes,
	...globalIpMaskIndexes,
	...ipMaskPerClientIndexes,
	...ipPerClientIndexes,
];

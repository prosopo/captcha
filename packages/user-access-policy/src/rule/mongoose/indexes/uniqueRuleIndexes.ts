import type MongooseIndex from "./mongooseIndex";

const globalIpIndexes: MongooseIndex[] = [
	{
		definition: {
			"userIp.v4.asNumeric": 1,
		},
		options: {
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
			unique: true,
			partialFilterExpression: {
				clientId: null,
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
			unique: true,
			partialFilterExpression: {
				clientId: { $exists: true },
				"userIp.v6.asNumericString": { $exists: true },
				"userIp.v6.mask.asNumeric": null,
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

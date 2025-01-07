import type MongooseIndex from "./mongooseIndex.js";

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

export default [...userIpIndexes, ...userIpMaskIndexes];

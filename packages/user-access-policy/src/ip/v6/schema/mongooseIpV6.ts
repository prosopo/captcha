import { Schema } from "mongoose";
import type IpV6 from "../ipV6.js";
import MongooseIpV6Mask from "../mask/schema/mongooseIpV6Mask.js";
import IPV6_NUMERIC_MAX_LENGTH from "../ipV6NumericMaxLength.js";

const mongooseIpV6 = new Schema<IpV6>(
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
			set: (value: string): string => value.padStart(IPV6_NUMERIC_MAX_LENGTH, "0"),
		},
		asString: { type: String, required: true },
		mask: {
			type: MongooseIpV6Mask,
			required: false,
		},
	},
	{ _id: false },
);

export default mongooseIpV6;

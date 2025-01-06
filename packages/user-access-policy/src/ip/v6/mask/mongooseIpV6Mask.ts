import { Schema } from "mongoose";
import type IpV6Mask from "./ipV6Mask.js";
import IPV6_NUMERIC_MAX_LENGTH from "../ipV6NumericMaxLength.js";

const mongooseIpV6Mask = new Schema<IpV6Mask>(
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
		rangeMinAsNumericString: {
			type: String,
			required: true,
			// we must have the exact same string length to guarantee the right comparison.
			set: (value: string): string => value.padStart(IPV6_NUMERIC_MAX_LENGTH, "0"),
		},
		rangeMaxAsNumericString: {
			type: String,
			required: true,
			// we must have the exact same string length to guarantee the right comparison.
			set: (value: string): string => value.padStart(IPV6_NUMERIC_MAX_LENGTH, "0"),
		},
		asNumeric: { type: Number, required: true },
	},
	{ _id: false },
);

export default mongooseIpV6Mask;

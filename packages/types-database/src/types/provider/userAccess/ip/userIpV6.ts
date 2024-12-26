import { Schema } from "mongoose";
import { type UserIpV4Mask, userIpV4MaskRecordSchema } from "./userIpV4Mask.js";

interface UserIpV6 {
	asNumericString: string;
	// for presentation only purposes
	asString: string;
	mask?: UserIpV4Mask;
}

const USER_IP_V6_LENGTH = 38;

const userIpV6RecordSchema = new Schema<UserIpV6>(
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
			set: (value: string): string => value.padStart(USER_IP_V6_LENGTH, "0"),
		},
		asString: { type: String, required: true },
		mask: {
			type: userIpV4MaskRecordSchema,
			required: false,
			default: null,
		},
	},
	{ _id: false },
);

export { type UserIpV6, userIpV6RecordSchema, USER_IP_V6_LENGTH };

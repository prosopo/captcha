import { Schema } from "mongoose";
import { type UserIpV4Mask, userIpV4MaskRecordSchema } from "./userIpV4Mask.js";

interface UserIpV4 {
	asNumeric: bigint;
	// for presentation only purposes
	asString: string;
	mask?: UserIpV4Mask;
}

const userIpV4RecordSchema = new Schema<UserIpV4>(
	{
		// Type choice note: Int32 can't store 10 digits of the numeric presentation of ipV4,
		// so we use BigInt, which is supported by Mongoose and turned into Mongo's Long (Int64)
		asNumeric: { type: BigInt, required: true },
		asString: { type: String, required: true },
		mask: {
			type: userIpV4MaskRecordSchema,
			required: false,
			default: null,
		},
	},
	{ _id: false },
);

export { type UserIpV4, userIpV4RecordSchema };

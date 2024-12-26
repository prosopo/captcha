import { Schema } from "mongoose";
import { Int32 } from "mongodb";
import { type UserIpV4Mask, userIpV4MaskRecordSchema } from "./userIpV4Mask.js";

interface UserIpV4 {
	asNumeric: Int32;
	// for presentation only purposes
	asString: string;
	mask?: UserIpV4Mask;
}

const userIpV4RecordSchema = new Schema<UserIpV4>(
	{
		asNumeric: { type: Int32, required: true },
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

import { Schema } from "mongoose";
import type IpV4 from "../ipV4.js";
import mongooseIpV4Mask from "../mask/schema/mongooseIpV4Mask.js";

const mongooseIpV4 = new Schema<IpV4>(
	{
		// Type choice note: Int32 can't store 10 digits of the numeric presentation of ipV4,
		// so we use BigInt, which is supported by Mongoose and turned into Mongo's Long (Int64)
		asNumeric: { type: BigInt, required: true },
		asString: { type: String, required: true },
		mask: {
			type: mongooseIpV4Mask,
			required: false,
		},
	},
	{ _id: false },
);

export default mongooseIpV4;

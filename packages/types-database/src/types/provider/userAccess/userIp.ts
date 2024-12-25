import { Schema } from "mongoose";
import { type UserIpMask, userIpMaskRecordSchema } from "./userIpMask.js";
import type {Decimal128} from "mongodb";

enum UserIpVersion {
	v4 = "v4",
	v6 = "v6",
}

interface UserIp {
	// ipV6 takes 128bits, so we can't use Number, which is only 54 bits
	numericPresentation: Decimal128;
	// for presentation only purposes
	stringPresentation: string;
	version: UserIpVersion;
	mask?: UserIpMask;
}

const userIpRecordSchema = new Schema<UserIp>(
	{
		// ipV6 takes 128bits, so we can't use Number, which is only 54 bits
		numericPresentation: { type: Schema.Types.Decimal128, required: true },
		// for presentation only purposes
		stringPresentation: { type: String, required: true },
		version: { type: String, required: true },
		mask: {
			type: userIpMaskRecordSchema,
			required: false,
			default: null,
		},
	},
	{ _id: false },
);

export { type UserIp, UserIpVersion, userIpRecordSchema };

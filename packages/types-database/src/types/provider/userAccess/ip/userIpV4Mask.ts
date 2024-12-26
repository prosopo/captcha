import { Schema } from "mongoose";
import { Int32 } from "mongodb";

// ipV4 mask is usually present like this: '198.51.100.14/24'
// but since IP has its numeric presentation, and the mask is a rigid range,
// we also store mask as rangeMin and rangeMax, to allow efficient greater/lesser query comparisons.

interface UserIpV4Mask {
	rangeMinAsNumeric: Int32;
	rangeMaxAsNumeric: Int32;
	// CIDR prefix https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing - 198.51.100.14/{24}
	// for presentation only purposes
	asNumeric: number;
}

const userIpV4MaskRecordSchema = new Schema<UserIpV4Mask>(
	{
		rangeMinAsNumeric: { type: Int32, required: true },
		rangeMaxAsNumeric: { type: Int32, required: true },
		asNumeric: { type: Number, required: true },
	},
	{ _id: false },
);

export { type UserIpV4Mask, userIpV4MaskRecordSchema };

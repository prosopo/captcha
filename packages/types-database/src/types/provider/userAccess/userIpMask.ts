import { Schema } from "mongoose";
import type {Decimal128} from "mongodb";

// ip mask is usually present like this: '198.51.100.14/24'
// but since IP has its numeric presentation, and the mask is a rigid range,
// we also store mask as rangeMin and rangeMax, to allow efficient greater/lesser query comparisons.

interface UserIpMask {
	// ipV6 takes 128bits, so we can't use Number, which is only 54 bits
	rangeMin: Decimal128;
	rangeMax: Decimal128;
	// CIDR prefix https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing - 198.51.100.14/{24}
	// for presentation only purposes
	numeric: number;
}

const userIpMaskRecordSchema = new Schema<UserIpMask>(
	{
		// ipV6 takes 128bits, so we can't use Number, which is only 54 bits
		rangeMin: { type: Schema.Types.Decimal128, required: true },
		rangeMax: { type: Schema.Types.Decimal128, required: true },
		numeric: { type: Number, required: true },
	},
	{ _id: false },
);

export { type UserIpMask, userIpMaskRecordSchema };

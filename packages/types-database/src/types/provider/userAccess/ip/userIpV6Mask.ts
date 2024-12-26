import { Schema } from "mongoose";
import {USER_IP_V6_LENGTH} from "./userIpV6.js";

// ipV6 mask is usually present like this: '2001:db8:abcd:0012:ffff:ffff:ffff:ffff/128'
// but since IP has its numeric presentation, and the mask is a rigid range,
// we also store mask as rangeMin and rangeMax, to allow efficient greater/lesser query comparisons.

interface UserIpV6Mask {
    rangeMinAsNumericString: string;
    rangeMaxAsNumericString: string;
    // CIDR prefix https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing - 2001:db8:abcd:0012:ffff:ffff:ffff:ffff/{128}
    // for presentation only purposes
    asNumeric: number;
}

const userIpV6MaskRecordSchema = new Schema<UserIpV6Mask>(
    {
        // 1. Type choice:
        /**
         * ipV6 takes 128bits (38 digits), so we can't use Number, and can't even Decimal128,
         * cause it supports only 34 digits https://www.mongodb.com/docs/manual/reference/bson-types/
         */
        // 2. String comparison
        /**
         * Mongo compares strings by unicode codes of each letter, so it works for us,
         * as long we make sure both strings have the exact same length:
         * so '10' and '02', never '10' and '2'.
         */
        rangeMinAsNumericString: {
            type: String,
            required: true,
            // we must have the exact same string length to guarantee the right comparison.
            set: (value: string): string => value.padStart(USER_IP_V6_LENGTH, "0"),
        },
        rangeMaxAsNumericString: {
            type: String,
            required: true,
            // we must have the exact same string length to guarantee the right comparison.
            set: (value: string): string => value.padStart(USER_IP_V6_LENGTH, "0"),
        },
        asNumeric: { type: Number, required: true },
    },
    { _id: false },
);

export { type UserIpV6Mask, userIpV6MaskRecordSchema };

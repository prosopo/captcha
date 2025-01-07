import {Schema} from "mongoose";
import type IpV4Mask from "../ipV4Mask.js";

const mongooseIpV4Mask = new Schema<IpV4Mask>(
    {
        // Type choice note: Int32 can't store 10 digits of the numeric presentation of ipV4,
        // so we use BigInt, which is supported by Mongoose and turned into Mongo's Long (Int64)
        rangeMinAsNumeric: { type: BigInt, required: true },
        rangeMaxAsNumeric: { type: BigInt, required: true },
        asNumeric: { type: Number, required: true },
    },
    { _id: false },
);

export default mongooseIpV4Mask;

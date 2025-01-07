import { Schema } from "mongoose";
import type Ip from "../ip.js";
import mongooseIpV4Mask from "../v4/mask/schema/mongooseIpV4Mask.js";
import mongooseIpV6Mask from "../v6/mask/schema/mongooseIpV6Mask.js";

const mongooseIp = new Schema<Ip>(
	{
		v4: {
			type: mongooseIpV4Mask,
			required: [
				function () {
					const isV6Unset = "object" !== typeof this.v6 || null === this.v6;

					return isV6Unset;
				},
				"v4 is required when v6 is not set",
			],
		},
		v6: {
			type: mongooseIpV6Mask,
			required: [
				function () {
					const isV4Unset = "object" !== typeof this.v4 || null === this.v4;

					return isV4Unset;
				},
				"v6 is required when v4 is not set",
			],
		},
	},
	{ _id: false },
);

export default mongooseIp;

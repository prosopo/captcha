import { Schema } from "mongoose";
import type Ip from "./ip.js";
import mongooseIpV4 from "./v4/mongooseIpV4.js";
import mongooseIpV6 from "./v6/mongooseIpV6.js";

const mongooseIp = new Schema<Ip>(
	{
		v4: {
			type: mongooseIpV4,
			required: [
				function () {
					const isV6Unset = "object" !== typeof this.v6 || null === this.v6;

					return isV6Unset;
				},
				"v4 is required when v6 is not set",
			],
		},
		v6: {
			type: mongooseIpV6,
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

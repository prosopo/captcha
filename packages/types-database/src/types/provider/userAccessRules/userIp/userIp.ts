import { Schema } from "mongoose";
import { type UserIpV4, userIpV4RecordSchema } from "./userIpV4.js";
import { type UserIpV6, userIpV6RecordSchema } from "./userIpV6.js";

interface UserIp {
	v4?: UserIpV4;
	v6?: UserIpV6;
}

enum UserIpVersion {
	v4 = "v4",
	v6 = "v6",
}

const userIpRecordSchema = new Schema<UserIp>(
	{
		v4: {
			type: userIpV4RecordSchema,
			required: [
				function () {
					const isV6Unset = "object" !== typeof this.v6 || null === this.v6;

					return isV6Unset;
				},
				"v4 is required when v6 is not set",
			],
		},
		v6: {
			type: userIpV6RecordSchema,
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

export { type UserIp, userIpRecordSchema, UserIpVersion };

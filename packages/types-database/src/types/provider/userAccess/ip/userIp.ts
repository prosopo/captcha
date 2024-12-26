import { Schema } from "mongoose";
import { type UserIpV4, userIpV4RecordSchema } from "./userIpV4.js";
import { type UserIpV6, userIpV6RecordSchema } from "./userIpV6.js";

interface UserIp {
	v4: UserIpV4;
	v6: UserIpV6;
}

const userIpRecordSchema = new Schema<UserIp>(
	{
		v4: { type: userIpV4RecordSchema, required: false },
		v6: { type: userIpV6RecordSchema, required: false },
	},
	{ _id: false },
);

export { type UserIp, userIpRecordSchema };

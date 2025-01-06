import {Schema} from "mongoose";
import type Rule from "../rule.js";
import mongooseIp from "../../ip/mongooseIp.js";
import mongooseConfig from "../../config/mongooseConfig.js";

const mongooseRule = new Schema<Rule>({
    isUserBlocked: { type: Boolean, required: true },
    clientId: { type: String, required: false },
    description: { type: String, required: false },
    userIp: {
        type: mongooseIp,
        required: [
            function () {
                const isUserIdUnset = "string" !== typeof this.userId;

                return isUserIdUnset;
            },
            "userIp is required when userId is not set",
        ],
    },
    userId: {
        type: String,
        required: [
            function () {
                const isUserIpUnset =
                    "object" !== typeof this.userIp || null === this.userIp;

                return isUserIpUnset;
            },
            "userId is required when userIp is not set",
        ],
    },
    config: {
        type: mongooseConfig,
        required: false,
    },
});

export default mongooseRule;

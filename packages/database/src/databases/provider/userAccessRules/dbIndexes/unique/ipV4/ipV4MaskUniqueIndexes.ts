import type { Schema } from "mongoose";
import type { UserAccessRule } from "@prosopo/types-database";
import type { AccessRuleDbIndexes } from "../../accessRuleDbIndexes.js";

class IpV4MaskUniqueIndexes implements AccessRuleDbIndexes {
    public setup(schema: Schema<UserAccessRule>): void {
        this.globalIpMask(schema);
        this.ipMaskPerClient(schema);
    }

    protected globalIpMask(schema: Schema<UserAccessRule>): void {
        schema.index(
            {
                "userIp.v4.asNumeric": 1,
                "userIp.v4.mask.asNumeric": 1,
            },
            {
                unique: true,
                partialFilterExpression: {
                    clientId: null,
                    "userIp.v4.asNumeric": { $exists: true },
                    "userIp.v4.mask.asNumeric": { $exists: true },
                },
            },
        );
    }

    protected ipMaskPerClient(schema: Schema<UserAccessRule>): void {
        schema.index(
            {
                clientId: 1,
                "userIp.v4.asNumeric": 1,
                "userIp.v4.mask.asNumeric": 1,
            },
            {
                unique: true,
                partialFilterExpression: {
                    clientId: { $exists: true },
                    "userIp.v4.asNumeric": { $exists: true },
                    "userIp.v4.mask.asNumeric": { $exists: true },
                },
            },
        );
    }
}

const ipV4MaskUniqueIndexes = new IpV4MaskUniqueIndexes();

export { ipV4MaskUniqueIndexes };

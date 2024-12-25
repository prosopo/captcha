import { UserIpVersion } from "@prosopo/types-database";
import {WithIpAndClientAccountId} from "./withIpAndClientAccountId.js";

class WithIpV4AndClientAccountId extends WithIpAndClientAccountId {
    protected override getTestPrefixes(): string[] {
        return super.getTestPrefixes().concat(["v4"]);
    }

    protected getUserIpVersion(): UserIpVersion {
        return UserIpVersion.v4;
    }

    protected getFirstUserIp(): string {
        return "127.0.0.1";
    }

    protected getSecondUserIp(): string {
        return "127.0.0.2";
    }
}

export { WithIpV4AndClientAccountId };

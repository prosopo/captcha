import { WithIp } from "./withIp.js";
import { UserIpVersion } from "@prosopo/types-database";

class WithIpV6 extends WithIp {
    protected override getTestPrefixes(): string[] {
        return super.getTestPrefixes().concat(["v6"]);
    }

    protected getUserIpVersion(): UserIpVersion {
        return UserIpVersion.v6;
    }

    protected getFirstUserIp(): string {
        return "2001:db8:3333:4444:5555:6666:7777:8888";
    }

    protected getSecondUserIp(): string {
        return "2001:db8:3333:4444:CCCC:DDDD:EEEE:FFFF";
    }
}

export { WithIpV6 };

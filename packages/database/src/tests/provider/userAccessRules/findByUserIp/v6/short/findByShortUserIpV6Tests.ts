import { FindByUserIpV6Tests } from "../findByUserIpV6Tests.js";

class FindByShortUserIpV6Tests extends FindByUserIpV6Tests {
	protected override readonly userIp: string = "::1";
	protected override readonly anotherUserIp: string = "::2";
}

export { FindByShortUserIpV6Tests };

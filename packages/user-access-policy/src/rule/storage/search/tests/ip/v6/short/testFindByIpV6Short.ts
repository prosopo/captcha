import TestFindByIpV6 from "../testFindByIpV6.js";

class TestFindByIpV6Short extends TestFindByIpV6 {
	protected override readonly userIp: string = "::1";
	protected override readonly anotherUserIp: string = "::2";
}

export default TestFindByIpV6Short;

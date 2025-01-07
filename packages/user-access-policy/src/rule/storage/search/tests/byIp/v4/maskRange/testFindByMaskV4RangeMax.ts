import TestFindByMaskV4 from "../testFindByMaskV4.js";

class TestFindByMaskV4RangeMax extends TestFindByMaskV4 {
	protected override baseIpAsString = "192.168.0.0";
	protected override rangeMinIpAsString = "192.168.0.0";
	protected override rangeMaxIpAsString = "192.168.0.255";

	protected override readonly userIp: string = "192.168.0.255";
	protected override readonly anotherUserIp: string = "127.0.1.0";
}

export default TestFindByMaskV4RangeMax;

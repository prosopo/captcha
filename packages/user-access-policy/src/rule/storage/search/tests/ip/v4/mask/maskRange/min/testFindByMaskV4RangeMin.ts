import TestFindByMaskV4 from "../../testFindByMaskV4.js";

class TestFindByMaskV4RangeMin extends TestFindByMaskV4 {
	protected override baseIpAsString = "192.168.1.0";
	protected override rangeMinIpAsString = "192.168.1.0";
	protected override rangeMaxIpAsString = "192.168.1.255";

	protected override readonly userIp: string = "192.168.1.0";
	protected override readonly anotherUserIp: string = "127.0.0.255";
}

export default TestFindByMaskV4RangeMin;

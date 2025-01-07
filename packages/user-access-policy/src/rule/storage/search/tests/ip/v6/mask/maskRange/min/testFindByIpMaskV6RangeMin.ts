import TestFindByIpMaskV6 from "../../testFindByIpMaskV6.js";

class TestFindByIpMaskV6RangeMin extends TestFindByIpMaskV6 {
	protected override baseIpAsString = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected override rangeMinIpAsString =
		"2001:db8:3333:4444:5555:6666:7777:8888";
	protected override rangeMaxIpAsString =
		"2001:db8:3333:4444:5555:6666:7777:ffff";

	protected override readonly userIp: string =
		"2001:db8:3333:4444:5555:6666:7777:8888";
	protected override readonly anotherUserIp: string =
		"2001:db8:3333:4444:5555:6666:7777:7777";
}

export default TestFindByIpMaskV6RangeMin;

// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Address6 } from "ip-address";
import type {Ip} from "../../../../../../../ip/ip.js";
import {TestFindByIpV6} from "../testFindByIpV6.js";

class TestFindByIpMaskV6 extends TestFindByIpV6 {
	protected baseIpAsString = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected rangeMinIpAsString = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected rangeMaxIpAsString = "2001:db8:3333:4444:5555:6666:7777:ffff";

	protected override readonly userIp: string =
		"2001:db8:3333:4444:5555:6666:7777:aaaa";
	protected override readonly anotherUserIp: string =
		"2001:db8:3333:4444:5555:6666:8888:1111";

	protected override getUserIpObject(): Ip {
		return {
			v6: {
				asNumericString: new Address6(this.baseIpAsString).bigInt().toString(),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumericString: new Address6(this.rangeMinIpAsString)
						.bigInt()
						.toString(),
					rangeMaxAsNumericString: new Address6(this.rangeMaxIpAsString)
						.bigInt()
						.toString(),
					asNumeric: 24,
				},
			},
		};
	}

	protected override getUserIpObjectInOtherVersion(): Ip {
		return {
			v4: {
				asNumeric: new Address6(this.baseIpAsString).bigInt(),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumeric: new Address6(this.rangeMinIpAsString).bigInt(),
					rangeMaxAsNumeric: new Address6(this.rangeMaxIpAsString).bigInt(),
					asNumeric: 24,
				},
			},
		};
	}
}

export { TestFindByIpMaskV6};

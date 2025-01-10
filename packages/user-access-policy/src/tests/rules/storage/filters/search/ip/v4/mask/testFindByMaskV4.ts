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
import { Address4 } from "ip-address";
import {TestFindByIpV4} from "@tests/rules/storage/filters/search/ip/v4/testFindByIpV4.js";
import type {Ip} from "@rules/rule/ip/ip.js";

class TestFindByMaskV4 extends TestFindByIpV4 {
	protected baseIpAsString = "192.168.0.0";
	protected rangeMinIpAsString = "192.168.0.0";
	protected rangeMaxIpAsString = "192.168.0.255";

	protected override readonly userIp: string = "192.168.0.15";
	protected override readonly anotherUserIp: string = "127.0.1.0";

	protected override getUserIpObject(): Ip {
		return {
			v4: {
				asNumeric: new Address4(this.baseIpAsString).bigInt(),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumeric: new Address4(this.rangeMinIpAsString).bigInt(),
					rangeMaxAsNumeric: new Address4(this.rangeMaxIpAsString).bigInt(),
					asNumeric: 24,
				},
			},
		};
	}

	protected override getUserIpObjectInOtherVersion(): Ip {
		return {
			v6: {
				asNumericString: new Address4(this.baseIpAsString).bigInt().toString(),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumericString: new Address4(this.rangeMinIpAsString)
						.bigInt()
						.toString(),
					rangeMaxAsNumericString: new Address4(this.rangeMaxIpAsString)
						.bigInt()
						.toString(),
					asNumeric: 24,
				},
			},
		};
	}
}

export { TestFindByMaskV4 };

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
import {TestUniqueIndexBase} from "@tests/rules/storage/mongoose/indexes/unique/testUniqueIndexBase.js";
import type {Ip} from "@rules/rule/ip/ip.js";

class TestIpV4UniqueIndex extends TestUniqueIndexBase {
	private readonly firstIpAsNumeric: bigint = new Address4(
		"192.168.1.1",
	).bigInt();
	private readonly secondIpAsNumeric: bigint = new Address4(
		"192.168.1.2",
	).bigInt();

	protected override getFirstUserIpObject(): Ip {
		return {
			v4: {
				asNumeric: this.firstIpAsNumeric,
				asString: this.firstIpAsNumeric.toString(),
			},
		};
	}

	protected override getSecondUserIpObject(): Ip {
		return {
			v4: {
				asNumeric: this.secondIpAsNumeric,
				asString: this.secondIpAsNumeric.toString(),
			},
		};
	}
}

export { TestIpV4UniqueIndex };

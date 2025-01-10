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
import {TestUniqueIndexBase} from "@tests/rules/storage/mongoose/indexes/unique/testUniqueIndexBase.js";
import type {RuleIp} from "@rules/rule/ip/ruleIp.js";

class TestIpV6MaskUniqueIndex extends TestUniqueIndexBase {
	private readonly ipAsNumericString: string = new Address6(
		"2001:db8:3333:4444:5555:6666:7777:8888",
	)
		.bigInt()
		.toString();
	private readonly firstMaskAsNumeric: number = 10;
	private readonly secondMaskAsNumeric: number = 20;

	protected override getFirstUserIpObject(): RuleIp {
		return {
			v6: {
				asNumericString: this.ipAsNumericString,
				asString: this.ipAsNumericString,
				mask: {
					rangeMinAsNumericString: "0",
					rangeMaxAsNumericString: "0",
					asNumeric: this.firstMaskAsNumeric,
				},
			},
		};
	}

	protected override getSecondUserIpObject(): RuleIp {
		return {
			v6: {
				asNumericString: this.ipAsNumericString,
				asString: this.ipAsNumericString,
				mask: {
					rangeMinAsNumericString: "0",
					rangeMaxAsNumericString: "0",
					asNumeric: this.secondMaskAsNumeric,
				},
			},
		};
	}
}

export { TestIpV6MaskUniqueIndex };

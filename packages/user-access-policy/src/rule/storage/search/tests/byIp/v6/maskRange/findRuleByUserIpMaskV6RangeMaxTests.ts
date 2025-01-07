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
import { FindRuleByUserIpMaskV6Tests } from "../findRuleByUserIpMaskV6Tests.js";

class FindRuleByUserIpMaskV6RangeMaxTests extends FindRuleByUserIpMaskV6Tests {
	protected override baseIpAsString = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected override rangeMinIpAsString =
		"2001:db8:3333:4444:5555:6666:7777:8888";
	protected override rangeMaxIpAsString =
		"2001:db8:3333:4444:5555:6666:7777:ffff";

	protected override readonly userIp: string =
		"2001:db8:3333:4444:5555:6666:7777:ffff";
	protected override readonly anotherUserIp: string =
		"2001:db8:3333:4444:5555:6666:8888:1111";

	public override getName(): string {
		return "FindRuleByUserIpMaskV6RangeMax";
	}
}

export { FindRuleByUserIpMaskV6RangeMaxTests };

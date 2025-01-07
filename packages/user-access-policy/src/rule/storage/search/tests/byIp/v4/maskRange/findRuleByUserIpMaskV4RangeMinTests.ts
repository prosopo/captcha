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
import { FindRuleByUserIpMaskV4Tests } from "../findRuleByUserIpMaskV4Tests.js";

class FindRuleByUserIpMaskV4RangeMinTests extends FindRuleByUserIpMaskV4Tests {
	protected override baseIpAsString = "192.168.1.0";
	protected override rangeMinIpAsString = "192.168.1.0";
	protected override rangeMaxIpAsString = "192.168.1.255";

	protected override readonly userIp: string = "192.168.1.0";
	protected override readonly anotherUserIp: string = "127.0.0.255";

	override getName(): string {
		return "FindRuleByUserIpMaskV4RangeMin";
	}
}

export { FindRuleByUserIpMaskV4RangeMinTests };

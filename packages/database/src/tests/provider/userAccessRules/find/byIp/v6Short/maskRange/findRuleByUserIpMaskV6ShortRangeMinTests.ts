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
import { FindRuleByUserIpMaskV6Tests } from "../../v6/findRuleByUserIpMaskV6Tests.js";

class FindRuleByUserIpMaskV6ShortRangeMinTests extends FindRuleByUserIpMaskV6Tests {
	protected override baseIpAsString = "::2";
	protected override rangeMinIpAsString = "::2";
	protected override rangeMaxIpAsString = "::4";

	protected override readonly userIp: string = "::2";
	protected override readonly anotherUserIp: string = "::1";

	public override getName(): string {
		return "FindRuleByUserIpMaskV6ShortRangeMin";
	}
}

export { FindRuleByUserIpMaskV6ShortRangeMinTests };

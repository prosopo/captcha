import type { UserIp } from "@prosopo/types-database";
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
import { FindRuleByUserIpTests } from "../findRuleByUserIpTests.js";

class FindRuleByUserIpV4Tests extends FindRuleByUserIpTests {
	protected readonly userIp: string = "192.168.1.1";
	protected readonly anotherUserIp: string = "127.0.0.1";

	public getName(): string {
		return "FindRuleByUserIpV4";
	}

	protected getUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: new Address4(this.userIp).bigInt(),
				asString: this.userIp,
			},
		};
	}

	protected getUserIpAddress(): Address4 {
		return new Address4(this.userIp);
	}

	protected getOtherUserIpAddress(): Address4 {
		return new Address4(this.anotherUserIp);
	}

	protected getUserIpObjectInOtherVersion(): UserIp {
		return {
			v6: {
				asNumericString: new Address4(this.userIp).bigInt().toString(),
				asString: this.userIp,
			},
		};
	}
}

export { FindRuleByUserIpV4Tests };

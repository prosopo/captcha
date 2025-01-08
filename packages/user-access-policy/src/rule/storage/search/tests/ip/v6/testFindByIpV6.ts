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
import type { Ip } from "../../../../../../ip/ip.js";
import { TestFindByIpBase } from "../testFindByIpBase.js";

class TestFindByIpV6 extends TestFindByIpBase {
	protected readonly userIp: string = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected readonly anotherUserIp: string =
		"1002:db8:3333:4444:5555:6666:7777:8888";

	protected getUserIpObject(): Ip {
		return {
			v6: {
				asNumericString: new Address6(this.userIp).bigInt().toString(),
				asString: this.userIp,
			},
		};
	}

	protected getUserIpAddress(): Address6 {
		return new Address6(this.userIp);
	}

	protected getOtherUserIpAddress(): Address6 {
		return new Address6(this.anotherUserIp);
	}

	protected getUserIpObjectInOtherVersion(): Ip {
		return {
			v4: {
				asNumeric: new Address6(this.userIp).bigInt(),
				asString: this.userIp,
			},
		};
	}
}

export { TestFindByIpV6 };

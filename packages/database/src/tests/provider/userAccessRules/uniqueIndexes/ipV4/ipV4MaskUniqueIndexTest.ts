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
import { IpUniqueIndexTests } from "../ipUniqueIndexTests.js";

class IpV4MaskUniqueIndexTest extends IpUniqueIndexTests {
	private readonly ipAsNumeric: bigint = new Address4("192.168.1.1").bigInt();
	private readonly firstMaskAsNumeric: number = 10;
	private readonly secondMaskAsNumeric: number = 29;

	protected override getFirstUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: this.ipAsNumeric,
				asString: this.ipAsNumeric.toString(),
				mask: {
					rangeMinAsNumeric: BigInt(0),
					rangeMaxAsNumeric: BigInt(0),
					asNumeric: this.firstMaskAsNumeric,
				},
			},
		};
	}

	protected override getSecondUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: this.ipAsNumeric,
				asString: this.ipAsNumeric.toString(),
				mask: {
					rangeMinAsNumeric: BigInt(0),
					rangeMaxAsNumeric: BigInt(0),
					asNumeric: this.secondMaskAsNumeric,
				},
			},
		};
	}

	public override getName(): string {
		return "IpV4MaskUniqueIndex";
	}
}

export { IpV4MaskUniqueIndexTest };

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
import { Schema } from "mongoose";

// ipV4 mask is usually present like this: '198.51.100.14/24'
// but since IP has its numeric presentation, and the mask is a rigid range,
// we also store mask as rangeMin and rangeMax, to allow efficient greater/lesser query comparisons.

interface UserIpV4Mask {
	rangeMinAsNumeric: bigint;
	rangeMaxAsNumeric: bigint;
	// CIDR prefix https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing - 198.51.100.14/{24}
	// for presentation only purposes
	asNumeric: number;
}

const userIpV4MaskRecordSchema = new Schema<UserIpV4Mask>(
	{
		// Type choice note: Int32 can't store 10 digits of the numeric presentation of ipV4,
		// so we use BigInt, which is supported by Mongoose and turned into Mongo's Long (Int64)
		rangeMinAsNumeric: { type: BigInt, required: true },
		rangeMaxAsNumeric: { type: BigInt, required: true },
		asNumeric: { type: Number, required: true },
	},
	{ _id: false },
);

export { type UserIpV4Mask, userIpV4MaskRecordSchema };

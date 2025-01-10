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
import type {Ip} from "@rules/rule/ip/ip.js";
import {mongooseIpV4} from "@rules/rule/ip/v4/single/mongooseIpV4.js";
import {mongooseIpV6} from "@rules/rule/ip/v6/single/mongooseIpV6.js";

const mongooseIp = new Schema<Ip>(
	{
		v4: {
			type: mongooseIpV4,
			required: [
				function () {
					return !this.v6;
				},
				"v4 is required when v6 is not set",
			],
		},
		v6: {
			type: mongooseIpV6,
			required: [
				function () {
					return !this.v4;
				},
				"v6 is required when v4 is not set",
			],
		},
	},
	{ _id: false },
);

export { mongooseIp };

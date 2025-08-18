// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { describe, expect, it } from "vitest";
import { getRequestUserScope } from "../../../api/blacklistRequestInspector.js";

describe("getRequestUserScope", () => {
	it("should return a user scope with ja4Hash and userAgent and ip and userId", () => {
		const ja4 = "t13d1516h2_8daaf6152771_8eba31f8906f";
		const userAgent = "testuseragent1";
		const rawIp = "1.1.1.1";
		const user = "testuser";
		const requestHeaders = {
			"user-agent": userAgent,
			"X-Forwarded-For": rawIp,
		};
		const userScope = getRequestUserScope(requestHeaders, ja4, rawIp, user);
		expect(userScope).toEqual({
			ja4Hash: ja4,
			userAgent: userAgent,
			ip: rawIp,
			userId: "testuser",
		});
	});
	it("should return a user scope with ja4Hash and userAgent and ip", () => {
		const ja4 = "t13d1516h2_8daaf6152771_8eba31f8906f";
		const userAgent = "testuseragent1";
		const rawIp = "1.1.1.1";
		const requestHeaders = {
			"user-agent": userAgent,
			"X-Forwarded-For": rawIp,
		};
		const userScope = getRequestUserScope(requestHeaders, ja4, rawIp);
		expect(userScope).toEqual({
			ja4Hash: ja4,
			userAgent: userAgent,
			ip: rawIp,
		});
	});
	it("should return a user scope with userAgent and ip", () => {
		const userAgent = "testuseragent1";
		const rawIp = "1.1.1.1";
		const requestHeaders = {
			"user-agent": userAgent,
			"X-Forwarded-For": rawIp,
		};
		const userScope = getRequestUserScope(requestHeaders, undefined, rawIp);
		expect(userScope).toEqual({
			userAgent: userAgent,
			ip: rawIp,
		});
	});
	it("should return a user scope with userAgent", () => {
		const userAgent = "testuseragent1";
		const requestHeaders = {
			"user-agent": userAgent,
		};
		const userScope = getRequestUserScope(requestHeaders);
		expect(userScope).toEqual({
			userAgent: userAgent,
		});
	});
});

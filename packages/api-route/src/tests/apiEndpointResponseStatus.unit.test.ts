// Copyright 2021-2026 Prosopo (UK) Ltd.
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
import { ApiEndpointResponseStatus } from "../endpoint/apiEndpointResponseStatus.js";

describe("ApiEndpointResponseStatus", () => {
	describe("enum values", () => {
		it("should have SUCCESS value", () => {
			expect(ApiEndpointResponseStatus.SUCCESS).toBe("SUCCESS");
		});

		it("should have FAIL value", () => {
			expect(ApiEndpointResponseStatus.FAIL).toBe("FAIL");
		});

		it("should have PROCESSING value", () => {
			expect(ApiEndpointResponseStatus.PROCESSING).toBe("PROCESSING");
		});

		it("should contain exactly 3 values", () => {
			const values = Object.values(ApiEndpointResponseStatus);
			expect(values).toHaveLength(3);
		});

		it("should have all values as strings", () => {
			const values = Object.values(ApiEndpointResponseStatus);
			for (const value of values) {
				expect(typeof value).toBe("string");
			}
		});
	});

	describe("enum keys", () => {
		it("should have keys matching their values", () => {
			expect(ApiEndpointResponseStatus.SUCCESS).toBe("SUCCESS");
			expect(ApiEndpointResponseStatus.FAIL).toBe("FAIL");
			expect(ApiEndpointResponseStatus.PROCESSING).toBe("PROCESSING");
		});

		it("should allow access by key", () => {
			const status = ApiEndpointResponseStatus.SUCCESS;
			expect(status).toBe("SUCCESS");
		});

		it("should be comparable with string literals", () => {
			expect(ApiEndpointResponseStatus.SUCCESS === "SUCCESS").toBe(true);
			expect(ApiEndpointResponseStatus.FAIL === "FAIL").toBe(true);
			expect(ApiEndpointResponseStatus.PROCESSING === "PROCESSING").toBe(true);
		});
	});

	describe("usage in switch statements", () => {
		it("should work in switch statements", () => {
			const handleStatus = (status: ApiEndpointResponseStatus): string => {
				switch (status) {
					case ApiEndpointResponseStatus.SUCCESS:
						return "success";
					case ApiEndpointResponseStatus.FAIL:
						return "fail";
					case ApiEndpointResponseStatus.PROCESSING:
						return "processing";
				}
			};

			expect(handleStatus(ApiEndpointResponseStatus.SUCCESS)).toBe("success");
			expect(handleStatus(ApiEndpointResponseStatus.FAIL)).toBe("fail");
			expect(handleStatus(ApiEndpointResponseStatus.PROCESSING)).toBe(
				"processing",
			);
		});
	});

	describe("usage in conditional statements", () => {
		it("should work in equality checks", () => {
			const status = ApiEndpointResponseStatus.SUCCESS;

			expect(status === ApiEndpointResponseStatus.SUCCESS).toBe(true);
			expect(status === ApiEndpointResponseStatus.FAIL).toBe(false);
			expect(status === ApiEndpointResponseStatus.PROCESSING).toBe(false);
		});

		it("should work with different status values", () => {
			const statuses = [
				ApiEndpointResponseStatus.SUCCESS,
				ApiEndpointResponseStatus.FAIL,
				ApiEndpointResponseStatus.PROCESSING,
			];

			for (const status of statuses) {
				expect(Object.values(ApiEndpointResponseStatus).includes(status)).toBe(
					true,
				);
			}
		});
	});

	describe("JSON serialization", () => {
		it("should serialize to JSON correctly", () => {
			const obj = { status: ApiEndpointResponseStatus.SUCCESS };
			const json = JSON.stringify(obj);
			expect(json).toBe('{"status":"SUCCESS"}');
		});

		it("should deserialize from JSON correctly", () => {
			const json = '{"status":"SUCCESS"}';
			const obj = JSON.parse(json);
			expect(obj.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		});

		it("should maintain value through serialization roundtrip", () => {
			const statuses = [
				ApiEndpointResponseStatus.SUCCESS,
				ApiEndpointResponseStatus.FAIL,
				ApiEndpointResponseStatus.PROCESSING,
			];

			for (const status of statuses) {
				const obj = { status };
				const json = JSON.stringify(obj);
				const parsed = JSON.parse(json);
				expect(parsed.status).toBe(status);
			}
		});
	});
});

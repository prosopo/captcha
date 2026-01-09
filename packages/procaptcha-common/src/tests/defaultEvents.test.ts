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
import { describe, expect, it, vi } from "vitest";
import { getDefaultEvents } from "../callbacks/defaultEvents.js";

describe("callbacks/defaultEvents", () => {
	describe("getDefaultEvents", () => {
		it("should merge default callbacks with provided callbacks", () => {
			const customCallback = vi.fn();
			const events = getDefaultEvents({
				onHuman: customCallback,
			});

			expect(events.onHuman).toBe(customCallback);
			expect(typeof events.onError).toBe("function");
			expect(typeof events.onExpired).toBe("function");
		});

		it("should return all default callbacks when no custom callbacks provided", () => {
			const events = getDefaultEvents({});

			expect(typeof events.onHuman).toBe("function");
			expect(typeof events.onChallengeExpired).toBe("function");
			expect(typeof events.onExtensionNotFound).toBe("function");
			expect(typeof events.onExpired).toBe("function");
			expect(typeof events.onError).toBe("function");
			expect(typeof events.onClose).toBe("function");
			expect(typeof events.onOpen).toBe("function");
			expect(typeof events.onFailed).toBe("function");
			expect(typeof events.onReset).toBe("function");
			expect(typeof events.onReload).toBe("function");
		});

		it("should allow overriding multiple callbacks", () => {
			const customOnError = vi.fn();
			const customOnExpired = vi.fn();
			const customOnClose = vi.fn();

			const events = getDefaultEvents({
				onError: customOnError,
				onExpired: customOnExpired,
				onClose: customOnClose,
			});

			expect(events.onError).toBe(customOnError);
			expect(events.onExpired).toBe(customOnExpired);
			expect(events.onClose).toBe(customOnClose);
			expect(typeof events.onHuman).toBe("function");
			expect(typeof events.onFailed).toBe("function");
		});

		it("should preserve default behavior for non-overridden callbacks", () => {
			const customOnHuman = vi.fn();

			const events = getDefaultEvents({
				onHuman: customOnHuman,
			});

			// Test that custom callback is used
			expect(events.onHuman).toBe(customOnHuman);

			// Test that other callbacks still exist and are functions
			expect(typeof events.onError).toBe("function");
			expect(typeof events.onExpired).toBe("function");
			expect(typeof events.onChallengeExpired).toBe("function");
		});
	});
});

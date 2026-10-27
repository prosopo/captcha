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

import { beforeEach, describe, expect, it } from "vitest";
import {
	DNS_SIDECAR_HEALTHY_WINDOW_MS,
	isDnsSidecarHealthy,
	recordDnsSidecarBatch,
	resetDnsSidecarHealth,
} from "../../../../tasks/dnsEvent/dnsSidecarHealth.js";

describe("dnsSidecarHealth", () => {
	const batchAt = new Date("2026-10-27T12:00:00Z");
	const msAfterBatch = (ms: number): Date => new Date(batchAt.getTime() + ms);

	beforeEach(() => {
		resetDnsSidecarHealth();
	});

	it("is unhealthy before any batch has arrived", () => {
		expect(isDnsSidecarHealthy(batchAt)).toBe(false);
	});

	it("is healthy right after a batch", () => {
		recordDnsSidecarBatch(batchAt);
		expect(isDnsSidecarHealthy(batchAt)).toBe(true);
	});

	it("stays healthy up to the end of the window", () => {
		recordDnsSidecarBatch(batchAt);
		expect(
			isDnsSidecarHealthy(msAfterBatch(DNS_SIDECAR_HEALTHY_WINDOW_MS)),
		).toBe(true);
	});

	it("goes unhealthy once the window has passed", () => {
		recordDnsSidecarBatch(batchAt);
		expect(
			isDnsSidecarHealthy(msAfterBatch(DNS_SIDECAR_HEALTHY_WINDOW_MS + 1)),
		).toBe(false);
	});

	it("a later batch extends the window", () => {
		recordDnsSidecarBatch(batchAt);
		recordDnsSidecarBatch(msAfterBatch(DNS_SIDECAR_HEALTHY_WINDOW_MS));
		expect(
			isDnsSidecarHealthy(msAfterBatch(2 * DNS_SIDECAR_HEALTHY_WINDOW_MS)),
		).toBe(true);
	});
});

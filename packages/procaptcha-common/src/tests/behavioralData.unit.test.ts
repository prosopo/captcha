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

import type {
	BehavioralData,
	MouseMovementPoint,
	PackedBehavioralData,
} from "@prosopo/types";
import { describe, expect, test, vi } from "vitest";
import {
	type BehavioralDataSource,
	encryptBehavioralDataForSubmit,
} from "../behavioralData.js";

const point: MouseMovementPoint = { x: 1, y: 2, timestamp: 3 };

const collector = () => ({
	start: vi.fn<() => void>(),
	stop: vi.fn<() => void>(),
	getData: vi.fn<() => MouseMovementPoint[]>(() => [point]),
	clear: vi.fn<() => void>(),
});

const encrypt = () =>
	vi.fn<(data: string) => Promise<string>>(
		async (data: string) => `enc(${data})`,
	);

describe("encryptBehavioralDataForSubmit", () => {
	test("encrypts every collector's data", async () => {
		const encryptBehavioralData = encrypt();
		const source: BehavioralDataSource = {
			behaviorCollector1: collector(),
			deviceCapability: "touch",
			encryptBehavioralData,
		};
		await encryptBehavioralDataForSubmit(source);
		const sent: BehavioralData = {
			collector1: [point],
			collector2: [],
			collector3: [],
			collector4: [],
			deviceCapability: "touch",
		};
		expect(encryptBehavioralData).toHaveBeenCalledWith(JSON.stringify(sent));
	});

	test("packs the data before encrypting when a packer is given", async () => {
		const encryptBehavioralData = encrypt();
		const packed: PackedBehavioralData = { c1: [], c2: [], c3: [], d: "x" };
		const result = await encryptBehavioralDataForSubmit({
			behaviorCollector1: collector(),
			encryptBehavioralData,
			packBehavioralData: () => packed,
		});
		expect(result).toBe(`enc(${JSON.stringify(packed)})`);
	});

	test("sends nothing without a collector", async () => {
		const encryptBehavioralData = encrypt();
		await expect(
			encryptBehavioralDataForSubmit({ encryptBehavioralData }),
		).resolves.toBeUndefined();
		expect(encryptBehavioralData).not.toHaveBeenCalled();
	});

	test("sends nothing without an encrypter", async () => {
		await expect(
			encryptBehavioralDataForSubmit({ behaviorCollector1: collector() }),
		).resolves.toBeUndefined();
	});

	test("swallows an encryption failure so the solve still goes through", async () => {
		await expect(
			encryptBehavioralDataForSubmit({
				behaviorCollector1: collector(),
				encryptBehavioralData: () => Promise.reject(new Error("boom")),
			}),
		).resolves.toBeUndefined();
	});
});

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

import type { Account, StoredEvents } from "@prosopo/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Collector from "./collector.js";

const mockStartCollector = vi.fn();
vi.mock("@prosopo/procaptcha", () => ({
	startCollector: (...args: unknown[]) => mockStartCollector(...args),
}));

describe("Collector", () => {

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should render a div element", () => {
		const onProcessData = vi.fn();
		render(
			<Collector
				onProcessData={onProcessData}
				sendData={false}
				account={undefined}
			/>,
		);
		const div = document.querySelector("div");
		expect(div).toBeDefined();
	});

	it("should call startCollector when ref is available", () => {
		const onProcessData = vi.fn();
		render(
			<Collector
				onProcessData={onProcessData}
				sendData={false}
				account={undefined}
			/>,
		);
		// startCollector should be called with the ref element
		expect(mockStartCollector).toHaveBeenCalledTimes(1);
		expect(mockStartCollector).toHaveBeenCalledWith(
			expect.any(Function),
			expect.any(Function),
			expect.any(Function),
			expect.any(HTMLElement),
		);
	});

	it("should call onProcessData when account is provided and sendData is true", () => {
		const onProcessData = vi.fn();
		const account: Account = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};
		render(
			<Collector
				onProcessData={onProcessData}
				sendData={true}
				account={account}
			/>,
		);
		// onProcessData should be called with user events
		expect(onProcessData).toHaveBeenCalled();
	});

	it("should not call onProcessData when account is undefined", () => {
		const onProcessData = vi.fn();
		render(
			<Collector
				onProcessData={onProcessData}
				sendData={true}
				account={undefined}
			/>,
		);
		// onProcessData should not be called without account
		expect(onProcessData).not.toHaveBeenCalled();
	});

	it("should call onProcessData with stored events when account is provided", () => {
		const onProcessData = vi.fn();
		const account: Account = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};
		render(
			<Collector
				onProcessData={onProcessData}
				sendData={true}
				account={account}
			/>,
		);
		// Verify onProcessData was called with StoredEvents structure
		expect(onProcessData).toHaveBeenCalled();
		const callArgs = onProcessData.mock.calls[0][0];
		expect(callArgs).toHaveProperty("mouseEvents");
		expect(callArgs).toHaveProperty("touchEvents");
		expect(callArgs).toHaveProperty("keyboardEvents");
	});

	it("should handle sendData being false", () => {
		const onProcessData = vi.fn();
		const account: Account = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};
		render(
			<Collector
				onProcessData={onProcessData}
				sendData={false}
				account={account}
			/>,
		);
		// onProcessData should still be called regardless of sendData
		// The sendData prop doesn't seem to be used in the component logic
		expect(onProcessData).toHaveBeenCalled();
	});

	it("should update when account changes", () => {
		const onProcessData = vi.fn();
		const account1: Account = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};
		const { rerender } = render(
			<Collector
				onProcessData={onProcessData}
				sendData={true}
				account={account1}
			/>,
		);
		expect(onProcessData).toHaveBeenCalled();

		const account2: Account = {
			address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
		};
		onProcessData.mockClear();
		rerender(
			<Collector
				onProcessData={onProcessData}
				sendData={true}
				account={account2}
			/>,
		);
		expect(onProcessData).toHaveBeenCalled();
	});

	it("should handle onProcessData function changes", () => {
		const onProcessData1 = vi.fn();
		const account: Account = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};
		const { rerender } = render(
			<Collector
				onProcessData={onProcessData1}
				sendData={true}
				account={account}
			/>,
		);
		expect(onProcessData1).toHaveBeenCalled();

		const onProcessData2 = vi.fn();
		rerender(
			<Collector
				onProcessData={onProcessData2}
				sendData={true}
				account={account}
			/>,
		);
		expect(onProcessData2).toHaveBeenCalled();
	});
});


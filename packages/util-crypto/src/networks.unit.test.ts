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
import { availableNetworks } from "./networks.js";

describe("availableNetworks", (): void => {
	it("is an array", (): void => {
		expect(Array.isArray(availableNetworks)).toBe(true);
	});

	it("is not empty", (): void => {
		expect(availableNetworks.length).toBeGreaterThan(0);
	});

	it("contains substrate network", (): void => {
		const substrate = availableNetworks.find((n) => n.network === "substrate");
		expect(substrate).toBeDefined();
	});

	it("substrate network has correct prefix", (): void => {
		const substrate = availableNetworks.find((n) => n.network === "substrate");
		expect(substrate?.prefix).toBe(42);
	});

	it("substrate network has correct display name", (): void => {
		const substrate = availableNetworks.find((n) => n.network === "substrate");
		expect(substrate?.displayName).toBe("Substrate");
	});

	it("substrate network has symbols array", (): void => {
		const substrate = availableNetworks.find((n) => n.network === "substrate");
		expect(Array.isArray(substrate?.symbols)).toBe(true);
	});

	it("substrate network has decimals array", (): void => {
		const substrate = availableNetworks.find((n) => n.network === "substrate");
		expect(Array.isArray(substrate?.decimals)).toBe(true);
	});

	it("substrate network has standardAccount", (): void => {
		const substrate = availableNetworks.find((n) => n.network === "substrate");
		expect(substrate?.standardAccount).toBe("*25519");
	});

	it("substrate network has website", (): void => {
		const substrate = availableNetworks.find((n) => n.network === "substrate");
		expect(substrate?.website).toBe("https://substrate.io/");
	});

	it("all networks have required properties", (): void => {
		for (const network of availableNetworks) {
			expect(network).toHaveProperty("prefix");
			expect(network).toHaveProperty("network");
			expect(network).toHaveProperty("displayName");
			expect(network).toHaveProperty("symbols");
			expect(network).toHaveProperty("decimals");
			expect(network).toHaveProperty("standardAccount");
			expect(network).toHaveProperty("website");
		}
	});

	it("all network prefixes are numbers", (): void => {
		for (const network of availableNetworks) {
			expect(typeof network.prefix).toBe("number");
		}
	});

	it("all network names are strings", (): void => {
		for (const network of availableNetworks) {
			expect(typeof network.network).toBe("string");
			expect(typeof network.displayName).toBe("string");
		}
	});
});

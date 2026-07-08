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
import { findLoadBalancerPools } from "../pools.js";
import {
	type BunnyRecord,
	BunnyRecordType,
	type BunnyZone,
	SmartRoutingType,
} from "../types.js";

const rec = (
	Id: number,
	Name: string,
	Type: BunnyRecordType,
	Value: string,
	smart: SmartRoutingType = SmartRoutingType.Latency,
): BunnyRecord => ({
	Id,
	Name,
	Type,
	Value,
	Weight: 100,
	Ttl: 15,
	SmartRoutingType: smart,
});

const zone = (Records: BunnyRecord[]): BunnyZone => ({
	Id: 1,
	Domain: "prosopo.io",
	Records,
});

describe("findLoadBalancerPools", () => {
	it("finds A and AAAA pools for a managed subdomain", () => {
		const zones = [
			zone([
				rec(1, "pronode", BunnyRecordType.A, "10.0.0.1"),
				rec(2, "pronode", BunnyRecordType.A, "10.0.0.2"),
				rec(3, "pronode", BunnyRecordType.AAAA, "2001:db8::1"),
				rec(4, "pronode", BunnyRecordType.AAAA, "2001:db8::2"),
			]),
		];
		const pools = findLoadBalancerPools(zones, ["pronode"]);
		expect(pools.length).toBe(2);
		const a = pools.find((p) => p.type === BunnyRecordType.A);
		expect(a?.members.map((m) => m.Value)).toEqual(["10.0.0.1", "10.0.0.2"]);
	});

	it("excludes subdomains that are not managed", () => {
		const zones = [
			zone([
				rec(1, "pronode", BunnyRecordType.A, "10.0.0.1"),
				rec(2, "pronode", BunnyRecordType.A, "10.0.0.2"),
				rec(3, "other", BunnyRecordType.A, "10.0.0.3"),
				rec(4, "other", BunnyRecordType.A, "10.0.0.4"),
			]),
		];
		const pools = findLoadBalancerPools(zones, ["pronode"]);
		expect(pools.length).toBe(1);
		expect(pools[0]?.name).toBe("pronode");
	});

	it("treats a single record with smart routing as a load balancer", () => {
		const zones = [
			zone([
				rec(1, "pronode", BunnyRecordType.A, "10.0.0.1", SmartRoutingType.Latency),
			]),
		];
		expect(findLoadBalancerPools(zones, ["pronode"]).length).toBe(1);
	});

	it("ignores a single record with no smart routing", () => {
		const zones = [
			zone([
				rec(1, "pronode", BunnyRecordType.A, "10.0.0.1", SmartRoutingType.None),
			]),
		];
		expect(findLoadBalancerPools(zones, ["pronode"]).length).toBe(0);
	});

	it("ignores non-address record types", () => {
		const zones = [
			zone([
				rec(1, "pronode", BunnyRecordType.CNAME, "target.example.com"),
				rec(2, "pronode", BunnyRecordType.CNAME, "target2.example.com"),
			]),
		];
		expect(findLoadBalancerPools(zones, ["pronode"]).length).toBe(0);
	});
});

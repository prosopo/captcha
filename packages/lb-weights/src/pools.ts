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
import {
	type BunnyRecord,
	BunnyRecordType,
	type BunnyZone,
	SmartRoutingType,
} from "./types.js";

// A load-balanced set of address records under a single subdomain.
export interface LoadBalancerPool {
	zoneId: number;
	domain: string;
	// Record name (subdomain) within the zone, e.g. "pronode".
	name: string;
	type: BunnyRecordType;
	// The member records; each member's `Value` is the node's IP address.
	members: BunnyRecord[];
}

const ADDRESS_TYPES: ReadonlySet<BunnyRecordType> = new Set([
	BunnyRecordType.A,
	BunnyRecordType.AAAA,
]);

// A pool counts as "load balancer type" if it has smart routing enabled or has
// more than one member sharing the same name + type.
function isLoadBalancer(members: readonly BunnyRecord[]): boolean {
	if (members.length > 1) {
		return true;
	}
	return members.some(
		(member) => member.SmartRoutingType !== SmartRoutingType.None,
	);
}

/**
 * Find the address-record pools, across all zones, whose subdomain is in the
 * managed set and which are of load-balancer type. IPv4 (A) and IPv6 (AAAA)
 * pools for the same subdomain are returned as separate pools.
 */
export function findLoadBalancerPools(
	zones: readonly BunnyZone[],
	subdomains: readonly string[],
): LoadBalancerPool[] {
	const managed = new Set(subdomains);
	const pools: LoadBalancerPool[] = [];
	for (const zone of zones) {
		const groups = new Map<string, BunnyRecord[]>();
		for (const record of zone.Records) {
			if (!ADDRESS_TYPES.has(record.Type)) {
				continue;
			}
			if (!managed.has(record.Name)) {
				continue;
			}
			const key = `${record.Name} ${record.Type}`;
			const existing = groups.get(key);
			if (existing) {
				existing.push(record);
			} else {
				groups.set(key, [record]);
			}
		}
		for (const members of groups.values()) {
			const first = members[0];
			if (first === undefined || !isLoadBalancer(members)) {
				continue;
			}
			pools.push({
				zoneId: zone.Id,
				domain: zone.Domain,
				name: first.Name,
				type: first.Type,
				members,
			});
		}
	}
	return pools;
}

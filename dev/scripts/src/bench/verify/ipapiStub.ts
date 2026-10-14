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

import { type Server, createServer } from "node:http";
import type { IPApiResponse } from "@prosopo/types";

const residentialResponse = (ip: string): IPApiResponse => ({
	ip,
	rir: "RIPE",
	is_bogon: false,
	is_mobile: false,
	is_satellite: false,
	is_crawler: false,
	is_datacenter: false,
	is_tor: false,
	is_proxy: false,
	is_vpn: false,
	is_abuser: false,
	asn: {
		asn: 2856,
		abuser_score: "0.0001 (Very Low)",
		route: "81.128.0.0/12",
		descr: "BT-UK-AS",
		country: "gb",
		active: true,
		org: "British Telecommunications PLC",
		domain: "bt.com",
		abuse: "abuse@bt.com",
		type: "isp",
		created: "1993-01-01",
		updated: "2026-01-01",
		rir: "RIPE",
		whois: "",
	},
	location: {
		is_eu_member: false,
		calling_code: "44",
		currency_code: "GBP",
		continent: "EU",
		country: "United Kingdom",
		country_code: "GB",
		state: "England",
		city: "London",
		latitude: 51.5,
		longitude: -0.12,
		zip: "EC1A",
		timezone: "Europe/London",
		local_time: "",
		local_time_unix: 0,
		is_dst: false,
	},
	elapsed_ms: 0.1,
});

/**
 * Stands in for the ipapi.is sidecar: answers every lookup with a clean
 * residential record and counts how many lookups the provider made, which is
 * one of the per-verify costs the bench reports.
 */
export class IpapiStub {
	private server: Server | undefined;
	private count = 0;

	constructor(private readonly port: number) {}

	get lookups(): number {
		return this.count;
	}

	async start(): Promise<void> {
		this.server = createServer((req, res) => {
			let body = "";
			req.on("data", (chunk: Buffer) => {
				body += chunk.toString();
			});
			req.on("end", () => {
				this.count++;
				const { q } = JSON.parse(body || "{}") as { q?: string };
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(residentialResponse(q ?? "")));
			});
		});
		await new Promise<void>((resolve) =>
			this.server?.listen(this.port, "0.0.0.0", resolve),
		);
	}

	async stop(): Promise<void> {
		await new Promise<void>((resolve) => this.server?.close(() => resolve()));
	}
}

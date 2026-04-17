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

import type { IPInfoResponse } from "@prosopo/types";
import { IpapiBackend } from "./backends/ipapi.js";
import { MaxMindBackend } from "./backends/maxmind.js";
import type { IIpInfoService, IpInfoServiceConfig } from "./types.js";

export class IpInfoService implements IIpInfoService {
	private maxmindBackend: MaxMindBackend | null = null;
	private ipapiBackend: IpapiBackend | null = null;
	private config: IpInfoServiceConfig;

	constructor(config: IpInfoServiceConfig) {
		this.config = config;

		if (config.maxmindCityDbPath || config.maxmindAsnDbPath) {
			this.maxmindBackend = new MaxMindBackend({
				cityDbPath: config.maxmindCityDbPath,
				asnDbPath: config.maxmindAsnDbPath,
				logger: config.logger,
			});
		}

		if (config.ipapiUrl) {
			this.ipapiBackend = new IpapiBackend({
				baseUrl: config.ipapiUrl,
				apiKey: config.ipapiKey,
				logger: config.logger,
			});
		}
	}

	async initialize(): Promise<void> {
		if (this.maxmindBackend) {
			await this.maxmindBackend.initialize();
		}

		this.config.logger?.info(() => ({
			msg: "IpInfoService initialized",
			data: {
				maxmindAvailable: this.maxmindBackend?.isAvailable() ?? false,
				ipapiAvailable: this.ipapiBackend?.isAvailable() ?? false,
			},
		}));
	}

	isAvailable(): boolean {
		return (
			(this.maxmindBackend?.isAvailable() ?? false) ||
			(this.ipapiBackend?.isAvailable() ?? false)
		);
	}

	async lookup(ip: string): Promise<IPInfoResponse> {
		// Prefer ipapi.is when available (richer threat data)
		if (this.ipapiBackend?.isAvailable()) {
			const result = await this.ipapiBackend.lookup(ip);
			if (result.isValid) {
				return result;
			}

			// ipapi.is failed, fall back to MaxMind if available
			this.config.logger?.debug(() => ({
				msg: "ipapi.is lookup failed, falling back to MaxMind",
				data: {
					ip,
					error: "error" in result ? result.error : "unknown",
				},
			}));

			if (this.maxmindBackend?.isAvailable()) {
				return this.maxmindBackend.lookup(ip);
			}

			// Return the ipapi error if no MaxMind fallback
			return result;
		}

		// MaxMind only
		if (this.maxmindBackend?.isAvailable()) {
			return this.maxmindBackend.lookup(ip);
		}

		return {
			isValid: false,
			error: "No IP info backend available",
			ip,
		};
	}
}

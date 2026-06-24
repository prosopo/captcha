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
	type ApiEndpoint,
	type ApiEndpointResponse,
	ApiEndpointResponseStatus,
} from "@prosopo/api-route";
import type { IIpInfoService } from "@prosopo/ipinfo";
import { type Logger, getLogger } from "@prosopo/logger";
import { type DnsEvent, DnsEventBatchSchema } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { z } from "zod";
import {
	computeDnsAsymmetry,
	enrichDnsEvent,
} from "../../tasks/dnsEvent/enrichDnsEvent.js";

type DnsEventBatchSchemaType = typeof DnsEventBatchSchema;

// Exported for unit tests — picks out the field(s) one DnsEvent contributes.
export const dnsEventToFields = (
	event: DnsEvent,
): { resolverIp?: string; peerIp?: string; pathValid?: boolean } => {
	if (event.kind === "dns") {
		return { resolverIp: event.src_ip };
	}
	const out: { peerIp: string; pathValid?: boolean } = {
		peerIp: event.src_ip,
	};
	if (typeof event.path_valid === "boolean") {
		out.pathValid = event.path_valid;
	}
	return out;
};

class ApiDnsEventEndpoint implements ApiEndpoint<DnsEventBatchSchemaType> {
	public constructor(
		private readonly db: IProviderDatabase,
		private readonly ipInfoService?: IIpInfoService,
	) {}

	async processRequest(
		args: z.infer<DnsEventBatchSchemaType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", "provider:admin:dnsEvent");
		const { events } = args;

		let stored = 0;
		let errors = 0;
		const now = new Date();

		for (const event of events) {
			const sessionId = event.jti;
			if (!sessionId) {
				continue;
			}

			try {
				const fields = dnsEventToFields(event);
				const matched = await this.db.mergeSessionDnsEvent(
					sessionId,
					fields,
					now,
				);
				if (matched) {
					stored += 1;
					await this.recomputeDnsAsymmetry(sessionId, logger);
				}
			} catch (err) {
				errors += 1;
				logger.warn(() => ({
					err,
					data: { sessionId, kind: event.kind },
					msg: "Failed to merge DNS event into session",
				}));
			}
		}

		logger.info(() => ({
			data: { received: events.length, stored, errors },
			msg: "Processed DNS event batch",
		}));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: { stored, errors },
		};
	}

	public getRequestArgsSchema(): DnsEventBatchSchemaType {
		return DnsEventBatchSchema;
	}

	private async recomputeDnsAsymmetry(
		sessionId: string,
		logger: Logger,
	): Promise<void> {
		if (!this.ipInfoService) return;
		try {
			const session = await this.db.getSessionRecordBySessionId(sessionId);
			if (!session?.dnsEvent) return;
			const enriched = await enrichDnsEvent(
				session.dnsEvent,
				this.ipInfoService,
				session.ipInfo?.ip,
			);
			const dnsAsymmetry = computeDnsAsymmetry(enriched, session.ipInfo);
			if (dnsAsymmetry > 0) {
				await this.db.updateSessionRecord(sessionId, {
					scoreComponents: {
						...session.scoreComponents,
						dnsAsymmetry,
					},
				});
			}
		} catch (err) {
			logger.warn(() => ({
				err,
				data: { sessionId },
				msg: "Failed to recompute dnsAsymmetry after DNS event merge",
			}));
		}
	}
}

export { ApiDnsEventEndpoint };

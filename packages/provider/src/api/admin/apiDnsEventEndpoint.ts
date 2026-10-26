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
import {
	type DnsEvent,
	DnsEventIngestBatchSchema,
	DnsEventSchema,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { z } from "zod";
import {
	computeDnsAsymmetry,
	enrichDnsEvent,
} from "../../tasks/dnsEvent/enrichDnsEvent.js";

// Only the first few invalid events are described in the log line so a
// fully-garbage batch cannot produce an unbounded log entry.
const MAX_LOGGED_INVALID = 5;

type DnsEventBatchSchemaType = typeof DnsEventIngestBatchSchema;

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
		logger = logger
			? logger.with({}, "admin:dns-event:ingest")
			: getLogger("info", "provider:admin:dns-event:ingest");
		const { events } = args;

		let stored = 0;
		let errors = 0;
		let dropped = 0;
		const invalid: { index: number; issues: string[] }[] = [];
		const now = new Date();

		for (const [index, raw] of events.entries()) {
			const parsed = DnsEventSchema.safeParse(raw);
			if (!parsed.success) {
				dropped += 1;
				if (invalid.length < MAX_LOGGED_INVALID) {
					invalid.push({
						index,
						issues: parsed.error.issues.map(
							(issue) => `${issue.path.join(".")}: ${issue.message}`,
						),
					});
				}
				continue;
			}
			const event = parsed.data;
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

		if (dropped > 0) {
			logger.warn(() => ({
				data: { received: events.length, dropped, invalid },
				msg: "Dropped invalid DNS events from batch",
			}));
		}

		logger.info(() => ({
			data: { received: events.length, stored, errors, dropped },
			msg: "Processed DNS event batch",
		}));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: { stored, errors, dropped },
		};
	}

	public getRequestArgsSchema(): DnsEventBatchSchemaType {
		return DnsEventIngestBatchSchema;
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
			// Admin recompute path — intentionally omits trafficFilter so the
			// stored score reflects the raw DNS-path signal, independent of the
			// site's current filter config. Live captcha decisions pass
			// trafficFilter (see powTasks / imgCaptchaTasks / puzzleTasks).
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

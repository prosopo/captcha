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
import { type Logger, getLogger } from "@prosopo/logger";
import {
	type DnsEvent,
	DnsEventBatchSchema,
	type Session,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { z } from "zod";

type DnsEventBatchSchemaType = typeof DnsEventBatchSchema;

// Exported for unit tests.
export const dnsEventToPartialSession = (
	event: DnsEvent,
	existing: Session["dnsEvent"] | undefined,
): Session["dnsEvent"] => {
	const receivedAt = existing?.receivedAt ?? new Date();
	const merged: Session["dnsEvent"] = { ...(existing ?? {}), receivedAt };
	if (event.kind === "dns") {
		merged.resolverIp = event.src_ip;
	} else {
		merged.peerIp = event.src_ip;
		if (typeof event.path_valid === "boolean") {
			merged.pathValid = event.path_valid;
		}
	}
	return merged;
};

class ApiDnsEventEndpoint implements ApiEndpoint<DnsEventBatchSchemaType> {
	public constructor(private readonly db: IProviderDatabase) {}

	async processRequest(
		args: z.infer<DnsEventBatchSchemaType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", import.meta.url);
		const { events } = args;

		let stored = 0;
		let errors = 0;

		for (const event of events) {
			const sessionId = event.jti;
			if (!sessionId) {
				continue;
			}

			try {
				const session = await this.db.getSessionRecordBySessionId(sessionId);
				if (!session) {
					continue;
				}
				const dnsEvent = dnsEventToPartialSession(event, session.dnsEvent);
				await this.db.updateSessionRecord(sessionId, { dnsEvent });
				stored += 1;
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
}

export { ApiDnsEventEndpoint };

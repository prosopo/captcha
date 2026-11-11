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
import type { FingerprintSummaryStored, Tier } from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import { flatten } from "@prosopo/util";
import type { Request } from "express";
import type { AugmentedRequest } from "../../express.js";
import type { PostPowRoutingContext } from "../../tasks/powCaptcha/powTasks.js";
import { deriveTrafficPolicies } from "../../utils/devicePlatform.js";
import { rawTlsSignalsForSession } from "../rawTlsSignalsMiddleware.js";

/**
 * The submit request's half of a post-solve routing pass. The captcha manager
 * adds score, accounts and the solve itself once it has the challenge record.
 */
export const buildPostSolveRoutingContext = (
	req: Request & AugmentedRequest,
	clientRecord: Pick<ClientRecord, "tier" | "settings">,
	proof: {
		fingerprintProof?: string;
		fingerprintSummary?: FingerprintSummaryStored;
	} = {},
): PostPowRoutingContext => {
	const flatHeaders = flatten(req.headers);
	const userAgent = req.headers["user-agent"] ?? "";
	const countryCode =
		req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
			? req.ipInfo.countryCode
			: undefined;
	const trafficPolicies = deriveTrafficPolicies(
		clientRecord.settings?.trafficFilter,
	);
	const tier: Tier | undefined = clientRecord.tier;
	return {
		tier,
		ip: req.ip || "",
		countryCode,
		device: {
			userAgent,
			headers: flatHeaders,
			ipInfo: req.ipInfo,
			tcpMss: req.tcpMss,
		},
		raw: {
			headers: flatHeaders,
			userAgent,
			...(req.ja4 && { ja4: req.ja4 }),
			...(proof.fingerprintProof && {
				fingerprintProof: proof.fingerprintProof,
			}),
			...(proof.fingerprintSummary && {
				fingerprintSummary: proof.fingerprintSummary,
			}),
			...(req.tcpToChelloUs !== undefined && {
				tcpToChelloUs: req.tcpToChelloUs,
			}),
			...(req.chelloToHandshakeUs !== undefined && {
				chelloToHandshakeUs: req.chelloToHandshakeUs,
			}),
			...rawTlsSignalsForSession(req),
			// Looked up fresh on this request, so it is the submit hop's IP, not
			// the frictionless entry hop's. Only the isValid:true branch of the
			// union carries anything a rule can use.
			...(req.ipInfo &&
				"isValid" in req.ipInfo &&
				req.ipInfo.isValid && { ipInfo: req.ipInfo }),
			// Which egress categories this site blocks, so egress-sensitive
			// route rules can skip sites that accept VPN / proxy / DC users.
			...(trafficPolicies && { trafficPolicies }),
		},
	};
};

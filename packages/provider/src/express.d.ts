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

import type { Logger } from "@prosopo/logger";
import type { IPInfoResponse } from "@prosopo/types";
import type { TFunction } from "i18next";
export interface AugmentedRequest {
	t: TFunction;
	i18n: {
		t: TFunction;
	};
	user?: string;
	siteKey?: string;
	ja4: string;
	logger: Logger;
	requestId?: string;
	ipInfo?: IPInfoResponse;
	// Per-TLS-connection handshake timings forwarded by the chaddy Caddy
	// plugin (X-TLS-TCP-To-Chello-Ms / X-TLS-Chello-To-Handshake-Ms).
	// Undefined when the request did not traverse a TLS-terminating
	// Caddy with the chaddy plugin (e.g. plaintext dev requests) or when
	// the plugin failed to capture timing for that connection.
	tcpToChelloMs?: number;
	chelloToHandshakeMs?: number;
}

declare global {
	namespace Express {
		interface Request {
			t: TFunction;
			i18n: {
				t: TFunction;
			};
			user?: string;
			siteKey?: string;
			ja4: string;
			logger: Logger;
			requestId?: string;
			ipInfo?: IPInfoResponse;
			tcpToChelloMs?: number;
			chelloToHandshakeMs?: number;
		}
	}
}

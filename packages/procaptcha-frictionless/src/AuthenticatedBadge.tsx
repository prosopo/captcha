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

// Widget for the `authenticated` captcha outcome — no user-facing challenge,
// just a visible acknowledgement that Web Bot Auth verification succeeded.
// Mounts once, immediately encodes a ProcaptchaToken with the sessionId as
// its commitmentId (matching what /client/authenticated/verify decodes) and
// fires `onHuman`. The badge itself is purely presentational; the token
// submission happens in the mount effect.
//
// The token carries empty signature bags (`{provider: {}, user: {}}`) — the
// authenticated verify endpoint does not check the token's user or provider
// signatures because there was no captcha challenge to sign. Only the dApp
// server's signature on the timestamp is checked at verify time, and that
// is applied by the dApp on the way to /verify (not by the widget here).

import { getDefaultEvents } from "@prosopo/procaptcha-common";
import {
	type Account,
	ApiParams,
	CaptchaType,
	type ProcaptchaCallbacks,
	type RandomProvider,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { type FC, useEffect, useRef } from "react";

export type AuthenticatedBadgeProps = {
	sessionId: string;
	agent?: string;
	dapp: string;
	userAccount: Account;
	provider: RandomProvider;
	callbacks: ProcaptchaCallbacks;
};

const displayHost = (agent?: string): string => {
	if (!agent) return "unknown";
	try {
		return new URL(agent).hostname;
	} catch {
		return agent;
	}
};

export const AuthenticatedBadge: FC<AuthenticatedBadgeProps> = ({
	sessionId,
	agent,
	dapp,
	userAccount,
	provider,
	callbacks,
}) => {
	// One-shot: React 18 StrictMode double-invokes effects in development;
	// this guard makes sure the token is emitted exactly once even under
	// double-mount. Production doesn't double-invoke, so this is a
	// belt-and-braces against local-dev confusion.
	const emittedRef = useRef(false);

	useEffect(() => {
		if (emittedRef.current) return;
		emittedRef.current = true;
		const events = getDefaultEvents(callbacks);
		const token = encodeProcaptchaOutput({
			[ApiParams.providerUrl]: provider.provider.url,
			[ApiParams.user]: userAccount.account.address,
			[ApiParams.dapp]: dapp,
			// Verify endpoint reads commitmentId as the sessionId — reusing
			// the existing slot avoids a token codec bump for this one flow.
			[ApiParams.commitmentId]: sessionId,
			[ApiParams.timestamp]: Date.now().toString(),
			[ApiParams.signature]: {
				[ApiParams.provider]: {},
				[ApiParams.user]: {},
			},
			[ApiParams.captchaType]: CaptchaType.authenticated,
		});
		events.onHuman(token);
	}, [sessionId, dapp, userAccount, provider, callbacks]);

	return (
		<div
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 8,
				padding: "8px 12px",
				borderRadius: 6,
				background: "#eef2ff",
				border: "1px solid #c7d2fe",
				color: "#3730a3",
				fontFamily:
					"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
				fontSize: 13,
				lineHeight: 1.4,
			}}
			role="status"
			aria-label="Verified agent"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<title>Verified</title>
				<path d="M20 6L9 17l-5-5" />
			</svg>
			<span>
				{agent ? (
					<>
						<strong>Verified agent</strong>: {displayHost(agent)}
					</>
				) : (
					// No Signature-Agent URL on the response — the operator's Allow
					// rule matched on a non-Web-Bot-Auth condition (IP CIDR, JA4,
					// UA substring, ASN, country). Fall back to generic copy so
					// the operator isn't misled about which qualifier fired.
					<strong>Trusted request</strong>
				)}
			</span>
		</div>
	);
};

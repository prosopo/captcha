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
// submission happens on mount.
//
// The token carries empty signature bags (`{provider: {}, user: {}}`) — the
// authenticated verify endpoint does not check the token's user or provider
// signatures because there was no captcha challenge to sign. Only the dApp
// server's signature on the timestamp is checked at verify time, and that
// is applied by the dApp on the way to /verify (not by the widget here).

import {
	type StaticComponent,
	createElement,
	createSvgElement,
	getDefaultEvents,
} from "@prosopo/procaptcha-common";
import {
	type Account,
	ApiParams,
	CaptchaType,
	type ProcaptchaCallbacks,
	type RandomProvider,
	encodeProcaptchaOutput,
} from "@prosopo/types";

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

const buildLabel = (agent?: string): HTMLElement => {
	if (!agent) {
		// No Signature-Agent URL on the response — the operator's Allow rule
		// matched on a non-Web-Bot-Auth condition (IP CIDR, JA4, UA substring,
		// ASN, country). Fall back to generic copy so the operator isn't misled
		// about which qualifier fired.
		return createElement("span", {
			children: [createElement("strong", { text: "Trusted request" })],
		});
	}
	return createElement("span", {
		children: [
			createElement("strong", { text: "Verified agent" }),
			document.createTextNode(`: ${displayHost(agent)}`),
		],
	});
};

const buildTick = (): SVGSVGElement => {
	const title = createSvgElement("title");
	title.textContent = "Verified";
	return createSvgElement("svg", {
		attributes: {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "2.5",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			"aria-hidden": "true",
		},
		children: [
			title,
			createSvgElement("path", { attributes: { d: "M20 6L9 17l-5-5" } }),
		],
	});
};

export const mountAuthenticatedBadge = (
	container: HTMLElement,
	props: AuthenticatedBadgeProps,
): StaticComponent => {
	const { sessionId, agent, dapp, userAccount, provider, callbacks } = props;

	const badge = createElement("div", {
		style: {
			display: "inline-flex",
			alignItems: "center",
			gap: "8px",
			padding: "8px 12px",
			borderRadius: "6px",
			background: "#eef2ff",
			border: "1px solid #c7d2fe",
			color: "#3730a3",
			fontFamily:
				"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
			fontSize: "13px",
			lineHeight: 1.4,
		},
		attributes: { role: "status", "aria-label": "Verified agent" },
		children: [buildTick(), buildLabel(agent)],
	});

	container.appendChild(badge);

	const events = getDefaultEvents(callbacks);
	const token = encodeProcaptchaOutput({
		[ApiParams.providerUrl]: provider.provider.url,
		[ApiParams.user]: userAccount.account.address,
		[ApiParams.dapp]: dapp,
		// Verify endpoint reads commitmentId as the sessionId — reusing the
		// existing slot avoids a token codec bump for this one flow.
		[ApiParams.commitmentId]: sessionId,
		[ApiParams.timestamp]: Date.now().toString(),
		[ApiParams.signature]: {
			[ApiParams.provider]: {},
			[ApiParams.user]: {},
		},
		[ApiParams.captchaType]: CaptchaType.authenticated,
	});
	events.onHuman(token);

	return {
		update: () => undefined,
		destroy: () => {
			badge.parentNode?.removeChild(badge);
		},
	};
};

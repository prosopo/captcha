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

// Fronts a self-hosted provider that has no public address of its own. The
// widget is served as static assets, and provider API calls are forwarded
// through a Workers VPC binding to the Cloudflare Tunnel the provider sits
// behind.

interface Binding {
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
	ASSETS: Binding;
	PROVIDER: Binding;
	SITE_KEY: string;
}

const isProviderPath = (pathname: string): boolean =>
	pathname.startsWith("/v1/") || pathname === "/healthz";

// The provider reads the client address from the last X-Forwarded-For entry.
// Without this it would see every visitor as the tunnel, and per-IP rate
// limits and access rules would apply to all of them at once.
const forwardToProvider = (
	request: Request,
	url: URL,
	env: Env,
): Promise<Response> => {
	const headers = new Headers(request.headers);
	const visitorIp = request.headers.get("CF-Connecting-IP");
	if (visitorIp) headers.set("X-Forwarded-For", visitorIp);
	headers.set("X-Forwarded-Proto", "https");
	return env.PROVIDER.fetch(`http://provider${url.pathname}${url.search}`, {
		method: request.method,
		headers,
		body: request.body,
		redirect: "manual",
	});
};

const escapeHtml = (value: string): string =>
	value.replace(
		/[&<>"']/g,
		(char) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				char
			] ?? char,
	);

const SITE_KEY_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/;

const demoPage = (siteKey: string, host: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Procaptcha · self-hosted</title>
<script type="module" src="/procaptcha.bundle.js" async defer></script>
<style>
	:root {
		--bg: #f5f6f8; --card: #ffffff; --text: #1d2330; --muted: #5d6677;
		--line: #e2e5eb; --accent: #4b3fe0; --ok: #1f8a5b; --warn: #b26a00;
		--code: #f0f1f4;
	}
	@media (prefers-color-scheme: dark) {
		:root {
			--bg: #12141a; --card: #1b1e26; --text: #e8eaf0; --muted: #a0a7b6;
			--line: #2c303b; --accent: #8f87ff; --ok: #4cc38a; --warn: #f0a640;
			--code: #242833;
		}
	}
	* { box-sizing: border-box; }
	body {
		margin: 0; min-height: 100vh; background: var(--bg); color: var(--text);
		font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
		display: grid; place-items: center; padding: 32px 16px;
	}
	main {
		width: 100%; max-width: 560px; background: var(--card);
		border: 1px solid var(--line); border-radius: 14px; padding: 32px;
		box-shadow: 0 1px 2px rgb(0 0 0 / 4%), 0 8px 24px rgb(0 0 0 / 6%);
	}
	h1 { font-size: 22px; margin: 0 0 4px; }
	.lede { color: var(--muted); margin: 0 0 24px; }
	dl { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; margin: 0 0 24px; font-size: 14px; }
	dt { color: var(--muted); }
	dd { margin: 0; min-width: 0; }
	code { background: var(--code); border-radius: 6px; padding: 2px 6px; font-size: 13px; overflow-wrap: anywhere; }
	.status::before { content: "●"; margin-right: 6px; }
	.status.ok { color: var(--ok); } .status.warn { color: var(--warn); }
	.captcha { border: 1px dashed var(--line); border-radius: 10px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: center; }
	.token-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: var(--muted); }
	button {
		font: inherit; font-size: 13px; color: var(--accent); background: none;
		border: 1px solid var(--line); border-radius: 8px; padding: 4px 10px; cursor: pointer;
	}
	button:disabled { opacity: 0.4; cursor: default; }
	pre {
		margin: 0; background: var(--code); border-radius: 10px; padding: 12px;
		font-size: 12px; white-space: pre-wrap; word-break: break-all; max-height: 160px; overflow: auto;
	}
	.missing { color: var(--warn); }
	footer { margin-top: 24px; font-size: 13px; color: var(--muted); }
	a { color: var(--accent); }
</style>
</head>
<body>
<main>
	<h1>Procaptcha, self-hosted</h1>
	<p class="lede">This page, the widget and the provider API are all served by this Worker. Challenges are answered by your own provider through a Cloudflare Tunnel.</p>
	<dl>
		<dt>Provider</dt><dd><code>https://${escapeHtml(host)}</code></dd>
		<dt>Status</dt><dd><span id="status" class="status">checking…</span></dd>
		<dt>Site key</dt><dd>${siteKey ? `<code>${escapeHtml(siteKey)}</code>` : '<span class="missing">none — add <code>?sitekey=</code> to the URL, or set <code>SITE_KEY</code> in wrangler.jsonc</span>'}</dd>
	</dl>
	${siteKey ? `<form class="captcha"><div class="procaptcha" data-sitekey="${escapeHtml(siteKey)}"></div></form>` : ""}
	<div class="token-head"><span>Response token</span><button id="copy" type="button" disabled>Copy</button></div>
	<pre id="token">Solve the challenge above to get a token.</pre>
	<footer>Verify the token on your server with <a href="https://www.npmjs.com/package/@prosopo/server">@prosopo/server</a>. Guide: <a href="https://docs.prosopo.io/en/self-hosting/">docs.prosopo.io/en/self-hosting</a></footer>
</main>
<script>
	const status = document.getElementById("status");
	fetch("/healthz")
		.then((response) => response.ok ? response.json() : Promise.reject(response.status))
		.then(() => { status.textContent = "provider reachable"; status.classList.add("ok"); })
		.catch(() => { status.textContent = "provider not reachable — is the tunnel running?"; status.classList.add("warn"); });
	const tokenBox = document.getElementById("token");
	const copy = document.getElementById("copy");
	copy.addEventListener("click", () => navigator.clipboard.writeText(tokenBox.textContent));
	setInterval(() => {
		const token = document.querySelector('[name="procaptcha-response"]')?.value;
		if (token && tokenBox.textContent !== token) {
			tokenBox.textContent = token;
			copy.disabled = false;
		}
	}, 500);
</script>
</body>
</html>`;

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (isProviderPath(url.pathname)) {
			return forwardToProvider(request, url, env);
		}
		if (url.pathname === "/") {
			const requested = url.searchParams.get("sitekey") ?? env.SITE_KEY;
			const siteKey = SITE_KEY_PATTERN.test(requested) ? requested : "";
			return new Response(demoPage(siteKey, url.host), {
				headers: { "content-type": "text/html; charset=utf-8" },
			});
		}
		return env.ASSETS.fetch(request);
	},
};

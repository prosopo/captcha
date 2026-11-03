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

import express, { type Router } from "express";

const scriptLiteral = (value: string): string =>
	JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

const page = (inner: string, id: string): string => `<!doctype html>
<meta charset="utf-8">
<body><script>
var f=document.createElement('iframe');
f.src=${scriptLiteral(inner)};
f.onload=function(){window.top.postMessage({p:'n',i:${scriptLiteral(id)}},'*')};
document.body.appendChild(f);
</script></body>`;

const ID_PATTERN = /^[A-Za-z0-9]{1,64}$/;

const probeId = (raw: unknown): string =>
	"string" === typeof raw && ID_PATTERN.test(raw) ? raw : "";

const innerUrl = (raw: unknown): string | undefined => {
	if ("string" !== typeof raw || 0 === raw.length) {
		return undefined;
	}
	try {
		const url = new URL(raw);
		return "http:" === url.protocol || "https:" === url.protocol
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
};

export function assetDocumentRouter(): Router {
	const router = express.Router();

	router.get(/.*/, (req, res, next) => {
		if ("n" !== req.query.m) {
			return next();
		}

		const inner = innerUrl(req.query.u);
		if (!inner) {
			return next();
		}

		const id = probeId(req.query.i);

		res.removeHeader("X-Frame-Options");
		res.set({
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
			"Content-Security-Policy": "frame-ancestors *",
		});
		return res.status(200).send(page(inner, id));
	});

	return router;
}

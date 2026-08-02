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
import { ProsopoApiError, ProsopoError } from "@prosopo/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	FLUX_URL,
	getAuth,
	getIndividualFluxAppDetails,
	main,
	verifyLogin,
} from "./auth.js";

const SECRET_KEY = new Uint8Array(32).fill(7);

interface Request {
	url: string;
	init?: RequestInit;
}

const requests: Request[] = [];
let responses: Response[] = [];

// Every call in this module goes through global `fetch`, so queueing responses
// is enough to drive it without touching a Flux node.
const queue = (body: unknown, status = 200): void => {
	responses.push(
		new Response(JSON.stringify(body), {
			status,
			headers: { "Content-Type": "application/json" },
		}),
	);
};

const loginPhraseResponse = (phrase = "phrase"): void =>
	queue({ status: "success", data: phrase });

beforeEach(() => {
	requests.length = 0;
	responses = [];
	vi.spyOn(globalThis, "fetch").mockImplementation(
		(input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			requests.push({ url: String(input), init });
			const next = responses.shift();
			if (!next) {
				return Promise.reject(new Error(`unexpected fetch: ${String(input)}`));
			}
			return Promise.resolve(next);
		},
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("verifyLogin", () => {
	it("posts the credentials as a form body", async () => {
		queue({ status: "success", data: "ok" });
		await verifyLogin("id", "sig", "phrase");
		const request = requests[0];
		expect(request?.init?.method).toBe("POST");
		expect(request?.init?.body).toBe(
			"zelid=id&signature=sig&loginPhrase=phrase",
		);
	});

	it("posts to the flux verify endpoint by default", async () => {
		queue({ status: "success", data: "ok" });
		await verifyLogin("id", "sig", "phrase");
		expect(requests[0]?.url).toBe(`${FLUX_URL}id/verifylogin`);
	});

	it("posts to a caller supplied node instead", async () => {
		queue({ status: "success", data: "ok" });
		await verifyLogin("id", "sig", "phrase", new URL("http://1.2.3.4:16187/"));
		expect(requests[0]?.url).toBe("http://1.2.3.4:16187/id/verifylogin");
	});

	it("sets the form content type", async () => {
		queue({ status: "success", data: "ok" });
		await verifyLogin("id", "sig", "phrase");
		expect(requests[0]?.init?.headers).toEqual({
			"Content-Type": "application/x-www-form-urlencoded",
		});
	});

	it("throws when the node rejects the login", async () => {
		queue({}, 401);
		await expect(verifyLogin("id", "sig", "phrase")).rejects.toThrow(
			ProsopoApiError,
		);
	});

	it("throws when the node reports an application level error", async () => {
		queue({ status: "error", data: { message: "bad signature" } });
		await expect(verifyLogin("id", "sig", "phrase")).rejects.toThrow(
			ProsopoApiError,
		);
	});
});

describe("getIndividualFluxAppDetails", () => {
	it("queries the bridge with all four parameters", async () => {
		queue({ name: "app", nodes: {} });
		await getIndividualFluxAppDetails("app", "zel", "sig", "phrase");
		expect(requests[0]?.url).toBe(
			"https://jetpackbridge.runonflux.io/api/v1/dapps.php?dapp=app&zelid=zel&signature=sig&loginPhrase=phrase",
		);
	});

	it("returns the parsed app details", async () => {
		queue({ name: "app", nodes: { a: { fluxos: "1.2.3.4:16127" } } });
		const details = await getIndividualFluxAppDetails(
			"app",
			"zel",
			"sig",
			"phrase",
		);
		expect(details.name).toBe("app");
	});

	it("throws when the bridge fails", async () => {
		queue({}, 503);
		await expect(
			getIndividualFluxAppDetails("app", "zel", "sig", "phrase"),
		).rejects.toThrow(ProsopoApiError);
	});
});

describe("getAuth", () => {
	it("fetches a login phrase from the given node", async () => {
		loginPhraseResponse();
		await getAuth(SECRET_KEY, new URL("http://1.2.3.4:16187/"));
		expect(requests[0]?.url).toBe("http://1.2.3.4:16187/id/loginphrase");
	});

	it("returns the phrase alongside a base64 signature of it", async () => {
		loginPhraseResponse("a-phrase");
		const { loginPhrase, signature } = await getAuth(SECRET_KEY, FLUX_URL);
		expect(loginPhrase).toBe("a-phrase");
		expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
	});

	it("signs deterministically for the same phrase", async () => {
		loginPhraseResponse("a-phrase");
		loginPhraseResponse("a-phrase");
		const first = await getAuth(SECRET_KEY, FLUX_URL);
		const second = await getAuth(SECRET_KEY, FLUX_URL);
		expect(first.signature).toBe(second.signature);
	});

	it("throws when the login phrase request fails", async () => {
		queue({}, 500);
		await expect(getAuth(SECRET_KEY, FLUX_URL)).rejects.toThrow(
			ProsopoApiError,
		);
	});
});

describe("main", () => {
	it("returns flux api credentials when neither an app nor an ip is given", async () => {
		loginPhraseResponse("p1");
		const result = await main("zel", SECRET_KEY);
		expect(result.nodeUIURL).toBe(FLUX_URL);
		expect(result.nodeAPIURL.href).toBe(FLUX_URL.href);
		expect(result.nodeLoginPhrase).toBe("p1");
		expect(requests).toHaveLength(1);
	});

	it("skips the flux api handshake when an ip is supplied", async () => {
		loginPhraseResponse("p1");
		const result = await main("zel", SECRET_KEY, undefined, "1.2.3.4:16127");
		expect(result.nodeUIURL.href).toBe("http://1.2.3.4:16127/");
		// the api sits one port above the ui
		expect(result.nodeAPIURL.href).toBe("http://1.2.3.4:16128/");
		expect(requests[0]?.url).toBe("http://1.2.3.4:16128/id/loginphrase");
	});

	it("looks up a node for the app when only an app name is given", async () => {
		loginPhraseResponse("p1");
		queue({ nodes: { a: { fluxos: "5.6.7.8:16127" } } });
		loginPhraseResponse("p2");
		const result = await main("zel", SECRET_KEY, "app");
		expect(result.nodeUIURL.href).toBe("http://5.6.7.8:16127/");
		expect(result.nodeLoginPhrase).toBe("p2");
	});

	it("throws when the app has no nodes to pick from", async () => {
		loginPhraseResponse("p1");
		queue({ nodes: {} });
		await expect(main("zel", SECRET_KEY, "app")).rejects.toThrow(ProsopoError);
	});

	it("signs the node's own login phrase, not the flux one", async () => {
		loginPhraseResponse("p1");
		queue({ nodes: { a: { fluxos: "5.6.7.8:16127" } } });
		loginPhraseResponse("p2");
		const viaMain = await main("zel", SECRET_KEY, "app");

		loginPhraseResponse("p2");
		const direct = await getAuth(SECRET_KEY, FLUX_URL);
		expect(viaMain.nodeSignature).toBe(direct.signature);
	});

	it("propagates a failure from the node login phrase call", async () => {
		queue({}, 500);
		await expect(main("zel", SECRET_KEY, undefined, "1.2.3.4")).rejects.toThrow(
			ProsopoApiError,
		);
	});
});

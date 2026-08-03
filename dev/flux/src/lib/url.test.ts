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
import { describe, expect, it } from "vitest";
import {
	getNodeAPIURL,
	getSocketURL,
	getZelIdAuthHeader,
	prefixIPAddress,
} from "./url.js";

describe("getSocketURL", () => {
	it("builds the runonflux host from an address and its port", () => {
		expect(getSocketURL(new URL("http://176.9.52.22:16187")).href).toBe(
			"https://176-9-52-22-16187.node.api.runonflux.io/",
		);
	});

	it("falls back to the default UI port when the url carries none", () => {
		expect(getSocketURL(new URL("http://176.9.52.22")).href).toBe(
			"https://176-9-52-22-16127.node.api.runonflux.io/",
		);
	});

	it("ignores the incoming protocol, always producing https", () => {
		expect(getSocketURL(new URL("https://1.2.3.4:1000")).protocol).toBe(
			"https:",
		);
	});

	it("ignores any path on the incoming url", () => {
		expect(getSocketURL(new URL("http://1.2.3.4:1/some/path")).pathname).toBe(
			"/",
		);
	});

	it("dashes every dot of the hostname", () => {
		expect(getSocketURL(new URL("http://a.b.c.d:2")).hostname).toBe(
			"a-b-c-d-2.node.api.runonflux.io",
		);
	});
});

describe("getZelIdAuthHeader", () => {
	it("encodes the three credentials as a form body", () => {
		expect(getZelIdAuthHeader("id", "sig", "phrase")).toBe(
			"zelid=id&signature=sig&loginPhrase=phrase",
		);
	});

	it("percent encodes values that need it", () => {
		expect(getZelIdAuthHeader("id", "a+b/c=", "p")).toBe(
			"zelid=id&signature=a%2Bb%2Fc%3D&loginPhrase=p",
		);
	});

	it("keeps empty values as empty fields", () => {
		expect(getZelIdAuthHeader("", "", "")).toBe(
			"zelid=&signature=&loginPhrase=",
		);
	});
});

describe("prefixIPAddress", () => {
	it("prefixes a bare address with http", () => {
		expect(prefixIPAddress("1.2.3.4").href).toBe("http://1.2.3.4/");
	});

	it("strips an existing http scheme before prefixing", () => {
		expect(prefixIPAddress("http://1.2.3.4").href).toBe("http://1.2.3.4/");
	});

	it("downgrades an https address to http, as nodes are addressed by ip", () => {
		expect(prefixIPAddress("https://1.2.3.4").href).toBe("http://1.2.3.4/");
	});

	it("keeps the port", () => {
		expect(prefixIPAddress("1.2.3.4:16127").href).toBe("http://1.2.3.4:16127/");
	});

	it("throws for an unparseable address", () => {
		expect(() => prefixIPAddress("")).toThrow();
	});
});

describe("getNodeAPIURL", () => {
	it("adds one to the ui port, as the api sits one port higher", () => {
		expect(getNodeAPIURL("1.2.3.4:16127").href).toBe("http://1.2.3.4:16128/");
	});

	it("defaults to the api port when no port is given", () => {
		expect(getNodeAPIURL("1.2.3.4").href).toBe("http://1.2.3.4:16187/");
	});

	it("accepts an address that already carries a scheme", () => {
		expect(getNodeAPIURL("http://1.2.3.4:16127").href).toBe(
			"http://1.2.3.4:16128/",
		);
	});

	it("accepts a hostname rather than an ip", () => {
		expect(getNodeAPIURL("api.runonflux.io").href).toBe(
			"http://api.runonflux.io:16187/",
		);
	});

	it("drops the default http port, which the URL class normalises away", () => {
		expect(getNodeAPIURL("1.2.3.4:79").href).toBe("http://1.2.3.4/");
	});

	it("throws for an empty address", () => {
		expect(() => getNodeAPIURL("")).toThrow();
	});
});

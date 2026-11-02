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

import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import type { DnsEvent } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ApiDnsEventEndpoint,
	dnsEventToFields,
} from "../../../../api/admin/apiDnsEventEndpoint.js";
import {
	buildDnsAssetUrl,
	buildDnsEventUrl,
	dnsBeaconUrls,
} from "../../../../api/dnsEventUrl.js";
import {
	isDnsSidecarHealthy,
	resetDnsSidecarHealth,
} from "../../../../tasks/dnsEvent/dnsSidecarHealth.js";

describe("dnsEventToFields", () => {
	it("extracts resolverIp from a dns-kind event", () => {
		const event: DnsEvent = {
			kind: "dns",
			ts: "2026-06-08T15:00:00Z",
			src_ip: "1.2.3.4",
			jti: "session-1",
		};
		expect(dnsEventToFields(event)).toEqual({ resolverIp: "1.2.3.4" });
	});

	it("extracts peerIp + pathValid from an http-kind event", () => {
		const event: DnsEvent = {
			kind: "http",
			ts: "2026-06-08T15:00:00Z",
			src_ip: "5.6.7.8",
			jti: "session-1",
			path_valid: true,
		};
		expect(dnsEventToFields(event)).toEqual({
			peerIp: "5.6.7.8",
			pathValid: true,
		});
	});

	it("omits pathValid when not present on the event", () => {
		const event: DnsEvent = {
			kind: "http",
			ts: "2026-06-08T15:00:00Z",
			src_ip: "5.6.7.8",
			jti: "session-1",
		};
		expect(dnsEventToFields(event)).toEqual({ peerIp: "5.6.7.8" });
	});

	describe("with the asset URL configured", () => {
		beforeEach(() => {
			vi.stubEnv("DNS_EVENT_SUBZONE", "px.example.com");
			vi.stubEnv("DNS_EVENT_HMAC_SECRET", "test-secret");
		});
		afterEach(() => {
			vi.unstubAllEnvs();
		});

		const httpEvent = (url: string | undefined): DnsEvent => ({
			kind: "http",
			ts: "2026-06-08T15:00:00Z",
			src_ip: "5.6.7.8",
			jti: "session-1",
			path: url ? new URL(url).pathname : undefined,
			path_valid: false,
		});

		it("marks the asset seen, and leaves the main beacon's fields alone", () => {
			expect(
				dnsEventToFields(httpEvent(buildDnsAssetUrl("session-1"))),
			).toEqual({ assetSeen: true });
		});

		it("does not take the main beacon's path for the asset", () => {
			expect(
				dnsEventToFields({
					...httpEvent(buildDnsEventUrl("session-1")),
					path_valid: true,
				}),
			).toEqual({ peerIp: "5.6.7.8", pathValid: true });
		});

		it("does not take another session's asset path for this one", () => {
			expect(
				dnsEventToFields(httpEvent(buildDnsAssetUrl("session-2"))),
			).toEqual({ peerIp: "5.6.7.8", pathValid: false });
		});
	});
});

describe("dnsBeaconUrls", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("puts both URLs on the session's host, on different paths", () => {
		vi.stubEnv("DNS_EVENT_SUBZONE", "px.example.com");
		vi.stubEnv("DNS_EVENT_HMAC_SECRET", "test-secret");
		const { dns_url, dns_asset_url } = dnsBeaconUrls("session-1");
		if (!dns_url || !dns_asset_url) throw new Error("expected both URLs");
		const main = new URL(dns_url);
		const asset = new URL(dns_asset_url);
		expect(asset.host).toBe("session-1.px.example.com");
		expect(asset.host).toBe(main.host);
		expect(asset.pathname).not.toBe(main.pathname);
		expect(asset.pathname).toMatch(/^\/[0-9a-f]{16}\.(gif|png|webp)$/);
	});

	it("omits both when the sidecar is not configured", () => {
		vi.stubEnv("DNS_EVENT_SUBZONE", "");
		vi.stubEnv("DNS_EVENT_HMAC_SECRET", "");
		expect(dnsBeaconUrls("session-1")).toEqual({
			dns_url: undefined,
			dns_asset_url: undefined,
		});
	});
});

describe("ApiDnsEventEndpoint", () => {
	let mergeSessionDnsEvent: ReturnType<typeof vi.fn>;
	let endpoint: ApiDnsEventEndpoint;
	let mockLogger: {
		info: ReturnType<typeof vi.fn>;
		warn: ReturnType<typeof vi.fn>;
		with: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		resetDnsSidecarHealth();
		mergeSessionDnsEvent = vi.fn().mockResolvedValue(true);
		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
			with: vi.fn().mockReturnThis(),
		};
		endpoint = new ApiDnsEventEndpoint({
			mergeSessionDnsEvent,
		} as never);
	});

	it("marks the sidecar healthy when a batch arrives", async () => {
		expect(isDnsSidecarHealthy(new Date())).toBe(false);
		await endpoint.processRequest({ events: [] }, mockLogger as never);
		expect(isDnsSidecarHealthy(new Date())).toBe(true);
	});

	it("skips events with no jti", async () => {
		const event: DnsEvent = {
			kind: "dns",
			ts: "2026-06-08T15:00:00Z",
			src_ip: "1.2.3.4",
		};
		const result = await endpoint.processRequest(
			{ events: [event] },
			mockLogger as never,
		);
		expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(result.data).toEqual({ stored: 0, errors: 0, dropped: 0 });
		expect(mergeSessionDnsEvent).not.toHaveBeenCalled();
	});

	it("calls mergeSessionDnsEvent with dotted resolverIp for a dns event", async () => {
		const event: DnsEvent = {
			kind: "dns",
			ts: "2026-06-08T15:00:00Z",
			src_ip: "1.2.3.4",
			jti: "session-A",
		};
		await endpoint.processRequest({ events: [event] }, mockLogger as never);
		expect(mergeSessionDnsEvent).toHaveBeenCalledTimes(1);
		expect(mergeSessionDnsEvent).toHaveBeenCalledWith(
			"session-A",
			{ resolverIp: "1.2.3.4" },
			expect.any(Date),
		);
	});

	it("calls mergeSessionDnsEvent with peerIp + pathValid for an http event", async () => {
		const event: DnsEvent = {
			kind: "http",
			ts: "2026-06-08T15:00:00Z",
			src_ip: "5.6.7.8",
			jti: "session-B",
			path_valid: false,
		};
		await endpoint.processRequest({ events: [event] }, mockLogger as never);
		expect(mergeSessionDnsEvent).toHaveBeenCalledWith(
			"session-B",
			{ peerIp: "5.6.7.8", pathValid: false },
			expect.any(Date),
		);
	});

	it("merges both legs onto the same session via two atomic calls", async () => {
		// Regression test for the read-modify-write race that produced
		// withBoth: 0 in production. Both calls must reach the DB.
		const dns: DnsEvent = {
			kind: "dns",
			ts: "2026-06-08T15:00:00Z",
			src_ip: "1.2.3.4",
			jti: "session-X",
		};
		const http: DnsEvent = {
			kind: "http",
			ts: "2026-06-08T15:00:00.500Z",
			src_ip: "5.6.7.8",
			jti: "session-X",
			path_valid: true,
		};
		await endpoint.processRequest({ events: [dns, http] }, mockLogger as never);
		expect(mergeSessionDnsEvent).toHaveBeenCalledTimes(2);
		expect(mergeSessionDnsEvent).toHaveBeenNthCalledWith(
			1,
			"session-X",
			{ resolverIp: "1.2.3.4" },
			expect.any(Date),
		);
		expect(mergeSessionDnsEvent).toHaveBeenNthCalledWith(
			2,
			"session-X",
			{ peerIp: "5.6.7.8", pathValid: true },
			expect.any(Date),
		);
	});

	it("counts stored only when the session matched", async () => {
		mergeSessionDnsEvent
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false);
		const events: DnsEvent[] = [
			{
				kind: "dns",
				ts: "2026-06-08T15:00:00Z",
				src_ip: "1.2.3.4",
				jti: "session-found",
			},
			{
				kind: "dns",
				ts: "2026-06-08T15:00:00Z",
				src_ip: "9.9.9.9",
				jti: "session-missing",
			},
		];
		const result = await endpoint.processRequest(
			{ events },
			mockLogger as never,
		);
		expect(result.data).toEqual({ stored: 1, errors: 0, dropped: 0 });
	});

	it("isolates per-event failures", async () => {
		mergeSessionDnsEvent
			.mockRejectedValueOnce(new Error("boom"))
			.mockResolvedValueOnce(true);
		const events: DnsEvent[] = [
			{
				kind: "dns",
				ts: "2026-06-08T15:00:00Z",
				src_ip: "1.2.3.4",
				jti: "session-fail",
			},
			{
				kind: "dns",
				ts: "2026-06-08T15:00:00Z",
				src_ip: "5.6.7.8",
				jti: "session-ok",
			},
		];
		const result = await endpoint.processRequest(
			{ events },
			mockLogger as never,
		);
		expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(result.data).toEqual({ stored: 1, errors: 1, dropped: 0 });
		expect(mockLogger.warn).toHaveBeenCalledTimes(1);
	});

	it("drops only the invalid events of a batch that passes through the route schema", async () => {
		const good: DnsEvent = {
			kind: "dns",
			ts: "2026-06-08T15:00:00Z",
			src_ip: "1.2.3.4",
			jti: "session-good",
		};
		const overlongPath: Record<string, unknown> = {
			kind: "http",
			ts: "2026-06-08T15:00:00Z",
			src_ip: "5.6.7.8",
			jti: "session-bad",
			path: `/${"a".repeat(10_000)}`,
		};
		const wrongKind: Record<string, unknown> = { ...good, kind: "smtp" };
		const body = { events: [overlongPath, good, wrongKind, "not-an-object"] };

		const args = endpoint.getRequestArgsSchema().parse(body);
		const result = await endpoint.processRequest(args, mockLogger as never);

		expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(result.data).toEqual({ stored: 1, errors: 0, dropped: 3 });
		expect(mergeSessionDnsEvent).toHaveBeenCalledTimes(1);
		expect(mergeSessionDnsEvent).toHaveBeenCalledWith(
			"session-good",
			{ resolverIp: "1.2.3.4" },
			expect.any(Date),
		);
		expect(mockLogger.warn).toHaveBeenCalledTimes(1);
	});

	it("describes at most five invalid events in the drop log", async () => {
		const events: unknown[] = Array.from({ length: 50 }, () => ({}));
		const result = await endpoint.processRequest(
			endpoint.getRequestArgsSchema().parse({ events }),
			mockLogger as never,
		);
		expect(result.data).toEqual({ stored: 0, errors: 0, dropped: 50 });
		const [firstWarn] = mockLogger.warn.mock.calls;
		expect(firstWarn).toBeDefined();
		const logged: { data: { invalid: unknown[] } } = firstWarn?.[0]();
		expect(logged.data.invalid).toHaveLength(5);
	});

	it("still rejects a body without an events array", () => {
		expect(() =>
			endpoint.getRequestArgsSchema().parse({ events: "nope" }),
		).toThrow();
	});

	it("returns the registered schema", () => {
		const schema = endpoint.getRequestArgsSchema();
		expect(schema).toBeDefined();
	});
});

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
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ApiDnsEventEndpoint,
	dnsEventToFields,
} from "../../../../api/admin/apiDnsEventEndpoint.js";

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
		expect(result.data).toEqual({ stored: 0, errors: 0 });
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
		expect(result.data).toEqual({ stored: 1, errors: 0 });
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
		expect(result.data).toEqual({ stored: 1, errors: 1 });
		expect(mockLogger.warn).toHaveBeenCalledTimes(1);
	});

	it("returns the registered schema", () => {
		const schema = endpoint.getRequestArgsSchema();
		expect(schema).toBeDefined();
	});
});

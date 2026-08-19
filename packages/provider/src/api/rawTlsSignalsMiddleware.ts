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

import type { IncomingHttpHeaders } from "node:http";
import { handleErrors } from "@prosopo/api-express-router";
import { type Logger, getLogger } from "@prosopo/logger";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";

// Raw TCP-handshake signals forwarded by the chaddy Caddy plugin. The plugin
// looks each field up from the ja4l-probe eBPF sidecar's Unix socket keyed
// by (client_ip, client_port) and injects them as separate headers.
//
// All values are wire-observed facts about the client's SYN (RFC-793 /
// RFC-9293 primitives), not derived metrics — that split keeps this file
// implementation-neutral: consumers of the DB rows are free to compute
// whatever timing / hop / stack fingerprints they want at query time
// from these primitives without any FoxIO JA4+ derivations being persisted
// here.
const HEADER_SYN_NS = "x-tls-syn-ns";
const HEADER_SYNACK_NS = "x-tls-synack-ns";
const HEADER_ACK_NS = "x-tls-ack-ns";
const HEADER_OBSERVED_TTL = "x-tls-observed-ttl";
const HEADER_TCP_MSS = "x-tls-tcp-mss";
const HEADER_TCP_WSCALE = "x-tls-tcp-wscale";
const HEADER_TCP_OPTS_FLAGS = "x-tls-tcp-opts-flags";
const HEADER_TCP_OPTS_ORDER = "x-tls-tcp-opts-order";
const HEADER_TCP_WINDOW = "x-tls-tcp-window";

export interface RawTlsSignals {
	// Kernel monotonic ns timestamps of the TCP 3-way handshake — captured by
	// the eBPF probe on the WAN interface. Boot-relative; only meaningful in
	// deltas within the same connection. `synackNs` may be undefined if the
	// TC-egress program wasn't loaded when the handshake happened (probe in
	// ingress-only fallback mode).
	synNs?: number;
	synackNs?: number;
	ackNs?: number;
	// The observed TTL byte of the client's SYN. Combined with a bucket to
	// 64 / 128 / 255 this gives the initial TTL the client's kernel set —
	// never forgeable from JavaScript because the TCP stack chooses it
	// before any userspace code runs. Range 0..255.
	observedTtl?: number;
	// TCP MSS option value (bytes). Reflects the last-mile MTU: 1460 for
	// clean 1500-MTU broadband, 1452 for PPPoE, 1348 for mobile-carrier
	// GTP tunnels, and so on.
	tcpMss?: number;
	// TCP Window-Scale shift factor. Kernel default varies by OS and by
	// sysctl tuning. Range 0..14.
	tcpWscale?: number;
	// SYN-options presence bitfield emitted by the eBPF probe:
	// bit0=MSS bit1=WScale bit2=SACK-permitted bit3=Timestamps bit4=NOP.
	tcpOptsFlags?: number;
	// Packed encoding of the SYN option order emitted by the eBPF probe
	// (5 bits per option ID, first 8 slots). Same OS+kernel typically
	// produces the same value; a mismatch between claimed UA and this
	// value is a strong virtualisation / spoofing signal.
	tcpOptsOrder?: number;
	// TCP window field from the client's SYN. Kernel-default territory:
	// Linux → 64240, Windows → 65535 / 8192, macOS → 65535.
	tcpWindow?: number;
}

const parseIntHeader = (
	raw: string | string[] | undefined,
	logger: Logger,
	headerName: string,
	max: number,
): number | undefined => {
	if (raw === undefined) {
		return undefined;
	}
	const value = Array.isArray(raw) ? raw[0] : raw;
	if (value === undefined) {
		return undefined;
	}
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed) || parsed < 0 || parsed > max) {
		logger.debug(() => ({
			msg: "Ignoring malformed raw TLS signal header",
			data: { header: headerName, raw: value },
		}));
		return undefined;
	}
	return parsed;
};

// Kernel monotonic ns bumps into Number.MAX_SAFE_INTEGER (2^53) territory
// after ~104 days of uptime. In practice servers rarely exceed that in a
// single boot window and JS Number handles it cleanly up to that ceiling.
// Cap at MAX_SAFE_INTEGER so any bogus value is rejected instead of being
// silently truncated.
const MAX_NS = Number.MAX_SAFE_INTEGER;
const MAX_U8 = 255;
const MAX_U16 = 65535;
const MAX_U32 = 4_294_967_295;

export const getRawTlsSignals = (
	headers: IncomingHttpHeaders,
	logger?: Logger,
): RawTlsSignals => {
	const log = logger ?? getLogger("info", "provider:raw-tls-signals");
	return {
		synNs: parseIntHeader(headers[HEADER_SYN_NS], log, HEADER_SYN_NS, MAX_NS),
		synackNs: parseIntHeader(
			headers[HEADER_SYNACK_NS],
			log,
			HEADER_SYNACK_NS,
			MAX_NS,
		),
		ackNs: parseIntHeader(headers[HEADER_ACK_NS], log, HEADER_ACK_NS, MAX_NS),
		observedTtl: parseIntHeader(
			headers[HEADER_OBSERVED_TTL],
			log,
			HEADER_OBSERVED_TTL,
			MAX_U8,
		),
		tcpMss: parseIntHeader(headers[HEADER_TCP_MSS], log, HEADER_TCP_MSS, MAX_U16),
		tcpWscale: parseIntHeader(
			headers[HEADER_TCP_WSCALE],
			log,
			HEADER_TCP_WSCALE,
			MAX_U8,
		),
		tcpOptsFlags: parseIntHeader(
			headers[HEADER_TCP_OPTS_FLAGS],
			log,
			HEADER_TCP_OPTS_FLAGS,
			MAX_U8,
		),
		tcpOptsOrder: parseIntHeader(
			headers[HEADER_TCP_OPTS_ORDER],
			log,
			HEADER_TCP_OPTS_ORDER,
			MAX_U32,
		),
		tcpWindow: parseIntHeader(
			headers[HEADER_TCP_WINDOW],
			log,
			HEADER_TCP_WINDOW,
			MAX_U16,
		),
	};
};

// Helper for the session-write path: pull the raw TLS signals off `req`
// into a plain object with only the defined fields. Callers spread it into
// their session record (or into a routing `raw` bag) alongside the existing
// tcpToChelloUs / chelloToHandshakeUs conditional spreads. Undefined fields
// are omitted so the resulting Mongo document stays slim on requests that
// came in without a ja4l-probe pipeline.
export const rawTlsSignalsForSession = (
	req: Pick<Request, keyof RawTlsSignals>,
): Partial<RawTlsSignals> => {
	const out: Partial<RawTlsSignals> = {};
	if (req.synNs !== undefined) out.synNs = req.synNs;
	if (req.synackNs !== undefined) out.synackNs = req.synackNs;
	if (req.ackNs !== undefined) out.ackNs = req.ackNs;
	if (req.observedTtl !== undefined) out.observedTtl = req.observedTtl;
	if (req.tcpMss !== undefined) out.tcpMss = req.tcpMss;
	if (req.tcpWscale !== undefined) out.tcpWscale = req.tcpWscale;
	if (req.tcpOptsFlags !== undefined) out.tcpOptsFlags = req.tcpOptsFlags;
	if (req.tcpOptsOrder !== undefined) out.tcpOptsOrder = req.tcpOptsOrder;
	if (req.tcpWindow !== undefined) out.tcpWindow = req.tcpWindow;
	return out;
};

// env kept in the signature for parity with the other provider middlewares
// (ja4Middleware, ipInfoMiddleware, handshakeTimingMiddleware). Currently
// unused but reserved so future per-tenant configuration can hook in without
// changing the startProviderApi wiring.
export const rawTlsSignalsMiddleware = (env: ProviderEnvironment) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const signals = getRawTlsSignals(req.headers, req.logger);
			if (signals.synNs !== undefined) req.synNs = signals.synNs;
			if (signals.synackNs !== undefined) req.synackNs = signals.synackNs;
			if (signals.ackNs !== undefined) req.ackNs = signals.ackNs;
			if (signals.observedTtl !== undefined)
				req.observedTtl = signals.observedTtl;
			if (signals.tcpMss !== undefined) req.tcpMss = signals.tcpMss;
			if (signals.tcpWscale !== undefined) req.tcpWscale = signals.tcpWscale;
			if (signals.tcpOptsFlags !== undefined)
				req.tcpOptsFlags = signals.tcpOptsFlags;
			if (signals.tcpOptsOrder !== undefined)
				req.tcpOptsOrder = signals.tcpOptsOrder;
			if (signals.tcpWindow !== undefined) req.tcpWindow = signals.tcpWindow;

			const hasAny = Object.values(signals).some((v) => v !== undefined);
			if (hasAny) {
				req.logger = req.logger.with(signals, "rawTlsSignals");
			}
			next();
		} catch (err) {
			return handleErrors(err as Error, req, res, next);
		}
	};
};

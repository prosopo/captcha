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
// looks each field up from the tcp-probe eBPF sidecar's Unix socket keyed
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
const HEADER_TCP_WINDOW = "x-tls-tcp-window";

// The 104-byte record (prosopo/Protect#1167) reads the whole SYN rather
// than the five JA4T inputs the 80-byte one carried.
const HEADER_TCP_OPTS_KINDS = "x-tls-tcp-opts-kinds";
const HEADER_TCP_OPTS_PRESENT = "x-tls-tcp-opts-present";
const HEADER_TCP_OPTS_COUNT = "x-tls-tcp-opts-count";
const HEADER_TCP_TSVAL = "x-tls-tcp-tsval";
const HEADER_TCP_TSECR = "x-tls-tcp-tsecr";
const HEADER_TCP_FLAGS = "x-tls-tcp-flags";
const HEADER_TCP_DATA_OFFSET_RESV = "x-tls-tcp-data-offset-resv";
const HEADER_TCP_URG_PTR = "x-tls-tcp-urg-ptr";
const HEADER_IP_IDENT = "x-tls-ip-ident";
const HEADER_IP_TOTAL_LEN = "x-tls-ip-total-len";
const HEADER_IP_FRAG_FLAGS = "x-tls-ip-frag-flags";
const HEADER_IP_TOS = "x-tls-ip-tos";

// Superseded by HEADER_TCP_OPTS_KINDS and HEADER_TCP_OPTS_PRESENT, and
// still read because a pronode running a chaddy older than
// prosopo/chaddy#16 keeps sending them. Once the fleet is rolled they stop
// arriving and the two fields go undefined on new sessions; the stored
// fields stay, because years of rows hold them and routing rules read them.
const HEADER_TCP_OPTS_FLAGS = "x-tls-tcp-opts-flags";
const HEADER_TCP_OPTS_ORDER = "x-tls-tcp-opts-order";

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
	// TCP window field from the client's SYN. Kernel-default territory:
	// Linux → 64240, Windows → 65535 / 8192, macOS → 65535.
	tcpWindow?: number;
	// IANA kind number of each TCP option on the SYN, in wire order, for
	// the first eight options. An ordinary Linux SYN is
	// [2, 4, 8, 1, 3] — MSS, SACK-permitted, Timestamps, NOP,
	// Window-Scale — and the sequence is a property of the sending kernel,
	// so a mismatch against the claimed UA is a virtualisation / spoofing
	// signal.
	//
	// Stored decoded rather than as the packed u64 the probe emits,
	// because that value reaches 2^64 and a JS number is exact only to
	// 2^53 — the packed form could not be held without silently losing
	// low bytes, which are the option kinds themselves. The array is the
	// same information and is queryable per position
	// (`{"tcpOptsKinds.0": 2}`).
	tcpOptsKinds?: number[];
	// Which TCP options were present, as a bitfield. Covers options whose
	// value is not recorded, which is the only way to see MPTCP (bit 10),
	// Fast Open (bit 11) or MD5 (bit 7) at all. Bit 14 says the SYN
	// carried more options than `tcpOptsKinds` has room for.
	tcpOptsPresent?: number;
	// Total options on the SYN, saturating at 255. Greater than eight
	// means `tcpOptsKinds` is truncated.
	tcpOptsCount?: number;
	// TCP Timestamps option values. TSval is a counter the sending kernel
	// starts at boot and increments at a fixed tick rate, so it describes
	// the stack that actually sent the packet rather than the client that
	// claims to have. TSecr should be 0 on a SYN; anything else is
	// anomalous. Both are absent unless the option was on the SYN — a
	// TSval of 0 is legal and TSecr is expected to be 0, so neither can
	// use zero as an absent-marker.
	tcpTsval?: number;
	tcpTsecr?: number;
	// Raw TCP flag byte: CWR 0x80, ECE 0x40 … SYN 0x02, FIN 0x01. ECE and
	// CWR together are the client advertising ECN, which varies by OS and
	// by sysctl.
	tcpFlags?: number;
	// Data offset in the high nibble, reserved bits plus NS in the low.
	// Non-zero reserved bits are malformed.
	tcpDataOffsetResv?: number;
	// TCP urgent pointer. Non-zero on a SYN is malformed.
	tcpUrgPtr?: number;
	// IPv4 identification field. Linux sends 0 with DF set; Windows
	// increments it. One of the cheapest OS tells on the SYN.
	ipIdent?: number;
	// IPv4 total length — the size class of the SYN, which follows from
	// how many options the stack sent.
	ipTotalLen?: number;
	// Raw IPv4 flags plus fragment offset. DF is bit 14 (0x4000).
	ipFragFlags?: number;
	// DSCP in the high 6 bits, ECN codepoint in the low 2.
	ipTos?: number;
	// SYN-options presence bitfield from the 80-byte record:
	// bit0=MSS bit1=WScale bit2=SACK-permitted bit3=Timestamps bit4=NOP.
	// Superseded by `tcpOptsPresent`, which is wider and names more
	// options. Only present on sessions served by a chaddy older than
	// prosopo/chaddy#16.
	tcpOptsFlags?: number;
	// Packed encoding of the SYN option order from the 80-byte record
	// (4 bits per option kind, first 8 slots), which aliased MSS onto
	// Fast Open and Window-Scale onto MD5 and could not name MPTCP at
	// all. Superseded by `tcpOptsKinds`. Only present on sessions served
	// by a chaddy older than prosopo/chaddy#16.
	tcpOptsOrder?: number;
}

// Every field of RawTlsSignals, in one place. The session-write path and the
// middleware's copy onto `req` both walk this list rather than naming fields
// one at a time: the last time those were maintained by hand a field was
// missed, and the routing rules reading it got `undefined` and silently never
// fired against real traffic (see the Session projection in
// @prosopo/types-database).
const RAW_TLS_SIGNAL_KEYS = [
	"synNs",
	"synackNs",
	"ackNs",
	"observedTtl",
	"tcpMss",
	"tcpWscale",
	"tcpWindow",
	"tcpOptsKinds",
	"tcpOptsPresent",
	"tcpOptsCount",
	"tcpTsval",
	"tcpTsecr",
	"tcpFlags",
	"tcpDataOffsetResv",
	"tcpUrgPtr",
	"ipIdent",
	"ipTotalLen",
	"ipFragFlags",
	"ipTos",
	"tcpOptsFlags",
	"tcpOptsOrder",
] as const satisfies readonly (keyof RawTlsSignals)[];

// Fails to compile if a field is added to RawTlsSignals and not to the list
// above, which is the whole point of having the list.
type UnlistedSignalKey = Exclude<
	keyof RawTlsSignals,
	(typeof RAW_TLS_SIGNAL_KEYS)[number]
>;
const _everySignalIsListed: UnlistedSignalKey extends never ? true : never =
	true;

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
// after ~104 days of uptime and hosts stay up longer than that (staging
// caught the bug immediately — first pronode had ~119-day uptime and
// every syn_ns / synack_ns / ack_ns was rejected as malformed, wiping
// the raw timings from every Session record). Cap at 2^63 so bogus
// values (negatives, non-numeric text) are still rejected but real
// long-uptime timestamps land. Values above 2^53 lose ~ns precision on
// storage (Mongo Double follows IEEE-754 like Number), which is fine
// since every consumer subtracts them before use — a delta of two
// low-nanosecond noise floors carries no useful information anyway.
const MAX_NS = 2 ** 63;
const MAX_U8 = 255;
const MAX_U16 = 65535;
const MAX_U32 = 4_294_967_295;

// Slots in the probe's packed `tcp_opts_kinds`, one byte each.
const OPTS_KINDS_SLOTS = 8;
const MAX_U64 = (1n << 64n) - 1n;

// The packed option-kinds value arrives as the decimal form of a u64, so it
// is read through BigInt: Number.parseInt would round anything above 2^53
// and the rounding lands in the low bytes, which are the option kinds. The
// bytes come out least-significant first, which is wire order, and a zero
// byte ends the list — a trailing End-of-Option-List terminates rather than
// appearing as an option.
const parseOptsKindsHeader = (
	raw: string | string[] | undefined,
	logger: Logger,
): number[] | undefined => {
	if (raw === undefined) {
		return undefined;
	}
	const value = Array.isArray(raw) ? raw[0] : raw;
	if (value === undefined || !/^\d+$/.test(value)) {
		if (value !== undefined) {
			logger.debug(() => ({
				msg: "Ignoring malformed raw TLS signal header",
				data: { header: HEADER_TCP_OPTS_KINDS, raw: value },
			}));
		}
		return undefined;
	}

	let packed: bigint;
	try {
		packed = BigInt(value);
	} catch {
		return undefined;
	}
	if (packed > MAX_U64) {
		logger.debug(() => ({
			msg: "Ignoring out-of-range raw TLS signal header",
			data: { header: HEADER_TCP_OPTS_KINDS, raw: value },
		}));
		return undefined;
	}
	if (packed === 0n) {
		// The probe's absent-marker: the options parser produced nothing.
		// Storing an empty array would claim a SYN with no options at all.
		return undefined;
	}

	const kinds: number[] = [];
	for (let slot = 0; slot < OPTS_KINDS_SLOTS; slot++) {
		const kind = Number((packed >> BigInt(slot * 8)) & 0xffn);
		if (kind === 0) break;
		kinds.push(kind);
	}
	return kinds.length > 0 ? kinds : undefined;
};

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
		tcpMss: parseIntHeader(
			headers[HEADER_TCP_MSS],
			log,
			HEADER_TCP_MSS,
			MAX_U16,
		),
		tcpWscale: parseIntHeader(
			headers[HEADER_TCP_WSCALE],
			log,
			HEADER_TCP_WSCALE,
			MAX_U8,
		),
		tcpWindow: parseIntHeader(
			headers[HEADER_TCP_WINDOW],
			log,
			HEADER_TCP_WINDOW,
			MAX_U16,
		),
		tcpOptsKinds: parseOptsKindsHeader(headers[HEADER_TCP_OPTS_KINDS], log),
		tcpOptsPresent: parseIntHeader(
			headers[HEADER_TCP_OPTS_PRESENT],
			log,
			HEADER_TCP_OPTS_PRESENT,
			MAX_U16,
		),
		tcpOptsCount: parseIntHeader(
			headers[HEADER_TCP_OPTS_COUNT],
			log,
			HEADER_TCP_OPTS_COUNT,
			MAX_U8,
		),
		tcpTsval: parseIntHeader(
			headers[HEADER_TCP_TSVAL],
			log,
			HEADER_TCP_TSVAL,
			MAX_U32,
		),
		tcpTsecr: parseIntHeader(
			headers[HEADER_TCP_TSECR],
			log,
			HEADER_TCP_TSECR,
			MAX_U32,
		),
		tcpFlags: parseIntHeader(
			headers[HEADER_TCP_FLAGS],
			log,
			HEADER_TCP_FLAGS,
			MAX_U8,
		),
		tcpDataOffsetResv: parseIntHeader(
			headers[HEADER_TCP_DATA_OFFSET_RESV],
			log,
			HEADER_TCP_DATA_OFFSET_RESV,
			MAX_U8,
		),
		tcpUrgPtr: parseIntHeader(
			headers[HEADER_TCP_URG_PTR],
			log,
			HEADER_TCP_URG_PTR,
			MAX_U16,
		),
		ipIdent: parseIntHeader(
			headers[HEADER_IP_IDENT],
			log,
			HEADER_IP_IDENT,
			MAX_U16,
		),
		ipTotalLen: parseIntHeader(
			headers[HEADER_IP_TOTAL_LEN],
			log,
			HEADER_IP_TOTAL_LEN,
			MAX_U16,
		),
		ipFragFlags: parseIntHeader(
			headers[HEADER_IP_FRAG_FLAGS],
			log,
			HEADER_IP_FRAG_FLAGS,
			MAX_U16,
		),
		ipTos: parseIntHeader(headers[HEADER_IP_TOS], log, HEADER_IP_TOS, MAX_U8),
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
	};
};

// Helper for the session-write path: pull the raw TLS signals off `req`
// into a plain object with only the defined fields. Callers spread it into
// their session record (or into a routing `raw` bag) alongside the existing
// tcpToChelloUs / chelloToHandshakeUs conditional spreads. Undefined fields
// are omitted so the resulting Mongo document stays slim on requests that
// came in without a tcp-probe pipeline.
export const rawTlsSignalsForSession = (
	req: Pick<Request, keyof RawTlsSignals>,
): Partial<RawTlsSignals> => rawTlsSignalsFromRecord(req);

/**
 * Pull the raw TLS signals out of a persisted Session — or anything shaped
 * like one — for a decision machine's `raw` bag, or to carry forward onto a
 * new Session record.
 *
 * Six call sites used to name every field by hand, so adding one to the
 * probe meant remembering six places; the fields that were forgotten read as
 * `undefined` and the rules gating on them silently never fired.
 */
export const rawTlsSignalsFromRecord = (
	record: Partial<RawTlsSignals> | undefined | null,
): Partial<RawTlsSignals> => {
	const out: Partial<RawTlsSignals> = {};
	if (!record) {
		return out;
	}
	for (const key of RAW_TLS_SIGNAL_KEYS) {
		const value = record[key];
		if (value !== undefined) {
			Object.assign(out, { [key]: value });
		}
	}
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
			for (const key of RAW_TLS_SIGNAL_KEYS) {
				const value = signals[key];
				if (value !== undefined) {
					Object.assign(req, { [key]: value });
				}
			}

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

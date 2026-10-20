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

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sha256 } from "@noble/hashes/sha2.js";
import { Address4, Address6 } from "ip-address";
import { at } from "../../src/at.js";
import { assertCoordsSafe } from "../../src/coords.js";
import { validateDomainForOutboundRequest } from "../../src/domainValidation.js";
import { extractDomainFromEmail } from "../../src/email.js";
import { embedData, extractData, u8aToHex } from "../../src/hex.js";
import { getIPAddress, getIPAddressFromBigInt } from "../../src/ip.js";
import {
	hashMeetsDifficulty,
	solvePoW,
	targetForDifficulty,
} from "../../src/solverService.js";
import {
	buildDomainSuffixCandidates,
	decodeGoogleTranslateHost,
	isProtectDeployment,
	parseUrl,
	sanitisePageUrl,
	validateDomain,
} from "../../src/url.js";
import { flatten } from "../../src/util.js";
import { verifyRecency } from "../../src/verifyRecency.js";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

// JSON cannot carry NaN or the infinities, so they travel as strings.
type EncodedNumber = number | "NaN" | "Infinity" | "-Infinity";

const encode = (value: number): EncodedNumber => {
	if (Number.isNaN(value)) return "NaN";
	if (value === Number.POSITIVE_INFINITY) return "Infinity";
	if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
	return value;
};

type Outcome<T extends Json> = { ok: T } | { error: string };

const attempt = <T extends Json>(fn: () => T): Outcome<T> => {
	try {
		return { ok: fn() };
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}
};

// mulberry32, so the fuzz inputs are the same on every run.
const prng = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const randomStrings = (
	seed: number,
	count: number,
	alphabet: readonly string[],
	maxLength: number,
): string[] => {
	const next = prng(seed);
	const out: string[] = [];
	for (let i = 0; i < count; i++) {
		const length = Math.floor(next() * (maxLength + 1));
		let s = "";
		for (let j = 0; j < length; j++) {
			s += alphabet[Math.floor(next() * alphabet.length)];
		}
		out.push(s);
	}
	return out;
};

const chars = (s: string): string[] => Array.from(s);

const numbers: number[] = [
	0,
	-0,
	1,
	-1,
	1.5,
	-0.5,
	0.1,
	100,
	1e21,
	1e20,
	123456789.125,
	1e-7,
	0.000001,
	2 ** 53,
	2 ** 53 + 2,
	-(2 ** 60),
	5e-324,
	Number.MAX_VALUE,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
];

// at: arrays wrap; `String(index)` shows up in the error messages.
const atIndices: number[] = [
	0,
	1,
	2,
	3,
	4,
	7,
	-1,
	-2,
	-3,
	-4,
	-7,
	1.5,
	-0.5,
	-0,
	1e21,
	-1e21,
	2 ** 53,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
];
const atArrays: number[][] = [[], [10], [10, 20, 30], [1, 2, 3, 4, 5, 6, 7]];
const atVectors = atArrays.flatMap((items) =>
	atIndices.flatMap((index) =>
		[false, true].map((noWrap) => ({
			items,
			index: encode(index),
			noWrap,
			result: attempt(() => at(items, index, { noWrap })),
		})),
	),
);
const atStringVectors = ["", "a", "abc", "héllo"].flatMap((s) =>
	atIndices.map((index) => ({
		s,
		index: encode(index),
		result: attempt(() => at(s, index)),
	})),
);

const byteArrays: number[][] = [
	[],
	[0],
	[0x68, 0x65, 0x6c, 0x0f],
	[1, 2, 3, 4, 5],
	Array.from({ length: 32 }, (_, i) => (i * 37) & 0xff),
];
const u8aVectors = byteArrays.flatMap((bytes) =>
	[-1, 0, 1, 8, 9, 16, 24, 40, 256].flatMap((bitLength) =>
		[true, false].map((isPrefixed) => ({
			bytes,
			bitLength,
			isPrefixed,
			result: u8aToHex(new Uint8Array(bytes), bitLength, isPrefixed),
		})),
	),
);

const hex64 = `0x${"01".repeat(32)}`;
const embedInputs: [string, number[]][] = [
	[hex64, []],
	[hex64, [1020, 345]],
	[hex64, [1, 3]],
	[hex64, [9999, 9999]],
	[hex64, [99999, 99999]],
	[hex64, [150.5, 30.4, -0.2, 0.5, 2.5, -0.5]],
	[hex64, [-5]],
	[hex64, [-0.6]],
	[hex64, [Number.NaN]],
	[hex64, [Number.POSITIVE_INFINITY]],
	[hex64, [2 ** 53]],
	[hex64, [2 ** 53 - 1]],
	[hex64, [1e21]],
	[hex64, Array.from({ length: 14 }, (_, i) => 300 + i)],
	["0x01010101", [0xfff]],
	["0x0101010101", [1]],
	["", []],
	["0x", []],
	["01010101", [7]],
	["0X01010101", [7]],
	[`0x${"ab".repeat(200)}`, Array.from({ length: 40 }, (_, i) => 4000 + i)],
	[`0x${"ab".repeat(200)}`, Array.from({ length: 36 }, (_, i) => 4000 + i)],
	[`0x${"ab".repeat(200)}`, Array.from({ length: 256 }, () => 1)],
];
const embedVectors = embedInputs.map(([hex, data]) => ({
	hex,
	data: data.map(encode),
	result: attempt(() => embedData(hex, data)),
}));

const extractInputs: string[] = [
	...embedVectors.flatMap((v) => ("ok" in v.result ? [v.result.ok] : [])),
	"",
	"0x",
	"0x0",
	"0x00",
	"0x01",
	"0x010200",
	"0xzz",
	`0x010610${"f".repeat(16)}`,
	`0x010610${"f".repeat(13)}`,
	"0x0x",
	"0x0x01",
	"0x01 1",
	"0x01-1",
	"0x01+1",
	"0x02000100",
	...randomStrings(11, 220, chars("0123456789abcdefABxz -+"), 14).map(
		(s) => `0x${s}`,
	),
];
const extractVectors = extractInputs.map((hex) => ({
	hex,
	result: attempt(() => extractData(hex).map(encode)),
}));

const ipFields = (ip: Address4 | Address6): Json => {
	if (ip instanceof Address4) {
		return {
			v4: true,
			address: ip.address,
			correctForm: ip.correctForm(),
			bigInt: ip.bigInt().toString(),
			subnetMask: ip.subnetMask,
			isLoopback: ip.isLoopback(),
			isLinkLocal: ip.isLinkLocal(),
		};
	}
	return {
		v4: false,
		address: ip.address,
		correctForm: ip.correctForm(),
		canonicalForm: ip.canonicalForm(),
		bigInt: ip.bigInt().toString(),
		subnetMask: ip.subnetMask,
		zone: ip.zone,
		is4: ip.is4(),
		address4: ip.address4 ? ip.address4.address : null,
		to4: ip.to4().address,
		isLoopback: ip.isLoopback(),
		isLinkLocal: ip.isLinkLocal(),
	};
};

const ipInputs: string[] = [
	"",
	"1.2.3.4",
	"0.0.0.0",
	"255.255.255.255",
	"256.1.1.1",
	"01.2.3.4",
	"1.2.3",
	"1.2.3.4.5",
	"1.2.3.4/0",
	"1.2.3.4/32",
	"1.2.3.4/33",
	"1.2.3.4/024",
	"1.2.3.4/",
	"1.2.3.4/5/6",
	" 1.2.3.4",
	"1.2.3.4 ",
	"127.0.0.1",
	"169.254.1.1",
	"::",
	"::1",
	"0:0:0:0:0:0:0:1",
	"1::",
	"1:2:3:4:5:6:7:8",
	"1:2:3:4:5:6:7:8:9",
	"1:2:3:4:5:6:7::",
	"::2:3:4:5:6:7:8",
	"1::2::3",
	":::",
	"1:::2",
	":1::2",
	"1::2:",
	"12345::",
	"2001:0DB8::0001",
	"2001:db8:0:0:1:0:0:1",
	"2001:0:0:1:0:0:0:1",
	"fe80::1%eth0",
	"fe80::1%eth0/64",
	"fe80::1/64%eth0",
	"fe80::1/129",
	"fe80::1/1234",
	"fe80::1/64/64",
	"fe80::1%a\nb",
	"fe80::1\n%a",
	"::ffff:127.0.0.1",
	"::ffff:127.0.0.1/120",
	"::ffff:127.0.0.1/64",
	"::ffff:7f00:1",
	"::ffff:169.254.169.254",
	"64:ff9b::7f00:1",
	"64:ff9b::a9fe:a9fe",
	"::127.0.0.01",
	"::1.2.3.4.5",
	"1.2.3.4::",
	"1:2:3:4:5:6:1.2.3.4",
	"1:2:3:4:5:6:7:1.2.3.4",
	"[::1]",
	"g::1",
	"FE80::ABCD",
	"0000:0000:0000:0000:0000:0000:0000:0001",
	`${"1:".repeat(20)}1`,
	"1:2:3:4:5:6:7:8%".padEnd(60, "z"),
	...randomStrings(21, 250, chars("0123456789./"), 16),
	...randomStrings(22, 320, chars("0129afAF:::.%/"), 22),
];
console.log = (): void => {};
const ipVectors = ipInputs.map((input) => ({
	input,
	result: attempt(() => ipFields(getIPAddress(input))),
}));

const bigIntInputs: string[] = [
	"0",
	"1",
	"16909060",
	"4294967295",
	"4294967296",
	"1000000000000",
	"340282366920938463463374607431768211455",
];
const bigIntVectors = bigIntInputs.map((value) => ({
	value,
	v4: attempt(() => ipFields(getIPAddressFromBigInt(BigInt(value)))),
	v6: attempt(() => ipFields(Address6.fromBigInt(BigInt(value)))),
}));

const domainInputs: string[] = [
	"google.com",
	"www.google.com",
	"blah@gmail.com",
	"google.",
	".google.com",
	"google..com",
	`${"a".repeat(62)}.${"a".repeat(62)}.${"a".repeat(62)}.${"a".repeat(61)}.co`,
	`${"a".repeat(62)}.${"a".repeat(62)}.${"a".repeat(62)}.${"a".repeat(62)}.co`,
	`${"a".repeat(63)}.com`,
	`${"a".repeat(64)}.com`,
	`com.${"a".repeat(64)}`,
	`a.${"b".repeat(24)}`,
	`a.${"b".repeat(25)}`,
	"a.b",
	"a.bc",
	"a.b-",
	"a.-b",
	"a-.b.com",
	"a-.bc",
	"a-.",
	"a.-bc",
	"-a.com",
	"a_b.com",
	"1.2.3.4",
	"a.123",
	"a.12b",
	"a.com,b.com",
	"a.com , b.com",
	"a.com,,b.com",
	"a.com,",
	" a.com",
	"\ta.com",
	"\na.com",
	" a.com",
	"a.com ",
	"a.com\n",
	"https://a.com",
	"http://a.com",
	"www.a.com",
	"www.www.a.com",
	"xn--bcher-kva.com",
	"a.0x10",
	"a.b.0x1f",
	"a1.b2",
	"localhost",
	"Example.COM",
	"a.co_",
	"a..b",
	...randomStrings(31, 380, chars("ab09.-_,  \t"), 12),
	...randomStrings(32, 150, chars("ab.-"), 30),
];
const domainVectors = domainInputs.map((domain) => ({
	domain,
	valid: validateDomain(domain),
	parsed: attempt(() => {
		const url = parseUrl(domain);
		return { href: url.href, hostname: url.hostname };
	}),
}));

const parseUrlInputs: string[] = [
	"example.com",
	"Example.COM/Path?q=1#h",
	"https://www.example.com",
	"http://example.com:8080/x",
	"www.",
	"",
	"a b.com",
	"bücher.de",
	"xn--bcher-kva.de",
	"[::1]",
	"127.0.0.1",
	"0x7f.1",
	"example.com:99999",
	"exa%41mple.com",
	"exa mple.com",
	"a\tb.com",
	"user@example.com",
	"..",
	"%zz.com",
	"例子.测试",
];
const parseUrlVectors = parseUrlInputs.map((domain) => ({
	domain,
	parsed: attempt(() => {
		const url = parseUrl(domain);
		return { href: url.href, hostname: url.hostname };
	}),
}));

const outboundInputs: string[] = [
	"",
	"   ",
	"example.com",
	"EXAMPLE.COM",
	" example.com ",
	" example.com﻿",
	"8.8.8.8",
	"8.8.8.8/8",
	"10.0.0.1",
	"100.64.0.1",
	"192.0.0.1",
	"192.0.2.1",
	"192.88.99.1",
	"198.18.0.1",
	"198.51.100.1",
	"203.0.113.1",
	"224.0.0.1",
	"240.0.0.1",
	"255.255.255.255",
	"::1",
	"::",
	"0:0:0:0:0:0:0:0",
	"0::0",
	"[::]",
	"fe80::1%eth0",
	"febf::1",
	"fec0::1",
	"fc00::1",
	"fd00::1",
	"ff02::1",
	"2001:db8::1",
	"2001:DB8::1",
	"2001:0db8::1",
	"2001:db9::1",
	"2606:4700:4700::1111",
	"::ffff:8.8.8.8",
	"::ffff:10.0.0.1",
	"::ffff:10.0.0.1/120",
	"::ffff:a00:1",
	"64:ff9b::7f00:1",
	"[::1",
	"::1]",
	"[[::1]]",
	"localhost",
	"localhost.localdomain",
	"ip6-allhosts",
	"metadata.google.internal",
	"metadata.google.internal.evil.com",
	"instance-data.example.com",
	"x.compute.internal",
	"a.internal",
	"myserver",
	"a.test",
	"a.example",
	"a.invalid",
	"a.i2p",
	"a.corp",
	"a.private",
	"a.com.",
	".a.com",
	"a..com",
	"a_b.com",
	"a.b",
	"a.123",
	"a.com,b.com",
	"bücher.de",
	"ÉXAMPLE.com",
	...randomStrings(41, 200, chars("ab0.-:f[]%1 "), 14),
];
const outboundVectors = outboundInputs.map((domain) => {
	const result = validateDomainForOutboundRequest(domain);
	return {
		domain,
		isValid: result.isValid,
		reason: result.reason ?? null,
	};
});

const hostInputs: string[] = [
	"prosopo-io.translate.goog",
	"my--site-com.translate.goog",
	"foo-my--site-co-uk.translate.goog",
	"Prosopo-IO.Translate.Goog",
	"prosopo-io.translate.goog.",
	"prosopo-io.translate.goog..",
	"prosopo.io",
	"translate.goog",
	".translate.goog",
	"a---b.translate.goog",
	"a----b.translate.goog",
	"-a-.translate.goog",
	"a\u0000b.translate.goog",
	"İ-x.translate.goog",
];
const translateVectors = hostInputs.map((hostname) => ({
	hostname,
	result: decodeGoogleTranslateHost(hostname),
}));

const suffixInputs: string[] = [
	"mail.fakemail.app",
	"fakemail.app",
	"localhost",
	"",
	"a.b.c.d.example.com",
	"test..domain",
	"example.com.",
	"example.com..",
	".example.com",
	"Mail.FakeMail.App",
	"  example.com  ",
	" example.com　",
	"\u0085example.com",
	".",
	"a.",
	"ÄB.cd",
];
const suffixVectors = suffixInputs.map((domain) => ({
	domain,
	result: buildDomainSuffixCandidates(domain),
}));

const emailInputs: string[] = [
	"user@domain.com",
	"@domain.com",
	"user@sub@domain.com",
	"domain.com",
	"",
	"   ",
	"user@",
	"user@ ",
	" USER@Domain.COM ",
	"user@ ",
	"a@b﻿",
	"ÉMAIL@ÉXAMPLE.COM",
];
const emailVectors = emailInputs.map((input) => ({
	input,
	result: extractDomainFromEmail(input),
}));

const pageUrlInputs: (string | null)[] = [
	null,
	"",
	"https://example.com/checkout/step-2",
	"http://example.com:8080/a/b",
	"https://example.com/reset?token=secret#section",
	"https://user:pass@example.com/account",
	"https://user@example.com",
	"javascript:alert(1)",
	"data:text/html,<h1>x</h1>",
	"ftp://example.com/file",
	"not a url",
	"/relative/path",
	"HTTPS://EXAMPLE.COM:443/A%20B?x#y",
	"http://example.com:80",
	"https://例子.测试/路径",
	"  https://example.com/x  ",
	"https://example.com/a/../b/./c",
	"https://[::1]:8443/x",
	"http://0x7f.1/",
	"https:example.com/x",
	"https://example.com/?",
	"https://example.com/#",
];
const pageUrlVectors = pageUrlInputs.map((raw) => ({
	raw,
	result: sanitisePageUrl(raw) ?? null,
}));

const protectInputs: [string | null, string | null][] = [
	["https://client.com/", "https://protect.client.com/widget"],
	["https://www.client.com/", "https://protect.client.com/widget"],
	["https://CLIENT.com/", "https://Protect.Client.COM/widget"],
	["https://attackerclient.com/", "https://protect.client.com/widget"],
	["https://client.com/", "https://protect.other.com/widget"],
	["https://client.com/", "https://widget.client.com/"],
	["https://client.com/", "https://protect./widget"],
	["https://client.com/", "https://protect.com/"],
	[null, "https://protect.client.com/"],
	["https://client.com/", null],
	["", ""],
	["not a url", "https://protect.client.com/"],
	["mailto:x@client.com", "https://protect.client.com/"],
	["foo://SUB.Client.com/", "foo://PROTECT.client.com/"],
	["https://client.com.", "https://protect.client.com/"],
	["https://[::1]/", "https://protect.[::1]/"],
];
const protectVectors = protectInputs.map(([currentUrl, iframeUrl]) => ({
	currentUrl,
	iframeUrl,
	result: isProtectDeployment(currentUrl, iframeUrl),
}));

const toHex = (bytes: Uint8Array): string =>
	Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
const difficulties: number[] = [
	-1,
	0,
	0.1,
	0.125,
	0.25,
	0.375,
	1,
	1.5,
	2,
	2.25,
	2.5,
	3,
	4,
	8,
	63.75,
	64,
	65,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
];
const hashes: Uint8Array[] = [
	...Array.from({ length: 24 }, (_, n) =>
		sha256(new TextEncoder().encode(`${n}challenge`)),
	),
	new Uint8Array(32),
	new Uint8Array([0, 0, 1]),
	new Uint8Array([]),
	new Uint8Array([0x0f, 0xff]),
];
const hashVectors = hashes.map((hash) => ({
	hash: toHex(hash),
	results: difficulties.map((d) => attempt(() => hashMeetsDifficulty(hash, d))),
}));
const targetVectors = difficulties.map((d) => ({
	difficulty: encode(d),
	result: attempt(() => targetForDifficulty(d).toString(16)),
}));
const powInputs: [string, number][] = [
	["a", 1],
	["a", 2],
	["longer-challenge-string", 2],
	["12345", 2.5],
	["solver-multidigit", 3],
	["ünïcödé", 2],
	["", 0],
	["x", -1],
];
const powVectors = await Promise.all(
	powInputs.map(async ([data, difficulty]) => ({
		data,
		difficulty,
		nonce: await solvePoW(data, difficulty),
	})),
);

const coordInputs: Json[] = [
	null,
	[],
	[[[90, 270]]],
	[[[0, 1000000]]],
	[[[1000001, 0]]],
	[[[-1, 0]]],
	[[[1.5, 0]]],
	[[[1.0, 2]]],
	[[[9007199254740992, 0]]],
	[[[1e21, 0]]],
	[[["5", 0]]],
	[[[true, 0]]],
	[[[null, 0]]],
	[[[[1, 2], 0]]],
	[[[[[1, null], 2], 0]]],
	[[[{ a: 1 }, 0]]],
	[[[1, 2, 3]]],
	[[[]]],
	[[]],
	"not an array",
	5,
	false,
	{ a: 1 },
	["stroke"],
	[["point"]],
	[[[1, 2]], [[3, -4]]],
];
const coordVectors = coordInputs.map((coords) => ({
	coords,
	result: attempt((): Json => {
		assertCoordsSafe(coords, "label");
		return null;
	}),
}));

const flattenInputs: { [key: string]: Json }[] = [
	{},
	{ a: { b: { c: 1 } }, d: 2 },
	{ b: [true, null], 1: "x", a: {}, 0: { z: 1 } },
	{ "set-cookie": ["a=1", "b=2"], host: "example.com" },
	{ "a.b": 1, a: { b: 2 }, c: [[1, [2]]] },
	{ 10: 1, 2: 2, "01": 3, "-1": 4, 4294967295: 5, 4294967294: 6 },
];
const flattenVectors = flattenInputs.map((obj) => ({
	obj,
	result: Object.entries(flatten(obj)),
}));

const now = 1_700_000_000_000;
Date.now = (): number => now;
const recencyInputs: [string, number][] = [
	[`${now - 500}___abc`, 500],
	[`${now - 501}___abc`, 500],
	[`${now + 10}___abc`, 0],
	["___abc", 1e15],
	["abc___1", 1e15],
	["  1700000000000xyz", 0],
	["-5___", 1e15],
	["1e3___", 1e15],
	[`${now}`, 0],
	["", 0],
];
const recencyVectors = recencyInputs.map(([challenge, maxVerifiedTime]) => ({
	challenge,
	maxVerifiedTime,
	now,
	result: verifyRecency(challenge, maxVerifiedTime),
}));

const vectors = {
	numberToString: numbers.map((n) => ({
		n: encode(n),
		result: String(n),
	})),
	at: atVectors,
	atString: atStringVectors,
	u8aToHex: u8aVectors,
	embedData: embedVectors,
	extractData: extractVectors,
	getIPAddress: ipVectors,
	fromBigInt: bigIntVectors,
	validateDomain: domainVectors,
	parseUrl: parseUrlVectors,
	validateDomainForOutboundRequest: outboundVectors,
	decodeGoogleTranslateHost: translateVectors,
	buildDomainSuffixCandidates: suffixVectors,
	extractDomainFromEmail: emailVectors,
	sanitisePageUrl: pageUrlVectors,
	isProtectDeployment: protectVectors,
	hashMeetsDifficulty: {
		difficulties: difficulties.map(encode),
		hashes: hashVectors,
	},
	targetForDifficulty: targetVectors,
	solvePoW: powVectors,
	assertCoordsSafe: coordVectors,
	flatten: flattenVectors,
	verifyRecency: recencyVectors,
};

writeFileSync(
	fileURLToPath(new URL("./vectors.json", import.meta.url)),
	`${JSON.stringify(vectors, null, "\t")}\n`,
);

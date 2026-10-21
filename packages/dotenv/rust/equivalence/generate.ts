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

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getEnvFile, loadEnv } from "../../src/index.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Entries = [string, string][];

type ParseVector = { src: string; entries: Entries };

type TreeNode =
	| { path: string; kind: "dir" }
	| { path: string; kind: "file"; contents: string };

type Outcome = { ok: string } | { error: string };

type DiscoveryArgs = [
	string | null,
	string | null,
	string | null,
	string | null,
];

type DiscoveryVector = {
	cwd: string;
	nodeEnvVar: string | null;
	args: DiscoveryArgs;
	result: Outcome;
};

type LoadVector = {
	cwd: string;
	nodeEnvVar: string | null;
	args: DiscoveryArgs;
	override: boolean;
	preset: Entries;
	result: Outcome;
	after: [string, string | null][];
};

type Vectors = {
	parse: ParseVector[];
	tree: TreeNode[];
	defaultFilepath: string;
	discovery: DiscoveryVector[];
	load: LoadVector[];
};

const ROOT_TOKEN = "<root>";
const DEFAULT_TOKEN = "<default>";
const SENTINEL: string = JSON.stringify({ name: "@prosopo/captcha-private" });

const here: string = path.dirname(fileURLToPath(import.meta.url));
const defaultFilepath: string = path.join(here, "../../src", "../..");

const curatedParse: string[] = [
	"",
	"\n",
	"KEY=value",
	"KEY=value\n",
	"KEY = value",
	"KEY= value  ",
	"  KEY=value",
	"export KEY=value",
	"export  KEY=value",
	"exportKEY=value",
	"export\tKEY=value",
	"export=value",
	"export",
	"KEY",
	"KEY=",
	"KEY=\nNEXT=1",
	"KEY=\n\nNEXT=1",
	"KEY=\n'quoted'",
	'KEY=\n"dq"',
	"KEY: value",
	"KEY:value",
	"KEY :value",
	"KEY:  value",
	"KEY:\nvalue",
	"KEY='single'",
	'KEY="double"',
	"KEY=`backtick`",
	"KEY='a b c'",
	'KEY="a\\nb"',
	"KEY='a\\nb'",
	"KEY=`a\\nb`",
	'KEY="a\\rb"',
	'KEY="a\\tb"',
	"KEY=a\\nb",
	'KEY="\\\\n"',
	'KEY="line1\nline2"',
	"KEY='line1\nline2'",
	"KEY=`line1\nline2`",
	'KEY="line1\r\nline2"',
	'KEY="unterminated\nNEXT=1',
	"KEY='unterminated",
	'KEY="unterminated',
	"KEY=`unterminated",
	'KEY="a" # comment',
	'KEY="a"# comment',
	'KEY="a" trailing',
	"KEY='a' trailing",
	"KEY=value # comment",
	"KEY=value# comment",
	"KEY=value #",
	"KEY=#notvalue",
	"KEY='#inside'",
	'KEY="#inside"',
	"KEY=`#inside`",
	"KEY=a#b",
	"# KEY=commented",
	"#KEY=commented\nREAL=1",
	"   # indented comment\nREAL=1",
	"KEY=''",
	'KEY=""',
	"KEY=``",
	"KEY='",
	'KEY="',
	"KEY=`",
	"KEY='\"'",
	'KEY="\'"',
	'KEY="`"',
	'KEY="escaped \\" quote"',
	"KEY='escaped \\' quote'",
	"KEY=`escaped \\` quote`",
	"KEY='it's'",
	'KEY="say "hi""',
	"KEY='mixed\"",
	"KEY=\"mixed'",
	"KEY=  'spaced quote'  ",
	'KEY=\t"tabbed"\t',
	"KEY=a=b=c",
	"KEY==value",
	"KEY=:value",
	"KEY.WITH.DOTS=1",
	"KEY-WITH-DASHES=1",
	"key_lower=1",
	"123=numeric",
	"0=zero",
	"01=leading",
	"4294967294=max",
	"4294967295=over",
	"B=1\nA=2\n10=3\n2=4",
	"DUP=1\nDUP=2",
	"DUP=1\nOTHER=x\nDUP=2",
	"__proto__=polluted",
	"__proto__=polluted\nAFTER=1",
	"constructor=c",
	"hasOwnProperty=h",
	"KEY WITH SPACE=1",
	"KEY$=1",
	"KÉY=1",
	"KEY=héllo wörld",
	"KEY=emoji 🚀",
	'KEY="emoji 🚀"',
	"\uFEFFKEY=bom",
	"KEY=\u00A0nbsp\u00A0",
	"\u00A0KEY=nbsp-lead",
	"KEY=a\u2028b",
	"KEY='a\u2028b'",
	"KEY=a\u2029NEXT=1",
	"KEY=a\u0085b",
	"KEY=a\u3000",
	"A=1\r\nB=2\r\n",
	"A=1\rB=2\r",
	"A=1\r\r\nB=2",
	"A='x\r\ny'",
	'A="x\r\ny"',
	"A=1\n\n\n\nB=2",
	"A=1\n   \nB=2",
	"A\n=1",
	"A=\n=1",
	"A=1 2 3",
	"A=   ",
	"A=\t",
	"A= # c",
	"A='' # c",
	'A="" # c',
	"A='x'y'",
	"A='x' 'y'",
	'A="x" "y"',
	'A="multi\nline\nvalue"\nB=after',
	"A='multi\nline' trailing\nB=after",
	'A="a\nb" # comment\nB=after',
	'A="first"\nB="second"',
	"A='a\\'b'",
	'A="a\\\\"',
	"A='\\'",
	"A=\\",
	"A=$OTHER",
	"A=${OTHER}",
	'A="${OTHER}"',
	"A=null",
	"A=undefined",
	"A=true",
	"A=0",
	"A=\u0000nul",
	"A=a\u0000b",
	"A=\u000Bvt",
	"A=\fff",
	"A:B=1",
	"A: B: C",
	"A::B",
	"A=1;B=2",
	"A=1 B=2",
	"export A='quoted' # c\nexport B=\"dq\"\n# end",
	"  export   A  =  spaced  ",
	"A=1\n#B=2\nC=3",
	"A=1\n\n# comment\n\nB='two'\nC=\"three\\nlines\"\nD=`four`\n",
	"DB_URL=mongodb://user:pass@host:27017/db?retryWrites=true&w=majority",
	"KEY=-----BEGIN KEY-----\\nabc\\n-----END KEY-----",
	'PRIVATE_KEY="-----BEGIN KEY-----\nabc\ndef\n-----END KEY-----"',
	'JSON={"a":1,"b":[1,2]}',
	"JSON='{\"a\":1}'",
	"URL=https://example.com/#anchor",
	"URL=https://example.com/ #anchor",
	"A='''",
	'A="""',
	"A=```",
	"A='a'''",
	"A=''a'",
	'A=""a"',
	"A=`a``",
	'A="a\n"b"',
	"A='x\n'y'",
	"=value",
	"=",
	" = ",
	"#",
	"A",
	"A B",
	".=dot",
	"-=dash",
	"_=under",
	"a.b-c_d=mix",
];

function mulberry32(seed: number): () => number {
	let a: number = seed >>> 0;
	return (): number => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t: number = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const fuzzAlphabet: string[] = [
	"A",
	"B",
	"k",
	"1",
	"_",
	".",
	"-",
	"=",
	"=",
	":",
	"'",
	'"',
	"`",
	"\\",
	"#",
	" ",
	" ",
	"\t",
	"\n",
	"\n",
	"\r",
	"n",
	"r",
	"export ",
	"\u00A0",
	"\uFEFF",
	"\u2028",
	"\u0085",
	"é",
	"🚀",
	"$",
];

function fuzzParse(count: number, seed: number): string[] {
	const rand: () => number = mulberry32(seed);
	const out: string[] = [];
	for (let i = 0; i < count; i++) {
		const len: number = Math.floor(rand() * 40);
		let s = "";
		for (let j = 0; j < len; j++) {
			s += fuzzAlphabet[Math.floor(rand() * fuzzAlphabet.length)];
		}
		out.push(s);
	}
	return out;
}

function structuredFuzz(count: number, seed: number): string[] {
	const rand: () => number = mulberry32(seed);
	const pick = (items: string[]): string =>
		items[Math.floor(rand() * items.length)] ?? "";
	const prefixes: string[] = ["", " ", "\t", "export ", "  export\t", "#"];
	const keys: string[] = ["A", "KEY", "k.e-y", "9", "__proto__", "B_2"];
	const seps: string[] = ["=", " = ", "=\t", ": ", ":", " :", "=\n"];
	const values: string[] = [
		"",
		"plain",
		"with space",
		"'sq'",
		'"dq"',
		"`bt`",
		'"a\\nb"',
		"'a\\nb'",
		'"multi\nline"',
		"'multi\nline'",
		"`multi\nline`",
		"'open",
		'"open',
		"x # c",
		"'x' # c",
		'"x"y',
		"#h",
		'"\\""',
	];
	const ends: string[] = ["\n", "\r\n", "\r", "", " \n", " # tail\n"];
	const out: string[] = [];
	for (let i = 0; i < count; i++) {
		const lines: number = 1 + Math.floor(rand() * 4);
		let s = "";
		for (let j = 0; j < lines; j++) {
			s += pick(prefixes) + pick(keys) + pick(seps) + pick(values) + pick(ends);
		}
		out.push(s);
	}
	return out;
}

function parseVectors(): ParseVector[] {
	const sources: string[] = [
		...curatedParse,
		...structuredFuzz(500, 0x5eed),
		...fuzzParse(900, 0xd07e),
	];
	return sources.map(
		(src: string): ParseVector => ({
			src,
			entries: Object.entries(dotenv.parse(src)),
		}),
	);
}

const tree: TreeNode[] = [
	{ path: "ws", kind: "dir" },
	{ path: "ws/package.json", kind: "file", contents: SENTINEL },
	{ path: "ws/.env.test", kind: "file", contents: "PROSOPO_EQ_A=ws\n" },
	{ path: "ws/.env", kind: "file", contents: "PROSOPO_EQ_A=unsuffixed\n" },
	{ path: "ws/.env.", kind: "file", contents: "PROSOPO_EQ_A=trailing-dot\n" },
	{ path: "ws/custom.test", kind: "file", contents: "PROSOPO_EQ_C=custom\n" },
	{
		path: "ws/.env.production",
		kind: "file",
		contents: "PROSOPO_EQ_A=prod\nPROSOPO_EQ_B='quoted # not comment'\n",
	},
	{
		path: "ws/a/b/.env.test",
		kind: "file",
		contents:
			'# nearest\nPROSOPO_EQ_A=nearest\nPROSOPO_EQ_B="multi\nline"\nPROSOPO_EQ_D=a\u0000b\n',
	},
	{ path: "ws/a/b/c/d", kind: "dir" },
	{ path: "ws/a/sub/.env.test", kind: "file", contents: "PROSOPO_EQ_A=sub\n" },
	{
		path: "ws/pkgs/other/package.json",
		kind: "file",
		contents: '{"name":"@prosopo/dotenv"}',
	},
	{ path: "ws/pkgs/other/src", kind: "dir" },
	{
		path: "ws/pkgs/nameless/package.json",
		kind: "file",
		contents: '{"version":1}',
	},
	{ path: "ws/pkgs/nameless/src", kind: "dir" },
	{ path: "ws/pkgs/num/package.json", kind: "file", contents: "123" },
	{ path: "ws/pkgs/num/src", kind: "dir" },
	{
		path: "ws/pkgs/str/package.json",
		kind: "file",
		contents: '"@prosopo/captcha-private"',
	},
	{ path: "ws/pkgs/str/src", kind: "dir" },
	{
		path: "ws/pkgs/arr/package.json",
		kind: "file",
		contents: '["@prosopo/captcha-private"]',
	},
	{ path: "ws/pkgs/arr/src", kind: "dir" },
	{ path: "ws/pkgs/bool/package.json", kind: "file", contents: " true " },
	{ path: "ws/pkgs/bool/src", kind: "dir" },
	{
		path: "ws/pkgs/objname/package.json",
		kind: "file",
		contents: '{"name":{"name":"@prosopo/captcha-private"}}',
	},
	{ path: "ws/pkgs/objname/src", kind: "dir" },
	{
		path: "ws/pkgs/dupfirst/package.json",
		kind: "file",
		contents: '{"name":"@prosopo/captcha-private","name":"x"}',
	},
	{ path: "ws/pkgs/dupfirst/src", kind: "dir" },
	{
		path: "ws/pkgs/duplast/package.json",
		kind: "file",
		contents: '{"name":"x","name":"@prosopo/captcha-private"}',
	},
	{ path: "ws/pkgs/duplast/src", kind: "dir" },
	{
		path: "ws/pkgs/spaced/package.json",
		kind: "file",
		contents:
			'\n\t{ "name" : "@prosopo/captcha-private" , "x": [1, 2.5e3, null, {"y": "\\u0041"}] }\r\n',
	},
	{ path: "ws/pkgs/spaced/deep", kind: "dir" },
	{
		path: "ws/pkgs/spaced/.env.prod",
		kind: "file",
		contents: "PROSOPO_EQ_A=spaced\n",
	},
	{
		path: "ws/pkgs/escaped/package.json",
		kind: "file",
		contents: '{"name":"@prosopo\\/captcha-\\u0070rivate"}',
	},
	{ path: "ws/pkgs/escaped/src", kind: "dir" },
	{
		path: "ws/pkgs/case/package.json",
		kind: "file",
		contents: '{"name":"@Prosopo/captcha-private"}',
	},
	{ path: "ws/pkgs/case/src", kind: "dir" },
	{
		path: "ws/pkgs/broken/package.json",
		kind: "file",
		contents: "{ not valid json",
	},
	{ path: "ws/pkgs/broken/src", kind: "dir" },
	{ path: "ws/pkgs/null/package.json", kind: "file", contents: "null" },
	{ path: "ws/pkgs/null/src", kind: "dir" },
	{ path: "ws/pkgs/empty/package.json", kind: "file", contents: "" },
	{ path: "ws/pkgs/empty/src", kind: "dir" },
	{
		path: "ws/pkgs/bom/package.json",
		kind: "file",
		contents: `\uFEFF${SENTINEL}`,
	},
	{ path: "ws/pkgs/bom/src", kind: "dir" },
	{
		path: "ws/pkgs/trailing/package.json",
		kind: "file",
		contents: '{"name":"@prosopo/captcha-private",}',
	},
	{ path: "ws/pkgs/trailing/src", kind: "dir" },
	{
		path: "ws/pkgs/garbage/package.json",
		kind: "file",
		contents: '{"name":"@prosopo/captcha-private"} x',
	},
	{ path: "ws/pkgs/garbage/src", kind: "dir" },
	{ path: "ws/pkgs/pkgdir/package.json", kind: "dir" },
	{ path: "ws/pkgs/pkgdir/src", kind: "dir" },
	{ path: "ws/pkgs/envdir/.env.test", kind: "dir" },
	{ path: "ws/pkgs/envdir/src", kind: "dir" },
	{
		path: "ws/pkgs/found-before-broken/package.json",
		kind: "file",
		contents: "{ broken",
	},
	{
		path: "ws/pkgs/found-before-broken/.env.test",
		kind: "file",
		contents: "PROSOPO_EQ_A=fbb\n",
	},
	{ path: "ws/pkgs/found-before-broken/src", kind: "dir" },
	{
		path: "ws/deep/d0/d1/d2/d3/d4/d5/d6/d7/d8/d9/d10/d11/d12/d13",
		kind: "dir",
	},
	{
		path: "ws/deep/d0/d1/d2/d3/d4/d5/d6/d7/d8/d9/d10/d11/d12/.env.deep",
		kind: "file",
		contents: "PROSOPO_EQ_A=deep\n",
	},
	{
		path: "ws/deep/.env.deep",
		kind: "file",
		contents: "PROSOPO_EQ_A=deep-top\n",
	},
	{ path: "ws/deep/d0/.env.deep9", kind: "file", contents: "" },
	{ path: "ws/deep/.env.deep10", kind: "file", contents: "" },
	{ path: "ws/sub dir/with space", kind: "dir" },
	{
		path: "ws/sub dir/.env.test",
		kind: "file",
		contents: "PROSOPO_EQ_A=space\n",
	},
	{ path: "ws/cfg/.env.test", kind: "file", contents: "PROSOPO_EQ_A=cfg\n" },
	{
		path: "ws/odd/.env.a/b",
		kind: "file",
		contents: "PROSOPO_EQ_A=slash-env\n",
	},
	{ path: "ws/odd/x", kind: "dir" },
	{ path: "outside/x/y", kind: "dir" },
	{
		path: "outside/.env.prosopo-eq-outside",
		kind: "file",
		contents: "PROSOPO_EQ_A=outside\n",
	},
];

const D13 = "ws/deep/d0/d1/d2/d3/d4/d5/d6/d7/d8/d9/d10/d11/d12/d13";
const D9 = "ws/deep/d0/d1/d2/d3/d4/d5/d6/d7/d8/d9";

type Case = {
	cwd: string;
	nodeEnvVar: string | null;
	args: DiscoveryArgs;
};

const nodeEnvVars: (string | null)[] = [
	null,
	"",
	"test",
	"!!!",
	" te-st ",
	"tëst",
	"production",
];

function discoveryCases(): Case[] {
	const cases: Case[] = [];
	const add = (
		cwd: string,
		nodeEnvVar: string | null,
		...args: DiscoveryArgs
	): void => {
		cases.push({ cwd, nodeEnvVar, args });
	};
	const starts: string[] = [
		"<root>/ws",
		"<root>/ws/a/b/c/d",
		"<root>/ws/a/b",
		"<root>/ws/a/b/",
		"<root>/ws/a/b/c/../..",
		"<root>/ws/a/sub",
		"<root>/ws/pkgs/other/src",
		"<root>/ws/pkgs/nameless/src",
		"<root>/ws/pkgs/num/src",
		"<root>/ws/pkgs/str/src",
		"<root>/ws/pkgs/arr/src",
		"<root>/ws/pkgs/bool/src",
		"<root>/ws/pkgs/objname/src",
		"<root>/ws/pkgs/dupfirst/src",
		"<root>/ws/pkgs/duplast/src",
		"<root>/ws/pkgs/spaced/deep",
		"<root>/ws/pkgs/escaped/src",
		"<root>/ws/pkgs/case/src",
		"<root>/ws/pkgs/broken/src",
		"<root>/ws/pkgs/null/src",
		"<root>/ws/pkgs/empty/src",
		"<root>/ws/pkgs/bom/src",
		"<root>/ws/pkgs/trailing/src",
		"<root>/ws/pkgs/garbage/src",
		"<root>/ws/pkgs/pkgdir/src",
		"<root>/ws/pkgs/envdir/src",
		"<root>/ws/pkgs/found-before-broken/src",
		`<root>/${D13}`,
		`<root>/${D9}`,
		"<root>/ws/sub dir/with space",
		"<root>/ws/odd/x",
		"<root>/ws/nonexistent/dir",
	];
	for (const start of starts) {
		add("<root>/ws", null, start, ".env", null, "test");
	}
	for (const start of starts.slice(0, 8)) {
		for (const v of nodeEnvVars) {
			add("<root>/ws", v, start, null, null, null);
		}
	}
	for (const nodeEnv of [
		"test",
		"",
		null,
		"production",
		"prod",
		"deep",
		"deep9",
		"deep10",
		"a/b",
		"../x",
		"TEST",
		"te-st",
		".",
	]) {
		for (const start of [
			"<root>/ws/a/b/c/d",
			`<root>/${D13}`,
			`<root>/${D9}`,
			"<root>/ws/pkgs/spaced/deep",
			"<root>/ws/odd/x",
		]) {
			add("<root>/ws", "staging", start, ".env", null, nodeEnv);
		}
	}
	for (const filename of [
		".env",
		"custom",
		"",
		"cfg/.env",
		"../.env",
		"./.env",
		".env/",
		"package.json",
		"missing",
	]) {
		for (const nodeEnv of ["test", null]) {
			for (const v of [null, "!!!", "test"]) {
				add("<root>/ws", v, "<root>/ws/a/b/c", filename, null, nodeEnv);
			}
		}
	}
	for (const filepath of [
		null,
		"",
		"/some/other/place",
		"rel/base",
		"<root>/fallback/",
		"~/home-rel",
		"a/../../b",
	]) {
		for (const rootDir of [
			null,
			"",
			"<root>/ws/a/b/c",
			"<root>/ws/nothing-here",
			"a/b/c",
			"./x/../y",
		]) {
			add("<root>/ws/a/b/c/d", null, rootDir, ".env", filepath, "nope-env");
		}
	}
	for (const cwd of [
		"<root>/ws",
		"<root>/ws/a/b/c/d",
		"<root>/ws/pkgs/broken/src",
		"<root>/ws/pkgs/null",
		`<root>/${D13}`,
		"<root>/outside/x/y",
	]) {
		for (const rootDir of [null, "", ".", "..", "../..", "sub", "/"]) {
			add(cwd, "test", rootDir, null, null, null);
		}
	}
	add(
		"<root>/outside",
		null,
		"<root>/outside/x/y",
		".env",
		null,
		"prosopo-eq-outside",
	);
	add("<root>/outside", null, "x/y", ".env", null, "prosopo-eq-outside");
	add("<root>/outside", null, "/", ".env", null, "prosopo-eq-never-9f3a");
	add("<root>/outside", null, "///", ".env", "", "prosopo-eq-never-9f3a");
	add("<root>/outside", null, "<root>//ws//a///b", ".env", null, "test");
	add("<root>/outside", null, "<root>/ws/./a/./b/.", ".env", null, "test");
	return cases;
}

function loadCases(): (Case & { override: boolean; preset: Entries })[] {
	const out: (Case & { override: boolean; preset: Entries })[] = [];
	const presets: Entries[] = [
		[],
		[["PROSOPO_EQ_A", "preset"]],
		[
			["PROSOPO_EQ_A", ""],
			["PROSOPO_EQ_B", "preset-b"],
		],
	];
	const targets: Case[] = [
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws", null, null, "test"],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws/a/b/c/d", null, null, "test"],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: "production",
			args: ["<root>/ws/a/sub", null, null, null],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws", null, null, "production"],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: "!!!",
			args: ["<root>/ws/a", null, null, null],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws", "custom", null, "test"],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws/pkgs/envdir/src", null, null, "test"],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws/a", null, null, "nope-env"],
		},
		{
			cwd: "<root>/ws/a/b/c",
			nodeEnvVar: "test",
			args: [null, null, null, null],
		},
		{
			cwd: "<root>/ws/a/b/c",
			nodeEnvVar: null,
			args: ["", null, "/elsewhere", "test"],
		},
		{
			cwd: "<root>/ws/a/b/c",
			nodeEnvVar: null,
			args: ["../..", null, null, "test"],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws/pkgs/broken/src", null, null, "test"],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws/pkgs/null/src", null, null, "test"],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws/pkgs/pkgdir/src", null, null, "test"],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws/odd/x", null, null, "a/b"],
		},
		{
			cwd: "<root>/ws",
			nodeEnvVar: null,
			args: ["<root>/ws/a/b", "", null, ""],
		},
	];
	for (const target of targets) {
		for (const preset of presets) {
			for (const override of [false, true]) {
				out.push({ ...target, override, preset });
			}
		}
	}
	return out;
}

function errorKind(error: unknown): string {
	if (error instanceof SyntaxError) return "SyntaxError";
	if (error instanceof TypeError) return "TypeError";
	if (error instanceof Error && "code" in error) return String(error.code);
	throw error;
}

function main(): void {
	const tmp: string = fs.mkdtempSync(
		path.join(os.tmpdir(), "prosopo-dotenv-eq-"),
	);
	const savedCwd: string = process.cwd();
	const savedEnv: NodeJS.ProcessEnv = { ...process.env };
	const fromToken = (p: string | null): string | undefined =>
		p === null ? undefined : p.split(ROOT_TOKEN).join(tmp);
	const toToken = (p: string): string =>
		p.startsWith(defaultFilepath)
			? DEFAULT_TOKEN + p.slice(defaultFilepath.length)
			: p.split(tmp).join(ROOT_TOKEN);
	const setNodeEnv = (value: string | null): void => {
		if (value === null) {
			// biome-ignore lint/performance/noDelete: the variable must be absent
			delete process.env.NODE_ENV;
		} else {
			process.env.NODE_ENV = value;
		}
	};
	const argsOf = (
		args: DiscoveryArgs,
	): [
		string | undefined,
		string | undefined,
		string | undefined,
		string | undefined,
	] => [
		fromToken(args[0]),
		args[1] ?? undefined,
		fromToken(args[2]),
		args[3] ?? undefined,
	];

	try {
		for (const node of tree) {
			const full: string = path.join(tmp, node.path);
			if (node.kind === "dir") {
				fs.mkdirSync(full, { recursive: true });
			} else {
				fs.mkdirSync(path.dirname(full), { recursive: true });
				fs.writeFileSync(full, node.contents);
			}
		}

		const discovery: DiscoveryVector[] = discoveryCases().map(
			(c: Case): DiscoveryVector => {
				process.chdir(fromToken(c.cwd) ?? tmp);
				setNodeEnv(c.nodeEnvVar);
				let result: Outcome;
				try {
					result = { ok: toToken(getEnvFile(...argsOf(c.args))) };
				} catch (error: unknown) {
					result = { error: errorKind(error) };
				}
				return { ...c, result };
			},
		);

		const load: LoadVector[] = loadCases().map(
			(c: Case & { override: boolean; preset: Entries }): LoadVector => {
				process.chdir(fromToken(c.cwd) ?? tmp);
				setNodeEnv(c.nodeEnvVar);
				const keys: string[] = [
					"PROSOPO_EQ_A",
					"PROSOPO_EQ_B",
					"PROSOPO_EQ_C",
					"PROSOPO_EQ_D",
				];
				for (const key of keys) delete process.env[key];
				for (const [key, value] of c.preset) process.env[key] = value;
				let result: Outcome;
				try {
					const [rootDir, filename, filePath, nodeEnv] = argsOf(c.args);
					result = {
						ok: toToken(
							loadEnv(rootDir, filename, filePath, nodeEnv, c.override),
						),
					};
				} catch (error: unknown) {
					result = { error: errorKind(error) };
				}
				const after: [string, string | null][] = keys.map(
					(key: string): [string, string | null] => [
						key,
						process.env[key] ?? null,
					],
				);
				for (const key of keys) delete process.env[key];
				return { ...c, result, after };
			},
		);

		const vectors: Vectors = {
			parse: parseVectors(),
			tree,
			defaultFilepath: DEFAULT_TOKEN,
			discovery,
			load,
		};
		fs.writeFileSync(
			path.join(here, "vectors.json"),
			`${JSON.stringify(vectors, null, "\t")}\n`,
		);
	} finally {
		process.chdir(savedCwd);
		for (const key of Object.keys(process.env)) {
			if (!(key in savedEnv)) delete process.env[key];
		}
		Object.assign(process.env, savedEnv);
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

main();

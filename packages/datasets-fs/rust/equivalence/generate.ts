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

// Runs the TS commands on scripted input trees and records into vectors.json what each one
// wrote or threw, which equivalence.rs replays against the Rust. The images it makes with
// sharp from the fixtures, in the formats and shapes the fixtures lack, are written to
// inputs/ for the Rust to read. bcrypt's random bytes come from a fixed stream, and are
// recorded, so the salts can be compared too.

import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProsopoBaseError } from "@prosopo/common";
import bcrypt from "bcrypt";
import sharp from "sharp";
import { ZodError } from "zod";
import type { CliCommandAny } from "../../src/cli/cliCommand.js";
import { Flatten } from "../../src/commands/flatten.js";
import { GenerateV1 } from "../../src/commands/generateV1.js";
import { GenerateV2 } from "../../src/commands/generateV2.js";
import { Get } from "../../src/commands/get.js";
import { Labels } from "../../src/commands/labels.js";
import { Relocate } from "../../src/commands/relocate.js";
import { Resize } from "../../src/commands/resize.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "../../../..");
const FIXTURES = "packages/datasets-fs/src/tests/data";
const INPUTS = "packages/datasets-fs/rust/equivalence/inputs";

// bcrypt reads crypto.randomBytes at call time from the CommonJS module object.
const cjsCrypto = createRequire(import.meta.url)("node:crypto") as { randomBytes: (n: number) => Buffer };
let prngState = 0x62637279;
let draws: string[] = [];
cjsCrypto.randomBytes = (n: number): Buffer => {
	const bytes = Buffer.alloc(n);
	for (let i = 0; i < n; i++) {
		prngState ^= prngState << 13;
		prngState ^= prngState >>> 17;
		prngState ^= prngState << 5;
		bytes[i] = prngState & 0xff;
	}
	draws.push(bytes.toString("hex"));
	return bytes;
};

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

const writeInput = async (name: string, image: Promise<Buffer>): Promise<string> => {
	const target = path.join(REPO, INPUTS, name);
	fs.writeFileSync(target, await image);
	return `${INPUTS}/${name}`;
};

const fixture = (name: string): string => `${FIXTURES}/${name}`;
const flatImages = fs.readdirSync(path.join(REPO, fixture("flat/images"))).sort().map((name) => fixture(`flat/images/${name}`));
const firstPng = path.join(REPO, flatImages[0] as string);

fs.rmSync(path.join(REPO, INPUTS), { recursive: true, force: true });
fs.mkdirSync(path.join(REPO, INPUTS), { recursive: true });
const source = (): sharp.Sharp => sharp(firstPng);
const made: string[] = [
	await writeInput("lossy.webp", source().webp({ quality: 70 }).toBuffer()),
	await writeInput("alpha.webp", source().ensureAlpha(0.5).webp({ lossless: true }).toBuffer()),
	await writeInput("anim.gif", source().gif().toBuffer()),
	await writeInput("lzw.tiff", source().tiff({ compression: "lzw" }).toBuffer()),
	await writeInput("deep.png", source().toColourspace("rgb16").png().toBuffer()),
	await writeInput("grey.png", source().greyscale().png().toBuffer()),
	await writeInput("grey-alpha.png", source().greyscale().ensureAlpha(0.7).png().toBuffer()),
	await writeInput("palette.png", source().png({ palette: true, colours: 16 }).toBuffer()),
	await writeInput("p3.png", source().withIccProfile("p3").png().toBuffer()),
	await writeInput("p3.jpg", source().withIccProfile("p3").jpeg().toBuffer()),
	await writeInput("cmyk.jpg", source().toColourspace("cmyk").jpeg().toBuffer()),
	await writeInput("orient6.jpg", source().jpeg().withMetadata({ orientation: 6 }).toBuffer()),
	await writeInput("large.jpg", source().resize(2000, 1200, { fit: "fill" }).jpeg().toBuffer()),
	await writeInput("exact4.jpg", source().resize(512, 512, { fit: "fill" }).jpeg().toBuffer()),
	await writeInput("exact2.jpg", source().resize(256, 300, { fit: "fill" }).jpeg().toBuffer()),
	await writeInput("tiny.png", source().resize(10, 7, { fit: "fill" }).png().toBuffer()),
	await writeInput("strip.png", source().resize(1, 500, { fit: "fill" }).png().toBuffer()),
	await writeInput("wide.png", source().resize(900, 40, { fit: "fill" }).png().toBuffer()),
	await writeInput("half-alpha.png", source().ensureAlpha(0.5).png().toBuffer()),
];
const corrupt: string[] = [
	await writeInput("truncated.png", Promise.resolve(fs.readFileSync(firstPng).subarray(0, 400))),
	await writeInput("random.bin", Promise.resolve(Buffer.from(Array.from({ length: 300 }, (_, i) => (i * 37 + 11) & 0xff)))),
	await writeInput("empty.png", Promise.resolve(Buffer.alloc(0))),
	await writeInput("vector.svg", Promise.resolve(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="red"/></svg>'))),
];

type Setup = { kind: "copy"; from: string; to: string } | { kind: "write"; to: string; text: string } | { kind: "mkdir"; to: string };
type Scenario = { label: string; command: string; args: Json; setup: Setup[] };

const scenarios: Scenario[] = [];
const add = (label: string, command: string, args: Json, setup: Setup[] = []): void => {
	scenarios.push({ label, command, args, setup });
};

const dataFile = (items: { data: string; label?: string; hash?: string }[]): string =>
	JSON.stringify({ items: items.map((item, i) => ({ hash: `0xh${i}`, ...item, type: "image" })) }, null, 2);
const fixtureText = (name: string): string => fs.readFileSync(path.join(REPO, fixture(name)), "utf8");

// The resize matrix: every image once per fit and size, one run each so a failing image
// only fails its own run.
const RESIZES: [boolean, number][] = [
	[true, 128],
	[false, 128],
	[true, 37],
	[false, 300],
	[true, 1],
];
for (const [square, size] of RESIZES) {
	const images = [...flatImages, ...made];
	add(`resize ${square ? "cover" : "inside"} ${size}`, "resize", { input: "@ROOT@/in/data.json", output: "@ROOT@/out", square, size }, [
		{ kind: "write", to: "in/data.json", text: dataFile(images.map((image, i) => ({ data: `@REPO@/${image}`, label: `l${i % 3}`, hash: `0x${i}` }))) },
	]);
}
for (const image of corrupt) {
	add(`resize ${path.basename(image)}`, "resize", { input: "@ROOT@/in/data.json", output: "@ROOT@/out", square: true, size: 64 }, [
		{ kind: "write", to: "in/data.json", text: dataFile([{ data: `@REPO@/${image}` }]) },
	]);
}
const oneImage: Setup[] = [{ kind: "write", to: "in/data.json", text: dataFile([{ data: `@REPO@/${flatImages[1]}` }]) }];
for (const size of [0, 1.5, -3, 100000001]) {
	add(`resize size ${size}`, "resize", { input: "@ROOT@/in/data.json", output: "@ROOT@/out", size }, oneImage);
}
add("resize the fixtures as the TS test does", "resize", { input: "@ROOT@/in/data.json", output: "@ROOT@/out", overwrite: true, square: true, size: 128 }, [
	{ kind: "write", to: "in/data.json", text: fixtureText("flat/data.json").replaceAll("${repo}", "@REPO@") },
]);
add("resize a missing image", "resize", { input: "@ROOT@/in/data.json", output: "@ROOT@/out", size: 8 }, [
	{ kind: "write", to: "in/data.json", text: dataFile([{ data: "@ROOT@/in/missing.png" }]) },
]);
add("resize without a size", "resize", { input: "@ROOT@/in/data.json", output: "@ROOT@/out" }, oneImage);
add("resize into an existing output", "resize", { input: "@ROOT@/in/data.json", output: "@ROOT@/out", size: 8 }, [...oneImage, { kind: "write", to: "out/old.txt", text: "old" }]);
add("resize over an existing output", "resize", { input: "@ROOT@/in/data.json", output: "@ROOT@/out", size: 8, overwrite: true }, [...oneImage, { kind: "write", to: "out/old.txt", text: "old" }]);
add("resize to a bare output name", "resize", { input: "@ROOT@/in/data.json", output: "out", size: 8 }, oneImage);
add("resize invalid data", "resize", { input: "@ROOT@/in/data.json", output: "@ROOT@/out", size: 8 }, [{ kind: "write", to: "in/data.json", text: '{"items":[{"data":1}]}' }]);
add("resize unparseable data", "resize", { input: "@ROOT@/in/data.json", output: "@ROOT@/out", size: 8 }, [{ kind: "write", to: "in/data.json", text: "{nope" }]);

const hierarchical: Setup[] = fs
	.readdirSync(path.join(REPO, fixture("hierarchical")))
	.flatMap((label) =>
		fs.readdirSync(path.join(REPO, fixture(`hierarchical/${label}`))).map((name): Setup => ({ kind: "copy", from: fixture(`hierarchical/${label}/${name}`), to: `in/hier/${label}/${name}` })),
	);
add("flatten the fixtures as the TS test does", "flatten", { input: "@ROOT@/in/hier", output: "@ROOT@/out/flat", overwrite: true }, hierarchical);
const png = (index: number): string => flatImages[index] as string;
add("flatten a duplicate", "flatten", { input: "@ROOT@/in/hier", output: "@ROOT@/out/flat" }, [
	{ kind: "copy", from: png(2), to: "in/hier/a/one.png" },
	{ kind: "copy", from: png(2), to: "in/hier/b/two.png" },
]);
add("flatten an allowed duplicate", "flatten", { input: "@ROOT@/in/hier", output: "@ROOT@/out/flat", allowDuplicates: true }, [
	{ kind: "copy", from: png(2), to: "in/hier/a/one.png" },
	{ kind: "copy", from: png(2), to: "in/hier/b/two.png" },
	{ kind: "copy", from: png(3), to: "in/hier/b/three.png" },
]);
add("flatten odd names", "flatten", { input: "@ROOT@/in/hier", output: "@ROOT@/out/flat" }, [
	{ kind: "copy", from: png(4), to: "in/hier/zebra/noext" },
	{ kind: "copy", from: png(5), to: "in/hier/Zebra/.hidden" },
	{ kind: "copy", from: png(6), to: "in/hier/10/x.tar.gz" },
	{ kind: "copy", from: png(7), to: "in/hier/9/trailing." },
	{ kind: "copy", from: png(8), to: "in/hier/é/b.png" },
	{ kind: "copy", from: png(9), to: "in/hier/é/a.png" },
	{ kind: "copy", from: png(10), to: "in/hier/😀/c.png" },
	{ kind: "copy", from: png(11), to: "in/hier/ｚ/d.png" },
	{ kind: "write", to: "in/hier/not-a-label.txt", text: "ignored" },
]);
add("flatten a label holding a directory", "flatten", { input: "@ROOT@/in/hier", output: "@ROOT@/out/flat" }, [
	{ kind: "copy", from: png(4), to: "in/hier/a/a.png" },
	{ kind: "mkdir", to: "in/hier/a/sub" },
]);
add("flatten an empty input", "flatten", { input: "@ROOT@/in/hier", output: "@ROOT@/out/flat" }, [{ kind: "mkdir", to: "in/hier" }]);
add("flatten a missing input", "flatten", { input: "@ROOT@/in/hier", output: "@ROOT@/out/flat" });
add("flatten into an existing output", "flatten", { input: "@ROOT@/in/hier", output: "@ROOT@/out/flat" }, [
	{ kind: "copy", from: png(4), to: "in/hier/a/a.png" },
	{ kind: "write", to: "out/flat/old.txt", text: "old" },
]);
add("flatten over an existing output", "flatten", { input: "@ROOT@/in/hier", output: "@ROOT@/out/flat", overwrite: true }, [
	{ kind: "copy", from: png(4), to: "in/hier/a/a.png" },
	{ kind: "write", to: "out/flat/old.txt", text: "old" },
]);
add("flatten with an invalid argument", "flatten", { input: "@ROOT@/in/hier", output: 3 }, []);

const labelledText = fixtureText("flat_resized/data.json");
add("labels from the fixtures", "labels", { input: "@ROOT@/in/data.json", output: "@ROOT@/out/labels.json" }, [{ kind: "write", to: "in/data.json", text: labelledText }]);
add("labels in code unit order", "labels", { input: "@ROOT@/in/data.json", output: "@ROOT@/out/labels.json" }, [
	{ kind: "write", to: "in/data.json", text: dataFile(["b", "a", "B", "10", "9", "é", "😀", "ｚ", "a"].map((label, i) => ({ data: `/x/${i}`, label, hash: `0x${i}` }))) },
]);
add("labels from unlabelled data", "labels", { input: "@ROOT@/in/data.json", output: "@ROOT@/out/labels.json" }, [{ kind: "write", to: "in/data.json", text: dataFile([{ data: "/x" }]) }]);
add("labels to a bare output name", "labels", { input: "@ROOT@/in/data.json", output: "labels.json" }, [{ kind: "write", to: "in/data.json", text: labelledText }]);
add("labels into an existing output", "labels", { input: "@ROOT@/in/data.json", output: "@ROOT@/out/labels.json" }, [
	{ kind: "write", to: "in/data.json", text: labelledText },
	{ kind: "write", to: "out/labels.json", text: "{}" },
]);

const relocateArgs = (from: string, to: string): Json => ({ input: "@ROOT@/in/data.json", output: "@ROOT@/out/relocated.json", overwrite: true, from, to });
add("relocate the fixtures as the TS test does", "relocate", relocateArgs("${repo}", "newwebsite.com"), [{ kind: "copy", from: fixture("flat_resized/data.json"), to: "in/data.json" }]);
const nested = JSON.stringify({
	b: 1,
	"10": { data: "/img/10.png" },
	"2": [{ data: "/img/a.png", x: { data: "/img/deep.png" } }, { data: 5 }, { data: { data: "/img/never.png" } }],
	data: "/img/top.png",
	a: [[{ data: "/other/x.png" }]],
	n: 1.0,
	big: 12345678901234567890,
	tiny: 1e-7,
	s: " \u0001",
});
add("relocate nested data", "relocate", relocateArgs("/img", "https://cdn.example"), [{ kind: "write", to: "in/data.json", text: nested }]);
add("relocate with an empty prefix", "relocate", relocateArgs("", "https://cdn.example"), [{ kind: "write", to: "in/data.json", text: nested }]);
add("relocate a null", "relocate", relocateArgs("/img", "x"), [{ kind: "write", to: "in/data.json", text: '{"items":[{"data":"/img/a.png"},null]}' }]);
add("relocate a top-level null", "relocate", relocateArgs("/img", "x"), [{ kind: "write", to: "in/data.json", text: "null" }]);
add("relocate a string", "relocate", relocateArgs("/img", "x"), [{ kind: "write", to: "in/data.json", text: '"/img/a.png"' }]);
add("relocate without a prefix", "relocate", { input: "@ROOT@/in/data.json", output: "@ROOT@/out/relocated.json", to: "x" }, [{ kind: "write", to: "in/data.json", text: "{}" }]);

const generateSetup: Setup[] = [{ kind: "write", to: "in/data.json", text: labelledText }];
const v2 = (extra: { [key: string]: Json }): Json => ({ labelled: "@ROOT@/in/data.json", unlabelled: "@ROOT@/in/data.json", overwrite: true, output: "@ROOT@/out/captchas.json", seed: 0, allowDuplicates: true, ...extra });
add("generate v2 as the TS test does", "generateV2", v2({ count: 100, minIncorrect: 1, minCorrect: 1, minLabelled: 2, maxLabelled: 7 }), generateSetup);
add("generate v2 with another seed", "generateV2", v2({ count: 30, seed: 7, size: 6, maxLabelled: 4 }), generateSetup);
add("generate v2 with a string-like seed", "generateV2", v2({ count: 10, seed: 1.5 }), generateSetup);
add("generate v2 with fractional bounds", "generateV2", v2({ count: 10, minCorrect: 1.5, maxLabelled: 6.5, size: 8 }), generateSetup);
add("generate v2 with a fractional count", "generateV2", v2({ count: 2.5 }), generateSetup);
add("generate v2 without unlabelled data", "generateV2", v2({ count: 20, unlabelled: undefined, size: 4 }), generateSetup);
add("generate v2 without any count", "generateV2", v2({}), generateSetup);
add("generate v2 with duplicates", "generateV2", v2({ count: 5, allowDuplicates: false }), generateSetup);
add("generate v2 with labelled duplicates allowed", "generateV2", v2({ count: 5, allowDuplicates: false, allowDuplicatesLabelled: true }), generateSetup);
add("generate v2 with one label", "generateV2", v2({ count: 5 }), [{ kind: "write", to: "in/data.json", text: dataFile([0, 1, 2].map((i) => ({ data: `/x/${i}`, label: "only", hash: `0x${i}` }))) }]);
add("generate v2 with too few images", "generateV2", v2({ count: 5, size: 30, maxLabelled: 30 }), generateSetup);
add("generate v2 with numeric labels", "generateV2", v2({ count: 12, size: 4 }), [
	{ kind: "write", to: "in/data.json", text: dataFile(Array.from({ length: 24 }, (_, i) => ({ data: `/x/${i}`, label: ["b", "10", "9", "a"][i % 4] as string, hash: `0x${i}` }))) },
]);
add("generate v2 with a missing labelled file", "generateV2", v2({ count: 5, labelled: "@ROOT@/in/missing.json" }), generateSetup);
add("generate v2 into an existing output", "generateV2", v2({ count: 3, overwrite: undefined }), [...generateSetup, { kind: "write", to: "out/captchas.json", text: "old" }]);
add("generate v2 to a bare output name", "generateV2", v2({ count: 3, output: "captchas.json" }), generateSetup);
add("generate v2 without a seed", "generateV2", v2({ count: 3, seed: undefined }), generateSetup);

const v1 = (extra: { [key: string]: Json }): Json => ({ labelled: "@ROOT@/in/data.json", unlabelled: "@ROOT@/in/data.json", overwrite: true, output: "@ROOT@/out/captchas.json", seed: 0, allowDuplicates: true, ...extra });
add("generate v1 as the TS test does", "generateV1", v1({ solved: 50, unsolved: 50, minCorrect: 1, maxCorrect: 6 }), generateSetup);
add("generate v1 with defaults", "generateV1", v1({ solved: 5, unsolved: 5 }), generateSetup);
add("generate v1 with a small size", "generateV1", v1({ solved: 8, unsolved: 8, size: 5, seed: 11 }), generateSetup);
add("generate v1 with swapped bounds", "generateV1", v1({ solved: 10, minCorrect: 6, maxCorrect: 2, seed: 3 }), generateSetup);
add("generate v1 with a labels file", "generateV1", v1({ unsolved: 10, labels: "@ROOT@/in/labels.json" }), [...generateSetup, { kind: "write", to: "in/labels.json", text: '{"labels":["x","y","z"]}' }]);
add("generate v1 with a missing labels file", "generateV1", v1({ unsolved: 4, labels: "@ROOT@/in/missing.json" }), generateSetup);
add("generate v1 with too little unlabelled data", "generateV1", v1({ unsolved: 2, size: 60 }), generateSetup);
add("generate v1 with no labels", "generateV1", v1({ unsolved: 2, labelled: undefined, size: 3 }), generateSetup);
add("generate v1 with too few target images", "generateV1", v1({ solved: 2, minCorrect: 20, maxCorrect: 20, size: 25 }), generateSetup);
add("generate v1 with too few other images", "generateV1", v1({ solved: 2, minCorrect: 1, maxCorrect: 1, size: 70 }), generateSetup);
add("generate v1 with one label", "generateV1", v1({ solved: 1 }), [{ kind: "write", to: "in/data.json", text: dataFile([0, 1].map((i) => ({ data: `/x/${i}`, label: "only", hash: `0x${i}` }))) }]);
add("generate v1 with unlabelled duplicates", "generateV1", v1({ solved: 1, allowDuplicates: false, allowDuplicatesLabelled: true }), generateSetup);

const getData = JSON.stringify({ items: [{ data: "@ROOT@/in/present.txt" }, { data: "@ROOT@/in/absent.txt" }, { nested: [{ data: "http://127.0.0.1:9/closed" }] }, { data: "httpnot-a-url" }] });
add("get local and refused urls", "get", { input: "@ROOT@/in/data.json" }, [
	{ kind: "write", to: "in/present.txt", text: "here" },
	{ kind: "write", to: "in/data.json", text: getData },
]);
add("get a data that is not a string", "get", { input: "@ROOT@/in/data.json" }, [{ kind: "write", to: "in/data.json", text: '{"items":[{"data":"@ROOT@/in/data.json"},{"data":7}]}' }]);
add("get a missing input", "get", { input: "@ROOT@/in/data.json" });

const COMMANDS: { [name: string]: () => CliCommandAny } = {
	flatten: () => new Flatten(),
	resize: () => new Resize(),
	labels: () => new Labels(),
	relocate: () => new Relocate(),
	generateV1: () => new GenerateV1(),
	generateV2: () => new GenerateV2(),
	get: () => new Get(),
};

const substitute = (text: string, root: string): string => text.replaceAll("@ROOT@", root).replaceAll("@REPO@", REPO);
const substituteJson = (value: Json, root: string): Json => JSON.parse(substitute(JSON.stringify(value), root)) as Json;
const normalise = (text: string, root: string): string => text.replaceAll(root, "@ROOT@").replaceAll(REPO, "@REPO@");

const errorJson = (error: unknown, root: string): Json => {
	if (error instanceof ProsopoBaseError) {
		return {
			kind: "prosopo",
			class: error.constructor.name,
			key: error.translationKey ?? null,
			message: normalise(error.message, root),
			context: error.context === undefined ? null : (JSON.parse(normalise(JSON.stringify(error.context), root)) as Json),
		};
	}
	if (error instanceof ZodError) return { kind: "zod", issues: JSON.parse(JSON.stringify(error.issues)) as Json };
	if (error instanceof SyntaxError) return { kind: "json" };
	const fsError = error as { code?: string; syscall?: string };
	if (typeof fsError.code === "string" && typeof fsError.syscall === "string") return { kind: "fs", code: fsError.code, syscall: fsError.syscall };
	if (error instanceof TypeError) return { kind: "type", message: error.message };
	return { kind: "image", message: normalise((error as Error).message, root) };
};

const tree = (root: string): Json => {
	const out: { [path: string]: Json } = {};
	const walk = (dir: string): void => {
		for (const name of fs.readdirSync(dir)) {
			const full = path.join(dir, name);
			const relative = path.relative(root, full);
			if (relative === "in" || relative.startsWith(`in${path.sep}`)) continue;
			if (fs.statSync(full).isDirectory()) {
				out[`${relative}/`] = null;
				walk(full);
			} else if (name.endsWith(".json")) {
				out[relative] = { text: normalise(fs.readFileSync(full, "utf8"), root) };
			} else {
				out[relative] = { sha256: sha256(fs.readFileSync(full)) };
			}
		}
	};
	walk(root);
	return out;
};

const recorded: Json[] = [];
const cwd = process.cwd();
for (const scenario of scenarios) {
	const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "datasets-fs-eq-")));
	for (const step of scenario.setup) {
		const target = path.join(root, step.to);
		if (step.kind === "mkdir") {
			fs.mkdirSync(target, { recursive: true });
			continue;
		}
		fs.mkdirSync(path.dirname(target), { recursive: true });
		if (step.kind === "copy") fs.copyFileSync(path.join(REPO, step.from), target);
		else fs.writeFileSync(target, substitute(step.text, root));
	}
	process.chdir(root);
	draws = [];
	const command = COMMANDS[scenario.command]?.() as CliCommandAny;
	const logged: Json[] = [];
	command.logger.setLogLevel("error");
	for (const level of ["info", "error"] as const) {
		const original = command.logger[level].bind(command.logger);
		command.logger[level] = (fn: () => { msg?: string }) => {
			if (scenario.command === "get") logged.push([level, normalise(fn().msg ?? "", root)]);
			original(fn as never);
		};
	}
	let outcome: Json = null;
	try {
		const args = await command.parse(substituteJson(scenario.args, root));
		await command.exec(args);
	} catch (error) {
		outcome = errorJson(error, root);
	}
	process.chdir(cwd);
	recorded.push({ ...(scenario as unknown as { [key: string]: Json }), error: outcome, seeds: draws, files: tree(root), logged });
	fs.rmSync(root, { recursive: true, force: true });
}

const salts: Json[] = [1, 3, 4, 5, 9, 10, 12, 31, 32, 40].map((rounds) => {
	draws = [];
	const salt = bcrypt.genSaltSync(rounds);
	return { rounds, seed: draws[0] as string, salt };
});

const target = path.join(here, "vectors.json");
fs.writeFileSync(target, `${JSON.stringify({ salts, scenarios: recorded }, null, "\t")}\n`);
process.stdout.write(`wrote ${recorded.length} scenarios and ${made.length + corrupt.length} input images\n`);

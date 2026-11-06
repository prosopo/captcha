import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { breakVrl, dummyEnv, envVars, pinnedImage } from "./vector-test.mjs";

test("pinnedImage reads the first FROM, ignoring comments", () => {
	assert.equal(
		pinnedImage("# FROM nope\nFROM timberio/vector:0.55.0-debian\nRUN x\n"),
		"timberio/vector:0.55.0-debian",
	);
	assert.throws(() => pinnedImage("RUN x\n"), /no FROM/);
});

test("pinnedImage matches the shipped Dockerfile", () => {
	const dockerfile = readFileSync(
		new URL("../src/Dockerfile", import.meta.url),
		"utf8",
	);
	assert.match(pinnedImage(dockerfile), /^timberio\/vector:\d+\.\d+\.\d+/);
});

test("envVars collects interpolations and get_env_var reads once each", () => {
	const config = 'a = "${A:?err}"\nb = "${B}-${A}"\nx = get_env_var!("C")\n';
	assert.deepEqual(envVars(config), ["A", "B", "C"]);
});

test("dummyEnv gives every var a non-empty value", () => {
	assert.deepEqual(dummyEnv(["OO_HOST"]), { OO_HOST: "dummy_oo_host" });
});

test("breakVrl injects invalid VRL into provider_format only", () => {
	const config =
		"[transforms.other]\nsource = '''\n.a=1\n'''\n[transforms.provider_format]\nsource = '''\n.b=1\n'''\n";
	const broken = breakVrl(config);
	assert.ok(
		broken.includes(
			"[transforms.provider_format]\nsource = '''\nthis is not vrl(",
		),
	);
	assert.ok(broken.startsWith("[transforms.other]\nsource = '''\n.a=1\n"));
	assert.throws(() => breakVrl("nothing"), /not found/);
});

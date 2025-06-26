// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { ExtractResult } from "./extractSuri.js";

import { keyExtractSuri } from "./extractSuri.js";

describe("keyExtractSuri", (): void => {
	it("does not extract from invalid suri", (): void => {
		expect((): ExtractResult => keyExtractSuri("//2")).toThrow(
			"Unable to match provided value to a secret URI",
		);
	});

	it('derives on "hello world"', (): void => {
		const test = keyExtractSuri("hello world");

		expect(test.phrase).toEqual("hello world");
		expect(test.path.length).toEqual(0);
	});

	it('derives on "hello world/1', (): void => {
		const test = keyExtractSuri("hello world/1");

		expect(test.password).not.toBeDefined();
		expect(test.phrase).toEqual("hello world");
		expect(test.path.length).toEqual(1);

		if (!test.path[0]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[0].isHard).toEqual(false);
		expect(test.path[0].chainCode).toEqual(
			Uint8Array.from([
				1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);
	});

	it('derives on "hello world/DOT', (): void => {
		const test = keyExtractSuri("hello world/DOT");

		expect(test.password).not.toBeDefined();
		expect(test.phrase).toEqual("hello world");
		expect(test.path.length).toEqual(1);

		if (!test.path[0]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[0].isHard).toEqual(false);
		expect(test.path[0].chainCode).toEqual(
			Uint8Array.from([
				12, 68, 79, 84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);
	});

	it('derives on "hello world//1', (): void => {
		const test = keyExtractSuri("hello world//1");

		expect(test.password).not.toBeDefined();
		expect(test.phrase).toEqual("hello world");
		expect(test.path.length).toEqual(1);

		if (!test.path[0]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[0].isHard).toEqual(true);
		expect(test.path[0].chainCode).toEqual(
			Uint8Array.from([
				1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);
	});

	it('derives on "hello world//DOT', (): void => {
		const test = keyExtractSuri("hello world//DOT");

		expect(test.password).not.toBeDefined();
		expect(test.phrase).toEqual("hello world");
		expect(test.path.length).toEqual(1);

		if (!test.path[0]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[0].isHard).toEqual(true);
		expect(test.path[0].chainCode).toEqual(
			Uint8Array.from([
				12, 68, 79, 84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);
	});

	it('derives on "hello world//1/DOT', (): void => {
		const test = keyExtractSuri("hello world//1/DOT");

		expect(test.password).not.toBeDefined();
		expect(test.phrase).toEqual("hello world");
		expect(test.path.length).toEqual(2);

		if (!test.path[0]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[0].isHard).toEqual(true);
		expect(test.path[0].chainCode).toEqual(
			Uint8Array.from([
				1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);

		if (!test.path[1]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[1].isHard).toEqual(false);
		expect(test.path[1].chainCode).toEqual(
			Uint8Array.from([
				12, 68, 79, 84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);
	});

	it('derives on "hello world//DOT/1', (): void => {
		const test = keyExtractSuri("hello world//DOT/1");

		expect(test.password).not.toBeDefined();
		expect(test.phrase).toEqual("hello world");
		expect(test.path.length).toEqual(2);

		if (!test.path[0]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[0].isHard).toEqual(true);
		expect(test.path[0].chainCode).toEqual(
			Uint8Array.from([
				12, 68, 79, 84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);

		if (!test.path[1]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[1].isHard).toEqual(false);
		expect(test.path[1].chainCode).toEqual(
			Uint8Array.from([
				1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);
	});

	it('derives on "hello world///password"', (): void => {
		const test = keyExtractSuri("hello world///password");

		expect(test.password).toEqual("password");
		expect(test.phrase).toEqual("hello world");
		expect(test.path.length).toEqual(0);
	});

	it('derives on "hello world//1/DOT///password"', (): void => {
		const test = keyExtractSuri("hello world//1/DOT///password");

		expect(test.password).toEqual("password");
		expect(test.phrase).toEqual("hello world");
		expect(test.path.length).toEqual(2);

		if (!test.path[0]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[0].isHard).toEqual(true);
		expect(test.path[0].chainCode).toEqual(
			Uint8Array.from([
				1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);

		if (!test.path[1]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[1].isHard).toEqual(false);
		expect(test.path[1].chainCode).toEqual(
			Uint8Array.from([
				12, 68, 79, 84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);
	});

	it('derives on "hello world/1//DOT///password"', (): void => {
		const test = keyExtractSuri("hello world/1//DOT///password");

		expect(test.password).toEqual("password");
		expect(test.phrase).toEqual("hello world");
		expect(test.path.length).toEqual(2);

		if (!test.path[0]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[0].isHard).toEqual(false);
		expect(test.path[0].chainCode).toEqual(
			Uint8Array.from([
				1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);

		if (!test.path[1]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[1].isHard).toEqual(true);
		expect(test.path[1].chainCode).toEqual(
			Uint8Array.from([
				12, 68, 79, 84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);
	});

	it("derives on actual Alice", (): void => {
		const test = keyExtractSuri(
			"bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice",
		);

		expect(test.password).not.toBeDefined();
		expect(test.phrase).toEqual(
			"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
		);
		expect(test.path.length).toEqual(1);

		if (!test.path[0]) {
			throw new Error("Path junction is undefined");
		}

		expect(test.path[0].isHard).toEqual(true);
		expect(test.path[0].chainCode).toEqual(
			Uint8Array.from([
				20, 65, 108, 105, 99, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			]),
		);
	});
});

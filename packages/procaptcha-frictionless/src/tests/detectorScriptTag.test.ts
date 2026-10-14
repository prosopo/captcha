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

// @vitest-environment jsdom

import { DETECTOR_REGISTRY_KEY, DetectorLoadFailure } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DetectorType } from "../detectorLoader.js";
import {
	DetectorLoadError,
	DetectorLoaderFromUrl,
} from "../detectorScriptTag.js";

const URL_A =
	"https://pronode1.prosopo.io/v1/prosopo/provider/client/detector/script?detectorSessionId=det-a";

const detector = (() => undefined) as unknown as DetectorType;

type Registry = Map<string, (exports: { default: DetectorType }) => void>;

const registry = (): Registry | undefined =>
	(globalThis as unknown as Record<symbol, Registry | undefined>)[
		Symbol.for(DETECTOR_REGISTRY_KEY)
	];

const injected = (): HTMLScriptElement | null =>
	document.head.querySelector<HTMLScriptElement>("script[type=module]");

/** What a self-registering bundle does when it evaluates. */
const evaluateBundle = (url: string): void => {
	registry()?.get(url)?.({ default: detector });
	injected()?.dispatchEvent(new Event("load"));
};

const reasonOf = async (promise: Promise<unknown>): Promise<string> => {
	const err = await promise.then(
		() => undefined,
		(e: unknown) => e,
	);
	expect(err).toBeInstanceOf(DetectorLoadError);
	return (err as DetectorLoadError).reason;
};

describe("DetectorLoaderFromUrl", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		document.head.innerHTML = "";
		Reflect.deleteProperty(globalThis, "trustedTypes");
	});

	it("injects a CORS module script and resolves with what the bundle registers", async () => {
		const pending = DetectorLoaderFromUrl(URL_A);
		const script = injected();

		expect(script?.src).toBe(URL_A);
		expect(script?.crossOrigin).toBe("anonymous");

		evaluateBundle(URL_A);

		await expect(pending).resolves.toBe(detector);
		expect(injected()).toBeNull();
		expect(registry()?.has(URL_A)).toBe(false);
	});

	it("reports a bundle that loads without registering", async () => {
		const reason = reasonOf(DetectorLoaderFromUrl(URL_A));
		injected()?.dispatchEvent(new Event("load"));

		expect(await reason).toBe(DetectorLoadFailure.scriptNotRegistered);
	});

	it("reports a network failure", async () => {
		const reason = reasonOf(DetectorLoaderFromUrl(URL_A));
		injected()?.dispatchEvent(new Event("error"));
		await vi.runAllTimersAsync();

		expect(await reason).toBe(DetectorLoadFailure.scriptLoadError);
	});

	it("reports a CSP block even when the violation arrives after the error", async () => {
		const reason = reasonOf(DetectorLoaderFromUrl(URL_A));
		injected()?.dispatchEvent(new Event("error"));
		document.dispatchEvent(
			Object.assign(new Event("securitypolicyviolation"), {
				blockedURI: new URL(URL_A).origin,
			}),
		);
		await vi.runAllTimersAsync();

		expect(await reason).toBe(DetectorLoadFailure.scriptCspBlocked);
	});

	it("gives up when the script neither loads nor errors", async () => {
		const reason = reasonOf(DetectorLoaderFromUrl(URL_A, document, 1000));
		await vi.advanceTimersByTimeAsync(1000);

		expect(await reason).toBe(DetectorLoadFailure.scriptLoadError);
		expect(injected()).toBeNull();
	});

	it("carries a nonce the page already uses", async () => {
		const trusted = document.createElement("script");
		trusted.nonce = "page-nonce";
		document.head.appendChild(trusted);

		const pending = DetectorLoaderFromUrl(URL_A);

		expect(injected()?.nonce).toBe("page-nonce");
		evaluateBundle(URL_A);
		await pending;
	});

	it("assigns src through a Trusted Types policy when the page has them", async () => {
		const createScriptURL = vi.fn((url: string): string => url);
		const createPolicy = vi.fn(
			(
				_name: string,
				rules: { createScriptURL: (url: string) => string },
			): { createScriptURL: (url: string) => string } => ({
				createScriptURL: (url) => createScriptURL(rules.createScriptURL(url)),
			}),
		);
		Reflect.set(globalThis, "trustedTypes", { createPolicy });

		const pending = DetectorLoaderFromUrl(URL_A);
		evaluateBundle(URL_A);
		await pending;

		expect(createPolicy).toHaveBeenCalledWith(
			"prosopo-detector",
			expect.anything(),
		);
		expect(createScriptURL).toHaveBeenCalledWith(URL_A);
	});
});

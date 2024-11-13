/**
 * FingerprintJS v3.4.2 - Copyright (c) FingerprintJS, Inc, 2024 (https://fingerprint.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 *
 * This software contains code from open-source projects:
 * MurmurHash3 by Karan Lyons (https://github.com/karanlyons/murmurHash3.js)
 */
// @ts-nocheck
var version = "3.4.2";

function wait(durationMs, resolveWith) {
	return new Promise((resolve) => setTimeout(resolve, durationMs, resolveWith));
}
function requestIdleCallbackIfAvailable(
	fallbackTimeout,
	deadlineTimeout = Number.POSITIVE_INFINITY,
) {
	const { requestIdleCallback } = window;
	if (requestIdleCallback) {
		// The function `requestIdleCallback` loses the binding to `window` here.
		// `globalThis` isn't always equal `window` (see https://github.com/fingerprintjs/fingerprintjs/issues/683).
		// Therefore, an error can occur. `call(window,` prevents the error.
		return new Promise((resolve) =>
			requestIdleCallback.call(window, () => resolve(), {
				timeout: deadlineTimeout,
			}),
		);
	} else {
		return wait(Math.min(fallbackTimeout, deadlineTimeout));
	}
}
function isPromise(value) {
	return !!value && typeof value.then === "function";
}
/**
 * Calls a maybe asynchronous function without creating microtasks when the function is synchronous.
 * Catches errors in both cases.
 *
 * If just you run a code like this:
 * ```
 * console.time('Action duration')
 * await action()
 * console.timeEnd('Action duration')
 * ```
 * The synchronous function time can be measured incorrectly because another microtask may run before the `await`
 * returns the control back to the code.
 */
function awaitIfAsync(action, callback) {
	try {
		const returnedValue = action();
		if (isPromise(returnedValue)) {
			returnedValue.then(
				(result) => callback(true, result),
				(error) => callback(false, error),
			);
		} else {
			callback(true, returnedValue);
		}
	} catch (error) {
		callback(false, error);
	}
}
/**
 * If you run many synchronous tasks without using this function, the JS main loop will be busy and asynchronous tasks
 * (e.g. completing a network request, rendering the page) won't be able to happen.
 * This function allows running many synchronous tasks such way that asynchronous tasks can run too in background.
 */
async function mapWithBreaks(items, callback, loopReleaseInterval = 16) {
	const results = Array(items.length);
	let lastLoopReleaseTime = Date.now();
	for (let i = 0; i < items.length; ++i) {
		results[i] = callback(items[i], i);
		const now = Date.now();
		if (now >= lastLoopReleaseTime + loopReleaseInterval) {
			lastLoopReleaseTime = now;
			// Allows asynchronous actions and microtasks to happen
			await wait(0);
		}
	}
	return results;
}
/**
 * Makes the given promise never emit an unhandled promise rejection console warning.
 * The promise will still pass errors to the next promises.
 *
 * Otherwise, promise emits a console warning unless it has a `catch` listener.
 */
function suppressUnhandledRejectionWarning(promise) {
	promise.then(undefined, () => undefined);
}

/*
 * Taken from https://github.com/karanlyons/murmurHash3.js/blob/a33d0723127e2e5415056c455f8aed2451ace208/murmurHash3.js
 */
//
// Given two 64bit ints (as an array of two 32bit ints) returns the two
// added together as a 64bit int (as an array of two 32bit ints).
//
function x64Add(m, n) {
	m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff];
	n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff];
	const o = [0, 0, 0, 0];
	o[3] += m[3] + n[3];
	o[2] += o[3] >>> 16;
	o[3] &= 0xffff;
	o[2] += m[2] + n[2];
	o[1] += o[2] >>> 16;
	o[2] &= 0xffff;
	o[1] += m[1] + n[1];
	o[0] += o[1] >>> 16;
	o[1] &= 0xffff;
	o[0] += m[0] + n[0];
	o[0] &= 0xffff;
	return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]];
}
//
// Given two 64bit ints (as an array of two 32bit ints) returns the two
// multiplied together as a 64bit int (as an array of two 32bit ints).
//
function x64Multiply(m, n) {
	m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff];
	n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff];
	const o = [0, 0, 0, 0];
	o[3] += m[3] * n[3];
	o[2] += o[3] >>> 16;
	o[3] &= 0xffff;
	o[2] += m[2] * n[3];
	o[1] += o[2] >>> 16;
	o[2] &= 0xffff;
	o[2] += m[3] * n[2];
	o[1] += o[2] >>> 16;
	o[2] &= 0xffff;
	o[1] += m[1] * n[3];
	o[0] += o[1] >>> 16;
	o[1] &= 0xffff;
	o[1] += m[2] * n[2];
	o[0] += o[1] >>> 16;
	o[1] &= 0xffff;
	o[1] += m[3] * n[1];
	o[0] += o[1] >>> 16;
	o[1] &= 0xffff;
	o[0] += m[0] * n[3] + m[1] * n[2] + m[2] * n[1] + m[3] * n[0];
	o[0] &= 0xffff;
	return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]];
}
//
// Given a 64bit int (as an array of two 32bit ints) and an int
// representing a number of bit positions, returns the 64bit int (as an
// array of two 32bit ints) rotated left by that number of positions.
//
function x64Rotl(m, n) {
	n %= 64;
	if (n === 32) {
		return [m[1], m[0]];
	} else if (n < 32) {
		return [
			(m[0] << n) | (m[1] >>> (32 - n)),
			(m[1] << n) | (m[0] >>> (32 - n)),
		];
	} else {
		n -= 32;
		return [
			(m[1] << n) | (m[0] >>> (32 - n)),
			(m[0] << n) | (m[1] >>> (32 - n)),
		];
	}
}
//
// Given a 64bit int (as an array of two 32bit ints) and an int
// representing a number of bit positions, returns the 64bit int (as an
// array of two 32bit ints) shifted left by that number of positions.
//
function x64LeftShift(m, n) {
	n %= 64;
	if (n === 0) {
		return m;
	} else if (n < 32) {
		return [(m[0] << n) | (m[1] >>> (32 - n)), m[1] << n];
	} else {
		return [m[1] << (n - 32), 0];
	}
}
//
// Given two 64bit ints (as an array of two 32bit ints) returns the two
// xored together as a 64bit int (as an array of two 32bit ints).
//
function x64Xor(m, n) {
	return [m[0] ^ n[0], m[1] ^ n[1]];
}
//
// Given a block, returns murmurHash3's final x64 mix of that block.
// (`[0, h[0] >>> 1]` is a 33 bit unsigned right shift. This is the
// only place where we need to right shift 64bit ints.)
//
function x64Fmix(h) {
	h = x64Xor(h, [0, h[0] >>> 1]);
	h = x64Multiply(h, [0xff51afd7, 0xed558ccd]);
	h = x64Xor(h, [0, h[0] >>> 1]);
	h = x64Multiply(h, [0xc4ceb9fe, 0x1a85ec53]);
	h = x64Xor(h, [0, h[0] >>> 1]);
	return h;
}
//
// Given a string and an optional seed as an int, returns a 128 bit
// hash using the x64 flavor of MurmurHash3, as an unsigned hex.
//
function x64hash128(key, seed) {
	key = key || "";
	seed = seed || 0;
	const remainder = key.length % 16;
	const bytes = key.length - remainder;
	let h1 = [0, seed];
	let h2 = [0, seed];
	let k1 = [0, 0];
	let k2 = [0, 0];
	const c1 = [0x87c37b91, 0x114253d5];
	const c2 = [0x4cf5ad43, 0x2745937f];
	let i;
	for (i = 0; i < bytes; i = i + 16) {
		k1 = [
			(key.charCodeAt(i + 4) & 0xff) |
				((key.charCodeAt(i + 5) & 0xff) << 8) |
				((key.charCodeAt(i + 6) & 0xff) << 16) |
				((key.charCodeAt(i + 7) & 0xff) << 24),
			(key.charCodeAt(i) & 0xff) |
				((key.charCodeAt(i + 1) & 0xff) << 8) |
				((key.charCodeAt(i + 2) & 0xff) << 16) |
				((key.charCodeAt(i + 3) & 0xff) << 24),
		];
		k2 = [
			(key.charCodeAt(i + 12) & 0xff) |
				((key.charCodeAt(i + 13) & 0xff) << 8) |
				((key.charCodeAt(i + 14) & 0xff) << 16) |
				((key.charCodeAt(i + 15) & 0xff) << 24),
			(key.charCodeAt(i + 8) & 0xff) |
				((key.charCodeAt(i + 9) & 0xff) << 8) |
				((key.charCodeAt(i + 10) & 0xff) << 16) |
				((key.charCodeAt(i + 11) & 0xff) << 24),
		];
		k1 = x64Multiply(k1, c1);
		k1 = x64Rotl(k1, 31);
		k1 = x64Multiply(k1, c2);
		h1 = x64Xor(h1, k1);
		h1 = x64Rotl(h1, 27);
		h1 = x64Add(h1, h2);
		h1 = x64Add(x64Multiply(h1, [0, 5]), [0, 0x52dce729]);
		k2 = x64Multiply(k2, c2);
		k2 = x64Rotl(k2, 33);
		k2 = x64Multiply(k2, c1);
		h2 = x64Xor(h2, k2);
		h2 = x64Rotl(h2, 31);
		h2 = x64Add(h2, h1);
		h2 = x64Add(x64Multiply(h2, [0, 5]), [0, 0x38495ab5]);
	}
	k1 = [0, 0];
	k2 = [0, 0];
	switch (remainder) {
		case 15:
			k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 14)], 48));
		// fallthrough
		case 14:
			k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 13)], 40));
		// fallthrough
		case 13:
			k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 12)], 32));
		// fallthrough
		case 12:
			k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 11)], 24));
		// fallthrough
		case 11:
			k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 10)], 16));
		// fallthrough
		case 10:
			k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 9)], 8));
		// fallthrough
		case 9:
			k2 = x64Xor(k2, [0, key.charCodeAt(i + 8)]);
			k2 = x64Multiply(k2, c2);
			k2 = x64Rotl(k2, 33);
			k2 = x64Multiply(k2, c1);
			h2 = x64Xor(h2, k2);
		// fallthrough
		case 8:
			k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 7)], 56));
		// fallthrough
		case 7:
			k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 6)], 48));
		// fallthrough
		case 6:
			k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 5)], 40));
		// fallthrough
		case 5:
			k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 4)], 32));
		// fallthrough
		case 4:
			k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 3)], 24));
		// fallthrough
		case 3:
			k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 2)], 16));
		// fallthrough
		case 2:
			k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 1)], 8));
		// fallthrough
		case 1:
			k1 = x64Xor(k1, [0, key.charCodeAt(i)]);
			k1 = x64Multiply(k1, c1);
			k1 = x64Rotl(k1, 31);
			k1 = x64Multiply(k1, c2);
			h1 = x64Xor(h1, k1);
		// fallthrough
	}
	h1 = x64Xor(h1, [0, key.length]);
	h2 = x64Xor(h2, [0, key.length]);
	h1 = x64Add(h1, h2);
	h2 = x64Add(h2, h1);
	h1 = x64Fmix(h1);
	h2 = x64Fmix(h2);
	h1 = x64Add(h1, h2);
	h2 = x64Add(h2, h1);
	return (
		("00000000" + (h1[0] >>> 0).toString(16)).slice(-8) +
		("00000000" + (h1[1] >>> 0).toString(16)).slice(-8) +
		("00000000" + (h2[0] >>> 0).toString(16)).slice(-8) +
		("00000000" + (h2[1] >>> 0).toString(16)).slice(-8)
	);
}

/**
 * Converts an error object to a plain object that can be used with `JSON.stringify`.
 * If you just run `JSON.stringify(error)`, you'll get `'{}'`.
 */
function errorToObject(error) {
	return {
		name: error.name,
		message: error.message,
		stack: error.stack?.split("\n"),
		// The fields are not enumerable, so TS is wrong saying that they will be overridden
		...error,
	};
}

/*
 * This file contains functions to work with pure data only (no browser features, DOM, side effects, etc).
 */
/**
 * Does the same as Array.prototype.includes but has better typing
 */
function includes(haystack, needle) {
	for (let i = 0, l = haystack.length; i < l; ++i) {
		if (haystack[i] === needle) {
			return true;
		}
	}
	return false;
}
/**
 * Like `!includes()` but with proper typing
 */
function excludes(haystack, needle) {
	return !includes(haystack, needle);
}
/**
 * Be careful, NaN can return
 */
function toInt(value) {
	return Number.parseInt(value);
}
/**
 * Be careful, NaN can return
 */
function toFloat(value) {
	return Number.parseFloat(value);
}
function replaceNaN(value, replacement) {
	return typeof value === "number" && isNaN(value) ? replacement : value;
}
function countTruthy(values) {
	return values.reduce((sum, value) => sum + (value ? 1 : 0), 0);
}
function round(value, base = 1) {
	if (Math.abs(base) >= 1) {
		return Math.round(value / base) * base;
	} else {
		// Sometimes when a number is multiplied by a small number, precision is lost,
		// for example 1234 * 0.0001 === 0.12340000000000001, and it's more precise divide: 1234 / (1 / 0.0001) === 0.1234.
		const counterBase = 1 / base;
		return Math.round(value * counterBase) / counterBase;
	}
}
/**
 * Parses a CSS selector into tag name with HTML attributes.
 * Only single element selector are supported (without operators like space, +, >, etc).
 *
 * Multiple values can be returned for each attribute. You decide how to handle them.
 */
function parseSimpleCssSelector(selector) {
	const errorMessage = `Unexpected syntax '${selector}'`;
	const tagMatch = /^\s*([a-z-]*)(.*)$/i.exec(selector);
	const tag = tagMatch[1] || undefined;
	const attributes = {};
	const partsRegex = /([.:#][\w-]+|\[.+?\])/gi;
	const addAttribute = (name, value) => {
		attributes[name] = attributes[name] || [];
		attributes[name].push(value);
	};
	for (;;) {
		const match = partsRegex.exec(tagMatch[2]);
		if (!match) {
			break;
		}
		const part = match[0];
		switch (part[0]) {
			case ".":
				addAttribute("class", part.slice(1));
				break;
			case "#":
				addAttribute("id", part.slice(1));
				break;
			case "[": {
				const attributeMatch =
					/^\[([\w-]+)([~|^$*]?=("(.*?)"|([\w-]+)))?(\s+[is])?\]$/.exec(part);
				if (attributeMatch) {
					addAttribute(
						attributeMatch[1],
						attributeMatch[4] ?? attributeMatch[5] ?? "",
					);
				} else {
					throw new Error(errorMessage);
				}
				break;
			}
			default:
				throw new Error(errorMessage);
		}
	}
	return [tag, attributes];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ensureErrorWithMessage(error) {
	return error && typeof error === "object" && "message" in error
		? error
		: { message: error };
}
function isFinalResultLoaded(loadResult) {
	return typeof loadResult !== "function";
}
/**
 * Loads the given entropy source. Returns a function that gets an entropy component from the source.
 *
 * The result is returned synchronously to prevent `loadSources` from
 * waiting for one source to load before getting the components from the other sources.
 */
function loadSource(source, sourceOptions) {
	const sourceLoadPromise = new Promise((resolveLoad) => {
		const loadStartTime = Date.now();
		// `awaitIfAsync` is used instead of just `await` in order to measure the duration of synchronous sources
		// correctly (other microtasks won't affect the duration).
		awaitIfAsync(source.bind(null, sourceOptions), (...loadArgs) => {
			const loadDuration = Date.now() - loadStartTime;
			// Source loading failed
			if (!loadArgs[0]) {
				return resolveLoad(() => ({
					error: ensureErrorWithMessage(loadArgs[1]),
					duration: loadDuration,
				}));
			}
			const loadResult = loadArgs[1];
			// Source loaded with the final result
			if (isFinalResultLoaded(loadResult)) {
				return resolveLoad(() => ({
					value: loadResult,
					duration: loadDuration,
				}));
			}
			// Source loaded with "get" stage
			resolveLoad(
				() =>
					new Promise((resolveGet) => {
						const getStartTime = Date.now();
						awaitIfAsync(loadResult, (...getArgs) => {
							const duration = loadDuration + Date.now() - getStartTime;
							// Source getting failed
							if (!getArgs[0]) {
								return resolveGet({
									error: ensureErrorWithMessage(getArgs[1]),
									duration,
								});
							}
							// Source getting succeeded
							resolveGet({ value: getArgs[1], duration });
						});
					}),
			);
		});
	});
	suppressUnhandledRejectionWarning(sourceLoadPromise);
	return function getComponent() {
		return sourceLoadPromise.then((finalizeSource) => finalizeSource());
	};
}
/**
 * Loads the given entropy sources. Returns a function that collects the entropy components.
 *
 * The result is returned synchronously in order to allow start getting the components
 * before the sources are loaded completely.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
function loadSources(sources, sourceOptions, excludeSources) {
	const includedSources = Object.keys(sources).filter((sourceKey) =>
		excludes(excludeSources, sourceKey),
	);
	// Using `mapWithBreaks` allows asynchronous sources to complete between synchronous sources
	// and measure the duration correctly
	const sourceGettersPromise = mapWithBreaks(includedSources, (sourceKey) =>
		loadSource(sources[sourceKey], sourceOptions),
	);
	suppressUnhandledRejectionWarning(sourceGettersPromise);
	return async function getComponents() {
		const sourceGetters = await sourceGettersPromise;
		const componentPromises = await mapWithBreaks(
			sourceGetters,
			(sourceGetter) => {
				const componentPromise = sourceGetter();
				suppressUnhandledRejectionWarning(componentPromise);
				return componentPromise;
			},
		);
		const componentArray = await Promise.all(componentPromises);
		// Keeping the component keys order the same as the source keys order
		const components = {};
		for (let index = 0; index < includedSources.length; ++index) {
			components[includedSources[index]] = componentArray[index];
		}
		return components;
	};
}
/**
 * Modifies an entropy source by transforming its returned value with the given function.
 * Keeps the source properties: sync/async, 1/2 stages.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
function transformSource(source, transformValue) {
	const transformLoadResult = (loadResult) => {
		if (isFinalResultLoaded(loadResult)) {
			return transformValue(loadResult);
		}
		return () => {
			const getResult = loadResult();
			if (isPromise(getResult)) {
				return getResult.then(transformValue);
			}
			return transformValue(getResult);
		};
	};
	return (options) => {
		const loadResult = source(options);
		if (isPromise(loadResult)) {
			return loadResult.then(transformLoadResult);
		}
		return transformLoadResult(loadResult);
	};
}

/*
 * Functions to help with features that vary through browsers
 */
/**
 * Checks whether the browser is based on Trident (the Internet Explorer engine) without using user-agent.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
function isTrident() {
	const w = window;
	const n = navigator;
	// The properties are checked to be in IE 10, IE 11 and not to be in other browsers in October 2020
	return (
		countTruthy([
			"MSCSSMatrix" in w,
			"msSetImmediate" in w,
			"msIndexedDB" in w,
			"msMaxTouchPoints" in n,
			"msPointerEnabled" in n,
		]) >= 4
	);
}
/**
 * Checks whether the browser is based on EdgeHTML (the pre-Chromium Edge engine) without using user-agent.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
function isEdgeHTML() {
	// Based on research in October 2020
	const w = window;
	const n = navigator;
	return (
		countTruthy([
			"msWriteProfilerMark" in w,
			"MSStream" in w,
			"msLaunchUri" in n,
			"msSaveBlob" in n,
		]) >= 3 && !isTrident()
	);
}
/**
 * Checks whether the browser is based on Chromium without using user-agent.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
function isChromium() {
	// Based on research in October 2020. Tested to detect Chromium 42-86.
	const w = window;
	const n = navigator;
	return (
		countTruthy([
			"webkitPersistentStorage" in n,
			"webkitTemporaryStorage" in n,
			n.vendor.indexOf("Google") === 0,
			"webkitResolveLocalFileSystemURL" in w,
			"BatteryManager" in w,
			"webkitMediaStream" in w,
			"webkitSpeechGrammar" in w,
		]) >= 5
	);
}
/**
 * Checks whether the browser is based on mobile or desktop Safari without using user-agent.
 * All iOS browsers use WebKit (the Safari engine).
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
function isWebKit() {
	// Based on research in September 2020
	const w = window;
	const n = navigator;
	return (
		countTruthy([
			"ApplePayError" in w,
			"CSSPrimitiveValue" in w,
			"Counter" in w,
			n.vendor.indexOf("Apple") === 0,
			"getStorageUpdates" in n,
			"WebKitMediaKeys" in w,
		]) >= 4
	);
}
/**
 * Checks whether the WebKit browser is a desktop Safari.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
function isDesktopSafari() {
	const w = window;
	return (
		countTruthy([
			"safari" in w,
			!("DeviceMotionEvent" in w),
			!("ongestureend" in w),
			!("standalone" in navigator),
		]) >= 3
	);
}
/**
 * Checks whether the browser is based on Gecko (Firefox engine) without using user-agent.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
function isGecko() {
	const w = window;
	// Based on research in September 2020
	return (
		countTruthy([
			"buildID" in navigator,
			"MozAppearance" in (document.documentElement?.style ?? {}),
			"onmozfullscreenchange" in w,
			"mozInnerScreenX" in w,
			"CSSMozDocumentRule" in w,
			"CanvasCaptureMediaStream" in w,
		]) >= 4
	);
}
/**
 * Checks whether the browser is based on Chromium version ≥86 without using user-agent.
 * It doesn't check that the browser is based on Chromium, there is a separate function for this.
 */
function isChromium86OrNewer() {
	// Checked in Chrome 85 vs Chrome 86 both on desktop and Android
	const w = window;
	return (
		countTruthy([
			!("MediaSettingsRange" in w),
			"RTCEncodedAudioFrame" in w,
			"" + w.Intl === "[object Intl]",
			"" + w.Reflect === "[object Reflect]",
		]) >= 3
	);
}
/**
 * Checks whether the browser is based on WebKit version ≥606 (Safari ≥12) without using user-agent.
 * It doesn't check that the browser is based on WebKit, there is a separate function for this.
 *
 * @link https://en.wikipedia.org/wiki/Safari_version_history#Release_history Safari-WebKit versions map
 */
function isWebKit606OrNewer() {
	// Checked in Safari 9–14
	const w = window;
	return (
		countTruthy([
			"DOMRectList" in w,
			"RTCPeerConnectionIceEvent" in w,
			"SVGGeometryElement" in w,
			"ontransitioncancel" in w,
		]) >= 3
	);
}
/**
 * Checks whether the device is an iPad.
 * It doesn't check that the engine is WebKit and that the WebKit isn't desktop.
 */
function isIPad() {
	// Checked on:
	// Safari on iPadOS (both mobile and desktop modes): 8, 11, 12, 13, 14
	// Chrome on iPadOS (both mobile and desktop modes): 11, 12, 13, 14
	// Safari on iOS (both mobile and desktop modes): 9, 10, 11, 12, 13, 14
	// Chrome on iOS (both mobile and desktop modes): 9, 10, 11, 12, 13, 14
	// Before iOS 13. Safari tampers the value in "request desktop site" mode since iOS 13.
	if (navigator.platform === "iPad") {
		return true;
	}
	const s = screen;
	const screenRatio = s.width / s.height;
	return (
		countTruthy([
			"MediaSource" in window,
			!!Element.prototype.webkitRequestFullscreen,
			// iPhone 4S that runs iOS 9 matches this. But it won't match the criteria above, so it won't be detected as iPad.
			screenRatio > 0.65 && screenRatio < 1.53,
		]) >= 2
	);
}
/**
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
function getFullscreenElement() {
	const d = document;
	return (
		d.fullscreenElement ||
		d.msFullscreenElement ||
		d.mozFullScreenElement ||
		d.webkitFullscreenElement ||
		null
	);
}
function exitFullscreen() {
	const d = document;
	// `call` is required because the function throws an error without a proper "this" context
	return (
		d.exitFullscreen ||
		d.msExitFullscreen ||
		d.mozCancelFullScreen ||
		d.webkitExitFullscreen
	).call(d);
}
/**
 * Checks whether the device runs on Android without using user-agent.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
function isAndroid() {
	const isItChromium = isChromium();
	const isItGecko = isGecko();
	// Only 2 browser engines are presented on Android.
	// Actually, there is also Android 4.1 browser, but it's not worth detecting it at the moment.
	if (!isItChromium && !isItGecko) {
		return false;
	}
	const w = window;
	// Chrome removes all words "Android" from `navigator` when desktop version is requested
	// Firefox keeps "Android" in `navigator.appVersion` when desktop version is requested
	return (
		countTruthy([
			"onorientationchange" in w,
			"orientation" in w,
			isItChromium && !("SharedWorker" in w),
			isItGecko && /android/i.test(navigator.appVersion),
		]) >= 2
	);
}

/**
 * A deep description: https://fingerprint.com/blog/audio-fingerprinting/
 * Inspired by and based on https://github.com/cozylife/audio-fingerprint
 */
function getAudioFingerprint() {
	const w = window;
	const AudioContext = w.OfflineAudioContext || w.webkitOfflineAudioContext;
	if (!AudioContext) {
		return -2 /* SpecialFingerprint.NotSupported */;
	}
	// In some browsers, audio context always stays suspended unless the context is started in response to a user action
	// (e.g. a click or a tap). It prevents audio fingerprint from being taken at an arbitrary moment of time.
	// Such browsers are old and unpopular, so the audio fingerprinting is just skipped in them.
	// See a similar case explanation at https://stackoverflow.com/questions/46363048/onaudioprocess-not-called-on-ios11#46534088
	if (doesCurrentBrowserSuspendAudioContext()) {
		return -1 /* SpecialFingerprint.KnownToSuspend */;
	}
	const hashFromIndex = 4500;
	const hashToIndex = 5000;
	const context = new AudioContext(1, hashToIndex, 44100);
	const oscillator = context.createOscillator();
	oscillator.type = "triangle";
	oscillator.frequency.value = 10000;
	const compressor = context.createDynamicsCompressor();
	compressor.threshold.value = -50;
	compressor.knee.value = 40;
	compressor.ratio.value = 12;
	compressor.attack.value = 0;
	compressor.release.value = 0.25;
	oscillator.connect(compressor);
	compressor.connect(context.destination);
	oscillator.start(0);
	const [renderPromise, finishRendering] = startRenderingAudio(context);
	const fingerprintPromise = renderPromise.then(
		(buffer) => getHash(buffer.getChannelData(0).subarray(hashFromIndex)),
		(error) => {
			if (
				error.name === "timeout" /* InnerErrorName.Timeout */ ||
				error.name === "suspended" /* InnerErrorName.Suspended */
			) {
				return -3 /* SpecialFingerprint.Timeout */;
			}
			throw error;
		},
	);
	// Suppresses the console error message in case when the fingerprint fails before requested
	suppressUnhandledRejectionWarning(fingerprintPromise);
	return () => {
		finishRendering();
		return fingerprintPromise;
	};
}
/**
 * Checks if the current browser is known to always suspend audio context
 */
function doesCurrentBrowserSuspendAudioContext() {
	return isWebKit() && !isDesktopSafari() && !isWebKit606OrNewer();
}
/**
 * Starts rendering the audio context.
 * When the returned function is called, the render process starts finishing.
 */
function startRenderingAudio(context) {
	const renderTryMaxCount = 3;
	const renderRetryDelay = 500;
	const runningMaxAwaitTime = 500;
	const runningSufficientTime = 5000;
	let finalize = () => undefined;
	const resultPromise = new Promise((resolve, reject) => {
		let isFinalized = false;
		let renderTryCount = 0;
		let startedRunningAt = 0;
		context.oncomplete = (event) => resolve(event.renderedBuffer);
		const startRunningTimeout = () => {
			setTimeout(
				() => reject(makeInnerError("timeout" /* InnerErrorName.Timeout */)),
				Math.min(
					runningMaxAwaitTime,
					startedRunningAt + runningSufficientTime - Date.now(),
				),
			);
		};
		const tryRender = () => {
			try {
				const renderingPromise = context.startRendering();
				// `context.startRendering` has two APIs: Promise and callback, we check that it's really a promise just in case
				if (isPromise(renderingPromise)) {
					// Suppresses all unhadled rejections in case of scheduled redundant retries after successful rendering
					suppressUnhandledRejectionWarning(renderingPromise);
				}
				switch (context.state) {
					case "running":
						startedRunningAt = Date.now();
						if (isFinalized) {
							startRunningTimeout();
						}
						break;
					// Sometimes the audio context doesn't start after calling `startRendering` (in addition to the cases where
					// audio context doesn't start at all). A known case is starting an audio context when the browser tab is in
					// background on iPhone. Retries usually help in this case.
					case "suspended":
						// The audio context can reject starting until the tab is in foreground. Long fingerprint duration
						// in background isn't a problem, therefore the retry attempts don't count in background. It can lead to
						// a situation when a fingerprint takes very long time and finishes successfully. FYI, the audio context
						// can be suspended when `document.hidden === false` and start running after a retry.
						if (!document.hidden) {
							renderTryCount++;
						}
						if (isFinalized && renderTryCount >= renderTryMaxCount) {
							reject(
								makeInnerError("suspended" /* InnerErrorName.Suspended */),
							);
						} else {
							setTimeout(tryRender, renderRetryDelay);
						}
						break;
				}
			} catch (error) {
				reject(error);
			}
		};
		tryRender();
		finalize = () => {
			if (!isFinalized) {
				isFinalized = true;
				if (startedRunningAt > 0) {
					startRunningTimeout();
				}
			}
		};
	});
	return [resultPromise, finalize];
}
function getHash(signal) {
	let hash = 0;
	for (let i = 0; i < signal.length; ++i) {
		hash += Math.abs(signal[i]);
	}
	return hash;
}
function makeInnerError(name) {
	const error = new Error(name);
	error.name = name;
	return error;
}

/**
 * Creates and keeps an invisible iframe while the given function runs.
 * The given function is called when the iframe is loaded and has a body.
 * The iframe allows to measure DOM sizes inside itself.
 *
 * Notice: passing an initial HTML code doesn't work in IE.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
async function withIframe(action, initialHtml, domPollInterval = 50) {
	const d = document;
	// document.body can be null while the page is loading
	while (!d.body) {
		await wait(domPollInterval);
	}
	const iframe = d.createElement("iframe");
	try {
		await new Promise((_resolve, _reject) => {
			let isComplete = false;
			const resolve = () => {
				isComplete = true;
				_resolve();
			};
			const reject = (error) => {
				isComplete = true;
				_reject(error);
			};
			iframe.onload = resolve;
			iframe.onerror = reject;
			const { style } = iframe;
			style.setProperty("display", "block", "important"); // Required for browsers to calculate the layout
			style.position = "absolute";
			style.top = "0";
			style.left = "0";
			style.visibility = "hidden";
			if (initialHtml && "srcdoc" in iframe) {
				iframe.srcdoc = initialHtml;
			} else {
				iframe.src = "about:blank";
			}
			d.body.appendChild(iframe);
			// WebKit in WeChat doesn't fire the iframe's `onload` for some reason.
			// This code checks for the loading state manually.
			// See https://github.com/fingerprintjs/fingerprintjs/issues/645
			const checkReadyState = () => {
				// The ready state may never become 'complete' in Firefox despite the 'load' event being fired.
				// So an infinite setTimeout loop can happen without this check.
				// See https://github.com/fingerprintjs/fingerprintjs/pull/716#issuecomment-986898796
				if (isComplete) {
					return;
				}
				// Make sure iframe.contentWindow and iframe.contentWindow.document are both loaded
				// The contentWindow.document can miss in JSDOM (https://github.com/jsdom/jsdom).
				if (iframe.contentWindow?.document?.readyState === "complete") {
					resolve();
				} else {
					setTimeout(checkReadyState, 10);
				}
			};
			checkReadyState();
		});
		while (!iframe.contentWindow?.document?.body) {
			await wait(domPollInterval);
		}
		return await action(iframe, iframe.contentWindow);
	} finally {
		iframe.parentNode?.removeChild(iframe);
	}
}
/**
 * Creates a DOM element that matches the given selector.
 * Only single element selector are supported (without operators like space, +, >, etc).
 */
function selectorToElement(selector) {
	const [tag, attributes] = parseSimpleCssSelector(selector);
	const element = document.createElement(tag ?? "div");
	for (const name of Object.keys(attributes)) {
		const value = attributes[name].join(" ");
		// Changing the `style` attribute can cause a CSP error, therefore we change the `style.cssText` property.
		// https://github.com/fingerprintjs/fingerprintjs/issues/733
		if (name === "style") {
			addStyleString(element.style, value);
		} else {
			element.setAttribute(name, value);
		}
	}
	return element;
}
/**
 * Adds CSS styles from a string in such a way that doesn't trigger a CSP warning (unsafe-inline or unsafe-eval)
 */
function addStyleString(style, source) {
	// We don't use `style.cssText` because browsers must block it when no `unsafe-eval` CSP is presented: https://csplite.com/csp145/#w3c_note
	// Even though the browsers ignore this standard, we don't use `cssText` just in case.
	for (const property of source.split(";")) {
		const match = /^\s*([\w-]+)\s*:\s*(.+?)(\s*!([\w-]+))?\s*$/.exec(property);
		if (match) {
			const [, name, value, , priority] = match;
			style.setProperty(name, value, priority || ""); // The last argument can't be undefined in IE11
		}
	}
}

// We use m or w because these two characters take up the maximum width.
// And we use a LLi so that the same matching fonts can get separated.
const testString = "mmMwWLliI0O&1";
// We test using 48px font size, we may use any size. I guess larger the better.
const textSize = "48px";
// A font will be compared against all the three default fonts.
// And if for any default fonts it doesn't match, then that font is available.
const baseFonts = ["monospace", "sans-serif", "serif"];
const fontList = [
	// This is android-specific font from "Roboto" family
	"sans-serif-thin",
	"ARNO PRO",
	"Agency FB",
	"Arabic Typesetting",
	"Arial Unicode MS",
	"AvantGarde Bk BT",
	"BankGothic Md BT",
	"Batang",
	"Bitstream Vera Sans Mono",
	"Calibri",
	"Century",
	"Century Gothic",
	"Clarendon",
	"EUROSTILE",
	"Franklin Gothic",
	"Futura Bk BT",
	"Futura Md BT",
	"GOTHAM",
	"Gill Sans",
	"HELV",
	"Haettenschweiler",
	"Helvetica Neue",
	"Humanst521 BT",
	"Leelawadee",
	"Letter Gothic",
	"Levenim MT",
	"Lucida Bright",
	"Lucida Sans",
	"Menlo",
	"MS Mincho",
	"MS Outlook",
	"MS Reference Specialty",
	"MS UI Gothic",
	"MT Extra",
	"MYRIAD PRO",
	"Marlett",
	"Meiryo UI",
	"Microsoft Uighur",
	"Minion Pro",
	"Monotype Corsiva",
	"PMingLiU",
	"Pristina",
	"SCRIPTINA",
	"Segoe UI Light",
	"Serifa",
	"SimHei",
	"Small Fonts",
	"Staccato222 BT",
	"TRAJAN PRO",
	"Univers CE 55 Medium",
	"Vrinda",
	"ZWAdobeF",
];
// kudos to http://www.lalit.org/lab/javascript-css-font-detect/
function getFonts() {
	// Running the script in an iframe makes it not affect the page look and not be affected by the page CSS. See:
	// https://github.com/fingerprintjs/fingerprintjs/issues/592
	// https://github.com/fingerprintjs/fingerprintjs/issues/628
	return withIframe((_, { document }) => {
		const holder = document.body;
		holder.style.fontSize = textSize;
		// div to load spans for the default fonts and the fonts to detect
		const spansContainer = document.createElement("div");
		const defaultWidth = {};
		const defaultHeight = {};
		// creates a span where the fonts will be loaded
		const createSpan = (fontFamily) => {
			const span = document.createElement("span");
			const { style } = span;
			style.position = "absolute";
			style.top = "0";
			style.left = "0";
			style.fontFamily = fontFamily;
			span.textContent = testString;
			spansContainer.appendChild(span);
			return span;
		};
		// creates a span and load the font to detect and a base font for fallback
		const createSpanWithFonts = (fontToDetect, baseFont) => {
			return createSpan(`'${fontToDetect}',${baseFont}`);
		};
		// creates spans for the base fonts and adds them to baseFontsDiv
		const initializeBaseFontsSpans = () => {
			return baseFonts.map(createSpan);
		};
		// creates spans for the fonts to detect and adds them to fontsDiv
		const initializeFontsSpans = () => {
			// Stores {fontName : [spans for that font]}
			const spans = {};
			for (const font of fontList) {
				spans[font] = baseFonts.map((baseFont) =>
					createSpanWithFonts(font, baseFont),
				);
			}
			return spans;
		};
		// checks if a font is available
		const isFontAvailable = (fontSpans) => {
			return baseFonts.some(
				(baseFont, baseFontIndex) =>
					fontSpans[baseFontIndex].offsetWidth !== defaultWidth[baseFont] ||
					fontSpans[baseFontIndex].offsetHeight !== defaultHeight[baseFont],
			);
		};
		// create spans for base fonts
		const baseFontsSpans = initializeBaseFontsSpans();
		// create spans for fonts to detect
		const fontsSpans = initializeFontsSpans();
		// add all the spans to the DOM
		holder.appendChild(spansContainer);
		// get the default width for the three base fonts
		for (let index = 0; index < baseFonts.length; index++) {
			defaultWidth[baseFonts[index]] = baseFontsSpans[index].offsetWidth; // width for the default font
			defaultHeight[baseFonts[index]] = baseFontsSpans[index].offsetHeight; // height for the default font
		}
		// check available fonts
		return fontList.filter((font) => isFontAvailable(fontsSpans[font]));
	});
}

function getPlugins() {
	const rawPlugins = navigator.plugins;
	if (!rawPlugins) {
		return undefined;
	}
	const plugins = [];
	// Safari 10 doesn't support iterating navigator.plugins with for...of
	for (let i = 0; i < rawPlugins.length; ++i) {
		const plugin = rawPlugins[i];
		if (!plugin) {
			continue;
		}
		const mimeTypes = [];
		for (let j = 0; j < plugin.length; ++j) {
			const mimeType = plugin[j];
			mimeTypes.push({
				type: mimeType.type,
				suffixes: mimeType.suffixes,
			});
		}
		plugins.push({
			name: plugin.name,
			description: plugin.description,
			mimeTypes,
		});
	}
	return plugins;
}

// https://www.browserleaks.com/canvas#how-does-it-work
function getCanvasFingerprint() {
	let winding = false;
	let geometry;
	let text;
	const [canvas, context] = makeCanvasContext();
	if (!isSupported(canvas, context)) {
		geometry = text = ""; // The value will be 'unsupported' in v3.4
	} else {
		winding = doesSupportWinding(context);
		renderTextImage(canvas, context);
		const textImage1 = canvasToString(canvas);
		const textImage2 = canvasToString(canvas); // It's slightly faster to double-encode the text image
		// Some browsers add a noise to the canvas: https://github.com/fingerprintjs/fingerprintjs/issues/791
		// The canvas is excluded from the fingerprint in this case
		if (textImage1 !== textImage2) {
			geometry = text = "unstable";
		} else {
			text = textImage1;
			// Text is unstable:
			// https://github.com/fingerprintjs/fingerprintjs/issues/583
			// https://github.com/fingerprintjs/fingerprintjs/issues/103
			// Therefore it's extracted into a separate image.
			renderGeometryImage(canvas, context);
			geometry = canvasToString(canvas);
		}
	}
	return { winding, geometry, text };
}
function makeCanvasContext() {
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	return [canvas, canvas.getContext("2d")];
}
function isSupported(canvas, context) {
	return !!(context && canvas.toDataURL);
}
function doesSupportWinding(context) {
	// https://web.archive.org/web/20170825024655/http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
	// https://github.com/Modernizr/Modernizr/blob/master/feature-detects/canvas/winding.js
	context.rect(0, 0, 10, 10);
	context.rect(2, 2, 6, 6);
	return !context.isPointInPath(5, 5, "evenodd");
}
function renderTextImage(canvas, context) {
	// Resizing the canvas cleans it
	canvas.width = 240;
	canvas.height = 60;
	context.textBaseline = "alphabetic";
	context.fillStyle = "#f60";
	context.fillRect(100, 1, 62, 20);
	context.fillStyle = "#069";
	// It's important to use explicit built-in fonts in order to exclude the affect of font preferences
	// (there is a separate entropy source for them).
	context.font = '11pt "Times New Roman"';
	// The choice of emojis has a gigantic impact on rendering performance (especially in FF).
	// Some newer emojis cause it to slow down 50-200 times.
	// There must be no text to the right of the emoji, see https://github.com/fingerprintjs/fingerprintjs/issues/574
	// A bare emoji shouldn't be used because the canvas will change depending on the script encoding:
	// https://github.com/fingerprintjs/fingerprintjs/issues/66
	// Escape sequence shouldn't be used too because Terser will turn it into a bare unicode.
	const printedText = `Cwm fjordbank gly ${String.fromCharCode(55357, 56835) /* 😃 */}`;
	context.fillText(printedText, 2, 15);
	context.fillStyle = "rgba(102, 204, 0, 0.2)";
	context.font = "18pt Arial";
	context.fillText(printedText, 4, 45);
}
function renderGeometryImage(canvas, context) {
	// Resizing the canvas cleans it
	canvas.width = 122;
	canvas.height = 110;
	// Canvas blending
	// https://web.archive.org/web/20170826194121/http://blogs.adobe.com/webplatform/2013/01/28/blending-features-in-canvas/
	// http://jsfiddle.net/NDYV8/16/
	context.globalCompositeOperation = "multiply";
	for (const [color, x, y] of [
		["#f2f", 40, 40],
		["#2ff", 80, 40],
		["#ff2", 60, 80],
	]) {
		context.fillStyle = color;
		context.beginPath();
		context.arc(x, y, 40, 0, Math.PI * 2, true);
		context.closePath();
		context.fill();
	}
	// Canvas winding
	// https://web.archive.org/web/20130913061632/http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
	// http://jsfiddle.net/NDYV8/19/
	context.fillStyle = "#f9c";
	context.arc(60, 60, 60, 0, Math.PI * 2, true);
	context.arc(60, 60, 20, 0, Math.PI * 2, true);
	context.fill("evenodd");
}
function canvasToString(canvas) {
	return canvas.toDataURL();
}

/**
 * This is a crude and primitive touch screen detection. It's not possible to currently reliably detect the availability
 * of a touch screen with a JS, without actually subscribing to a touch event.
 *
 * @see http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
 * @see https://github.com/Modernizr/Modernizr/issues/548
 */
function getTouchSupport() {
	const n = navigator;
	let maxTouchPoints = 0;
	let touchEvent;
	if (n.maxTouchPoints !== undefined) {
		maxTouchPoints = toInt(n.maxTouchPoints);
	} else if (n.msMaxTouchPoints !== undefined) {
		maxTouchPoints = n.msMaxTouchPoints;
	}
	try {
		document.createEvent("TouchEvent");
		touchEvent = true;
	} catch {
		touchEvent = false;
	}
	const touchStart = "ontouchstart" in window;
	return {
		maxTouchPoints,
		touchEvent,
		touchStart,
	};
}

function getOsCpu() {
	return navigator.oscpu;
}

function getLanguages() {
	const n = navigator;
	const result = [];
	const language =
		n.language || n.userLanguage || n.browserLanguage || n.systemLanguage;
	if (language !== undefined) {
		result.push([language]);
	}
	if (Array.isArray(n.languages)) {
		// Starting from Chromium 86, there is only a single value in `navigator.language` in Incognito mode:
		// the value of `navigator.language`. Therefore the value is ignored in this browser.
		if (!(isChromium() && isChromium86OrNewer())) {
			result.push(n.languages);
		}
	} else if (typeof n.languages === "string") {
		const languages = n.languages;
		if (languages) {
			result.push(languages.split(","));
		}
	}
	return result;
}

function getColorDepth() {
	return window.screen.colorDepth;
}

function getDeviceMemory() {
	// `navigator.deviceMemory` is a string containing a number in some unidentified cases
	return replaceNaN(toFloat(navigator.deviceMemory), undefined);
}

function getScreenResolution() {
	const s = screen;
	// Some browsers return screen resolution as strings, e.g. "1200", instead of a number, e.g. 1200.
	// I suspect it's done by certain plugins that randomize browser properties to prevent fingerprinting.
	// Some browsers even return  screen resolution as not numbers.
	const parseDimension = (value) => replaceNaN(toInt(value), null);
	const dimensions = [parseDimension(s.width), parseDimension(s.height)];
	dimensions.sort().reverse();
	return dimensions;
}

const screenFrameCheckInterval = 2500;
const roundingPrecision = 10;
// The type is readonly to protect from unwanted mutations
let screenFrameBackup;
let screenFrameSizeTimeoutId;
/**
 * Starts watching the screen frame size. When a non-zero size appears, the size is saved and the watch is stopped.
 * Later, when `getScreenFrame` runs, it will return the saved non-zero size if the current size is null.
 *
 * This trick is required to mitigate the fact that the screen frame turns null in some cases.
 * See more on this at https://github.com/fingerprintjs/fingerprintjs/issues/568
 */
function watchScreenFrame() {
	if (screenFrameSizeTimeoutId !== undefined) {
		return;
	}
	const checkScreenFrame = () => {
		const frameSize = getCurrentScreenFrame();
		if (isFrameSizeNull(frameSize)) {
			screenFrameSizeTimeoutId = setTimeout(
				checkScreenFrame,
				screenFrameCheckInterval,
			);
		} else {
			screenFrameBackup = frameSize;
			screenFrameSizeTimeoutId = undefined;
		}
	};
	checkScreenFrame();
}
function getScreenFrame() {
	watchScreenFrame();
	return async () => {
		let frameSize = getCurrentScreenFrame();
		if (isFrameSizeNull(frameSize)) {
			if (screenFrameBackup) {
				return [...screenFrameBackup];
			}
			if (getFullscreenElement()) {
				// Some browsers set the screen frame to zero when programmatic fullscreen is on.
				// There is a chance of getting a non-zero frame after exiting the fullscreen.
				// See more on this at https://github.com/fingerprintjs/fingerprintjs/issues/568
				await exitFullscreen();
				frameSize = getCurrentScreenFrame();
			}
		}
		if (!isFrameSizeNull(frameSize)) {
			screenFrameBackup = frameSize;
		}
		return frameSize;
	};
}
/**
 * Sometimes the available screen resolution changes a bit, e.g. 1900x1440 → 1900x1439. A possible reason: macOS Dock
 * shrinks to fit more icons when there is too little space. The rounding is used to mitigate the difference.
 */
function getRoundedScreenFrame() {
	const screenFrameGetter = getScreenFrame();
	return async () => {
		const frameSize = await screenFrameGetter();
		const processSize = (sideSize) =>
			sideSize === null ? null : round(sideSize, roundingPrecision);
		// It might look like I don't know about `for` and `map`.
		// In fact, such code is used to avoid TypeScript issues without using `as`.
		return [
			processSize(frameSize[0]),
			processSize(frameSize[1]),
			processSize(frameSize[2]),
			processSize(frameSize[3]),
		];
	};
}
function getCurrentScreenFrame() {
	const s = screen;
	// Some browsers return screen resolution as strings, e.g. "1200", instead of a number, e.g. 1200.
	// I suspect it's done by certain plugins that randomize browser properties to prevent fingerprinting.
	//
	// Some browsers (IE, Edge ≤18) don't provide `screen.availLeft` and `screen.availTop`. The property values are
	// replaced with 0 in such cases to not lose the entropy from `screen.availWidth` and `screen.availHeight`.
	return [
		replaceNaN(toFloat(s.availTop), null),
		replaceNaN(
			toFloat(s.width) -
				toFloat(s.availWidth) -
				replaceNaN(toFloat(s.availLeft), 0),
			null,
		),
		replaceNaN(
			toFloat(s.height) -
				toFloat(s.availHeight) -
				replaceNaN(toFloat(s.availTop), 0),
			null,
		),
		replaceNaN(toFloat(s.availLeft), null),
	];
}
function isFrameSizeNull(frameSize) {
	for (let i = 0; i < 4; ++i) {
		if (frameSize[i]) {
			return false;
		}
	}
	return true;
}

function getHardwareConcurrency() {
	// sometimes hardware concurrency is a string
	return replaceNaN(toInt(navigator.hardwareConcurrency), undefined);
}

function getTimezone() {
	const DateTimeFormat = window.Intl?.DateTimeFormat;
	if (DateTimeFormat) {
		const timezone = new DateTimeFormat().resolvedOptions().timeZone;
		if (timezone) {
			return timezone;
		}
	}
	// For browsers that don't support timezone names
	// The minus is intentional because the JS offset is opposite to the real offset
	const offset = -getTimezoneOffset();
	return `UTC${offset >= 0 ? "+" : ""}${Math.abs(offset)}`;
}
function getTimezoneOffset() {
	const currentYear = new Date().getFullYear();
	// The timezone offset may change over time due to daylight saving time (DST) shifts.
	// The non-DST timezone offset is used as the result timezone offset.
	// Since the DST season differs in the northern and the southern hemispheres,
	// both January and July timezones offsets are considered.
	return Math.max(
		// `getTimezoneOffset` returns a number as a string in some unidentified cases
		toFloat(new Date(currentYear, 0, 1).getTimezoneOffset()),
		toFloat(new Date(currentYear, 6, 1).getTimezoneOffset()),
	);
}

function getSessionStorage() {
	try {
		return !!window.sessionStorage;
	} catch (error) {
		/* SecurityError when referencing it means it exists */
		return true;
	}
}

// https://bugzilla.mozilla.org/show_bug.cgi?id=781447
function getLocalStorage() {
	try {
		return !!window.localStorage;
	} catch (e) {
		/* SecurityError when referencing it means it exists */
		return true;
	}
}

function getIndexedDB() {
	// IE and Edge don't allow accessing indexedDB in private mode, therefore IE and Edge will have different
	// visitor identifier in normal and private modes.
	if (isTrident() || isEdgeHTML()) {
		return undefined;
	}
	try {
		return !!window.indexedDB;
	} catch (e) {
		/* SecurityError when referencing it means it exists */
		return true;
	}
}

function getOpenDatabase() {
	return !!window.openDatabase;
}

function getCpuClass() {
	return navigator.cpuClass;
}

function getPlatform() {
	// Android Chrome 86 and 87 and Android Firefox 80 and 84 don't mock the platform value when desktop mode is requested
	const { platform } = navigator;
	// iOS mocks the platform value when desktop version is requested: https://github.com/fingerprintjs/fingerprintjs/issues/514
	// iPad uses desktop mode by default since iOS 13
	// The value is 'MacIntel' on M1 Macs
	// The value is 'iPhone' on iPod Touch
	if (platform === "MacIntel") {
		if (isWebKit() && !isDesktopSafari()) {
			return isIPad() ? "iPad" : "iPhone";
		}
	}
	return platform;
}

function getVendor() {
	return navigator.vendor || "";
}

/**
 * Checks for browser-specific (not engine specific) global variables to tell browsers with the same engine apart.
 * Only somewhat popular browsers are considered.
 */
function getVendorFlavors() {
	const flavors = [];
	for (const key of [
		// Blink and some browsers on iOS
		"chrome",
		// Safari on macOS
		"safari",
		// Chrome on iOS (checked in 85 on 13 and 87 on 14)
		"__crWeb",
		"__gCrWeb",
		// Yandex Browser on iOS, macOS and Android (checked in 21.2 on iOS 14, macOS and Android)
		"yandex",
		// Yandex Browser on iOS (checked in 21.2 on 14)
		"__yb",
		"__ybro",
		// Firefox on iOS (checked in 32 on 14)
		"__firefox__",
		// Edge on iOS (checked in 46 on 14)
		"__edgeTrackingPreventionStatistics",
		"webkit",
		// Opera Touch on iOS (checked in 2.6 on 14)
		"oprt",
		// Samsung Internet on Android (checked in 11.1)
		"samsungAr",
		// UC Browser on Android (checked in 12.10 and 13.0)
		"ucweb",
		"UCShellJava",
		// Puffin on Android (checked in 9.0)
		"puffinDevice",
		// UC on iOS and Opera on Android have no specific global variables
		// Edge for Android isn't checked
	]) {
		const value = window[key];
		if (value && typeof value === "object") {
			flavors.push(key);
		}
	}
	return flavors.sort();
}

/**
 * navigator.cookieEnabled cannot detect custom or nuanced cookie blocking configurations. For example, when blocking
 * cookies via the Advanced Privacy Settings in IE9, it always returns true. And there have been issues in the past with
 * site-specific exceptions. Don't rely on it.
 *
 * @see https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cookies.js Taken from here
 */
function areCookiesEnabled() {
	const d = document;
	// Taken from here: https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cookies.js
	// navigator.cookieEnabled cannot detect custom or nuanced cookie blocking configurations. For example, when blocking
	// cookies via the Advanced Privacy Settings in IE9, it always returns true. And there have been issues in the past
	// with site-specific exceptions. Don't rely on it.
	// try..catch because some in situations `document.cookie` is exposed but throws a
	// SecurityError if you try to access it; e.g. documents created from data URIs
	// or in sandboxed iframes (depending on flags/context)
	try {
		// Create cookie
		d.cookie = "cookietest=1; SameSite=Strict;";
		const result = d.cookie.indexOf("cookietest=") !== -1;
		// Delete cookie
		d.cookie =
			"cookietest=1; SameSite=Strict; expires=Thu, 01-Jan-1970 00:00:01 GMT";
		return result;
	} catch (e) {
		return false;
	}
}

/**
 * Only single element selector are supported (no operators like space, +, >, etc).
 * `embed` and `position: fixed;` will be considered as blocked anyway because it always has no offsetParent.
 * Avoid `iframe` and anything with `[src=]` because they produce excess HTTP requests.
 *
 * The "inappropriate" selectors are obfuscated. See https://github.com/fingerprintjs/fingerprintjs/issues/734.
 * A function is used instead of a plain object to help tree-shaking.
 *
 * The function code is generated automatically. See docs/content_blockers.md to learn how to make the list.
 */
function getFilters() {
	const fromB64 = atob; // Just for better minification
	return {
		abpIndo: [
			"#Iklan-Melayang",
			"#Kolom-Iklan-728",
			"#SidebarIklan-wrapper",
			'[title="ALIENBOLA" i]',
			fromB64("I0JveC1CYW5uZXItYWRz"),
		],
		abpvn: [
			".quangcao",
			"#mobileCatfish",
			fromB64("LmNsb3NlLWFkcw=="),
			'[id^="bn_bottom_fixed_"]',
			"#pmadv",
		],
		adBlockFinland: [
			".mainostila",
			fromB64("LnNwb25zb3JpdA=="),
			".ylamainos",
			fromB64("YVtocmVmKj0iL2NsaWNrdGhyZ2guYXNwPyJd"),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9hcHAucmVhZHBlYWsuY29tL2FkcyJd"),
		],
		adBlockPersian: [
			"#navbar_notice_50",
			".kadr",
			'TABLE[width="140px"]',
			"#divAgahi",
			fromB64("YVtocmVmXj0iaHR0cDovL2cxLnYuZndtcm0ubmV0L2FkLyJd"),
		],
		adBlockWarningRemoval: [
			"#adblock-honeypot",
			".adblocker-root",
			".wp_adblock_detect",
			fromB64("LmhlYWRlci1ibG9ja2VkLWFk"),
			fromB64("I2FkX2Jsb2NrZXI="),
		],
		adGuardAnnoyances: [
			".hs-sosyal",
			"#cookieconsentdiv",
			'div[class^="app_gdpr"]',
			".as-oil",
			'[data-cypress="soft-push-notification-modal"]',
		],
		adGuardBase: [
			".BetterJsPopOverlay",
			fromB64("I2FkXzMwMFgyNTA="),
			fromB64("I2Jhbm5lcmZsb2F0MjI="),
			fromB64("I2NhbXBhaWduLWJhbm5lcg=="),
			fromB64("I0FkLUNvbnRlbnQ="),
		],
		adGuardChinese: [
			fromB64("LlppX2FkX2FfSA=="),
			fromB64("YVtocmVmKj0iLmh0aGJldDM0LmNvbSJd"),
			"#widget-quan",
			fromB64("YVtocmVmKj0iLzg0OTkyMDIwLnh5eiJd"),
			fromB64("YVtocmVmKj0iLjE5NTZobC5jb20vIl0="),
		],
		adGuardFrench: [
			"#pavePub",
			fromB64("LmFkLWRlc2t0b3AtcmVjdGFuZ2xl"),
			".mobile_adhesion",
			".widgetadv",
			fromB64("LmFkc19iYW4="),
		],
		adGuardGerman: ['aside[data-portal-id="leaderboard"]'],
		adGuardJapanese: [
			"#kauli_yad_1",
			fromB64("YVtocmVmXj0iaHR0cDovL2FkMi50cmFmZmljZ2F0ZS5uZXQvIl0="),
			fromB64("Ll9wb3BJbl9pbmZpbml0ZV9hZA=="),
			fromB64("LmFkZ29vZ2xl"),
			fromB64("Ll9faXNib29zdFJldHVybkFk"),
		],
		adGuardMobile: [
			fromB64("YW1wLWF1dG8tYWRz"),
			fromB64("LmFtcF9hZA=="),
			'amp-embed[type="24smi"]',
			"#mgid_iframe1",
			fromB64("I2FkX2ludmlld19hcmVh"),
		],
		adGuardRussian: [
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9hZC5sZXRtZWFkcy5jb20vIl0="),
			fromB64("LnJlY2xhbWE="),
			'div[id^="smi2adblock"]',
			fromB64("ZGl2W2lkXj0iQWRGb3hfYmFubmVyXyJd"),
			"#psyduckpockeball",
		],
		adGuardSocial: [
			fromB64("YVtocmVmXj0iLy93d3cuc3R1bWJsZXVwb24uY29tL3N1Ym1pdD91cmw9Il0="),
			fromB64("YVtocmVmXj0iLy90ZWxlZ3JhbS5tZS9zaGFyZS91cmw/Il0="),
			".etsy-tweet",
			"#inlineShare",
			".popup-social",
		],
		adGuardSpanishPortuguese: [
			"#barraPublicidade",
			"#Publicidade",
			"#publiEspecial",
			"#queTooltip",
			".cnt-publi",
		],
		adGuardTrackingProtection: [
			"#qoo-counter",
			fromB64("YVtocmVmXj0iaHR0cDovL2NsaWNrLmhvdGxvZy5ydS8iXQ=="),
			fromB64("YVtocmVmXj0iaHR0cDovL2hpdGNvdW50ZXIucnUvdG9wL3N0YXQucGhwIl0="),
			fromB64("YVtocmVmXj0iaHR0cDovL3RvcC5tYWlsLnJ1L2p1bXAiXQ=="),
			"#top100counter",
		],
		adGuardTurkish: [
			"#backkapat",
			fromB64("I3Jla2xhbWk="),
			fromB64("YVtocmVmXj0iaHR0cDovL2Fkc2Vydi5vbnRlay5jb20udHIvIl0="),
			fromB64("YVtocmVmXj0iaHR0cDovL2l6bGVuemkuY29tL2NhbXBhaWduLyJd"),
			fromB64("YVtocmVmXj0iaHR0cDovL3d3dy5pbnN0YWxsYWRzLm5ldC8iXQ=="),
		],
		bulgarian: [
			fromB64("dGQjZnJlZW5ldF90YWJsZV9hZHM="),
			"#ea_intext_div",
			".lapni-pop-over",
			"#xenium_hot_offers",
		],
		easyList: [
			".yb-floorad",
			fromB64("LndpZGdldF9wb19hZHNfd2lkZ2V0"),
			fromB64("LnRyYWZmaWNqdW5reS1hZA=="),
			".textad_headline",
			fromB64("LnNwb25zb3JlZC10ZXh0LWxpbmtz"),
		],
		easyListChina: [
			fromB64("LmFwcGd1aWRlLXdyYXBbb25jbGljayo9ImJjZWJvcy5jb20iXQ=="),
			fromB64("LmZyb250cGFnZUFkdk0="),
			"#taotaole",
			"#aafoot.top_box",
			".cfa_popup",
		],
		easyListCookie: [
			".ezmob-footer",
			".cc-CookieWarning",
			"[data-cookie-number]",
			fromB64("LmF3LWNvb2tpZS1iYW5uZXI="),
			".sygnal24-gdpr-modal-wrap",
		],
		easyListCzechSlovak: [
			"#onlajny-stickers",
			fromB64("I3Jla2xhbW5pLWJveA=="),
			fromB64("LnJla2xhbWEtbWVnYWJvYXJk"),
			".sklik",
			fromB64("W2lkXj0ic2tsaWtSZWtsYW1hIl0="),
		],
		easyListDutch: [
			fromB64("I2FkdmVydGVudGll"),
			fromB64("I3ZpcEFkbWFya3RCYW5uZXJCbG9jaw=="),
			".adstekst",
			fromB64("YVtocmVmXj0iaHR0cHM6Ly94bHR1YmUubmwvY2xpY2svIl0="),
			"#semilo-lrectangle",
		],
		easyListGermany: [
			"#SSpotIMPopSlider",
			fromB64("LnNwb25zb3JsaW5rZ3J1ZW4="),
			fromB64("I3dlcmJ1bmdza3k="),
			fromB64("I3Jla2xhbWUtcmVjaHRzLW1pdHRl"),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9iZDc0Mi5jb20vIl0="),
		],
		easyListItaly: [
			fromB64("LmJveF9hZHZfYW5udW5jaQ=="),
			".sb-box-pubbliredazionale",
			fromB64("YVtocmVmXj0iaHR0cDovL2FmZmlsaWF6aW9uaWFkcy5zbmFpLml0LyJd"),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9hZHNlcnZlci5odG1sLml0LyJd"),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9hZmZpbGlhemlvbmlhZHMuc25haS5pdC8iXQ=="),
		],
		easyListLithuania: [
			fromB64("LnJla2xhbW9zX3RhcnBhcw=="),
			fromB64("LnJla2xhbW9zX251b3JvZG9z"),
			fromB64("aW1nW2FsdD0iUmVrbGFtaW5pcyBza3lkZWxpcyJd"),
			fromB64("aW1nW2FsdD0iRGVkaWt1b3RpLmx0IHNlcnZlcmlhaSJd"),
			fromB64("aW1nW2FsdD0iSG9zdGluZ2FzIFNlcnZlcmlhaS5sdCJd"),
		],
		estonian: [fromB64("QVtocmVmKj0iaHR0cDovL3BheTRyZXN1bHRzMjQuZXUiXQ==")],
		fanboyAnnoyances: [
			"#ac-lre-player",
			".navigate-to-top",
			"#subscribe_popup",
			".newsletter_holder",
			"#back-top",
		],
		fanboyAntiFacebook: [".util-bar-module-firefly-visible"],
		fanboyEnhancedTrackers: [
			".open.pushModal",
			"#issuem-leaky-paywall-articles-zero-remaining-nag",
			"#sovrn_container",
			'div[class$="-hide"][zoompage-fontsize][style="display: block;"]',
			".BlockNag__Card",
		],
		fanboySocial: [
			"#FollowUs",
			"#meteored_share",
			"#social_follow",
			".article-sharer",
			".community__social-desc",
		],
		frellwitSwedish: [
			fromB64("YVtocmVmKj0iY2FzaW5vcHJvLnNlIl1bdGFyZ2V0PSJfYmxhbmsiXQ=="),
			fromB64("YVtocmVmKj0iZG9rdG9yLXNlLm9uZWxpbmsubWUiXQ=="),
			"article.category-samarbete",
			fromB64("ZGl2LmhvbGlkQWRz"),
			"ul.adsmodern",
		],
		greekAdBlock: [
			fromB64("QVtocmVmKj0iYWRtYW4ub3RlbmV0LmdyL2NsaWNrPyJd"),
			fromB64("QVtocmVmKj0iaHR0cDovL2F4aWFiYW5uZXJzLmV4b2R1cy5nci8iXQ=="),
			fromB64(
				"QVtocmVmKj0iaHR0cDovL2ludGVyYWN0aXZlLmZvcnRobmV0LmdyL2NsaWNrPyJd",
			),
			"DIV.agores300",
			"TABLE.advright",
		],
		hungarian: [
			"#cemp_doboz",
			".optimonk-iframe-container",
			fromB64("LmFkX19tYWlu"),
			fromB64("W2NsYXNzKj0iR29vZ2xlQWRzIl0="),
			"#hirdetesek_box",
		],
		iDontCareAboutCookies: [
			'.alert-info[data-block-track*="CookieNotice"]',
			".ModuleTemplateCookieIndicator",
			".o--cookies--container",
			"#cookies-policy-sticky",
			"#stickyCookieBar",
		],
		icelandicAbp: [
			fromB64(
				"QVtocmVmXj0iL2ZyYW1ld29yay9yZXNvdXJjZXMvZm9ybXMvYWRzLmFzcHgiXQ==",
			),
		],
		latvian: [
			fromB64(
				"YVtocmVmPSJodHRwOi8vd3d3LnNhbGlkemluaS5sdi8iXVtzdHlsZT0iZGlzcGxheTogYmxvY2s7IHdpZHRoOiAxMjBweDsgaGVpZ2h0O" +
					"iA0MHB4OyBvdmVyZmxvdzogaGlkZGVuOyBwb3NpdGlvbjogcmVsYXRpdmU7Il0=",
			),
			fromB64(
				"YVtocmVmPSJodHRwOi8vd3d3LnNhbGlkemluaS5sdi8iXVtzdHlsZT0iZGlzcGxheTogYmxvY2s7IHdpZHRoOiA4OHB4OyBoZWlnaHQ6I" +
					"DMxcHg7IG92ZXJmbG93OiBoaWRkZW47IHBvc2l0aW9uOiByZWxhdGl2ZTsiXQ==",
			),
		],
		listKr: [
			fromB64("YVtocmVmKj0iLy9hZC5wbGFuYnBsdXMuY28ua3IvIl0="),
			fromB64("I2xpdmVyZUFkV3JhcHBlcg=="),
			fromB64("YVtocmVmKj0iLy9hZHYuaW1hZHJlcC5jby5rci8iXQ=="),
			fromB64("aW5zLmZhc3R2aWV3LWFk"),
			".revenue_unit_item.dable",
		],
		listeAr: [
			fromB64("LmdlbWluaUxCMUFk"),
			".right-and-left-sponsers",
			fromB64("YVtocmVmKj0iLmFmbGFtLmluZm8iXQ=="),
			fromB64("YVtocmVmKj0iYm9vcmFxLm9yZyJd"),
			fromB64("YVtocmVmKj0iZHViaXp6bGUuY29tL2FyLz91dG1fc291cmNlPSJd"),
		],
		listeFr: [
			fromB64("YVtocmVmXj0iaHR0cDovL3Byb21vLnZhZG9yLmNvbS8iXQ=="),
			fromB64("I2FkY29udGFpbmVyX3JlY2hlcmNoZQ=="),
			fromB64("YVtocmVmKj0id2Vib3JhbWEuZnIvZmNnaS1iaW4vIl0="),
			".site-pub-interstitiel",
			'div[id^="crt-"][data-criteo-id]',
		],
		officialPolish: [
			"#ceneo-placeholder-ceneo-12",
			fromB64("W2hyZWZePSJodHRwczovL2FmZi5zZW5kaHViLnBsLyJd"),
			fromB64(
				"YVtocmVmXj0iaHR0cDovL2Fkdm1hbmFnZXIudGVjaGZ1bi5wbC9yZWRpcmVjdC8iXQ==",
			),
			fromB64("YVtocmVmXj0iaHR0cDovL3d3dy50cml6ZXIucGwvP3V0bV9zb3VyY2UiXQ=="),
			fromB64("ZGl2I3NrYXBpZWNfYWQ="),
		],
		ro: [
			fromB64("YVtocmVmXj0iLy9hZmZ0cmsuYWx0ZXgucm8vQ291bnRlci9DbGljayJd"),
			fromB64(
				"YVtocmVmXj0iaHR0cHM6Ly9ibGFja2ZyaWRheXNhbGVzLnJvL3Ryay9zaG9wLyJd",
			),
			fromB64(
				"YVtocmVmXj0iaHR0cHM6Ly9ldmVudC4ycGVyZm9ybWFudC5jb20vZXZlbnRzL2NsaWNrIl0=",
			),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9sLnByb2ZpdHNoYXJlLnJvLyJd"),
			'a[href^="/url/"]',
		],
		ruAd: [
			fromB64("YVtocmVmKj0iLy9mZWJyYXJlLnJ1LyJd"),
			fromB64("YVtocmVmKj0iLy91dGltZy5ydS8iXQ=="),
			fromB64("YVtocmVmKj0iOi8vY2hpa2lkaWtpLnJ1Il0="),
			"#pgeldiz",
			".yandex-rtb-block",
		],
		thaiAds: [
			"a[href*=macau-uta-popup]",
			fromB64("I2Fkcy1nb29nbGUtbWlkZGxlX3JlY3RhbmdsZS1ncm91cA=="),
			fromB64("LmFkczMwMHM="),
			".bumq",
			".img-kosana",
		],
		webAnnoyancesUltralist: [
			"#mod-social-share-2",
			"#social-tools",
			fromB64("LmN0cGwtZnVsbGJhbm5lcg=="),
			".zergnet-recommend",
			".yt.btn-link.btn-md.btn",
		],
	};
}
/**
 * The order of the returned array means nothing (it's always sorted alphabetically).
 *
 * Notice that the source is slightly unstable.
 * Safari provides a 2-taps way to disable all content blockers on a page temporarily.
 * Also content blockers can be disabled permanently for a domain, but it requires 4 taps.
 * So empty array shouldn't be treated as "no blockers", it should be treated as "no signal".
 * If you are a website owner, don't make your visitors want to disable content blockers.
 */
async function getDomBlockers({ debug } = {}) {
	if (!isApplicable()) {
		return undefined;
	}
	const filters = getFilters();
	const filterNames = Object.keys(filters);
	const allSelectors = [].concat(
		...filterNames.map((filterName) => filters[filterName]),
	);
	const blockedSelectors = await getBlockedSelectors(allSelectors);
	if (debug) {
		printDebug(filters, blockedSelectors);
	}
	const activeBlockers = filterNames.filter((filterName) => {
		const selectors = filters[filterName];
		const blockedCount = countTruthy(
			selectors.map((selector) => blockedSelectors[selector]),
		);
		return blockedCount > selectors.length * 0.6;
	});
	activeBlockers.sort();
	return activeBlockers;
}
function isApplicable() {
	// Safari (desktop and mobile) and all Android browsers keep content blockers in both regular and private mode
	return isWebKit() || isAndroid();
}
async function getBlockedSelectors(selectors) {
	const d = document;
	const root = d.createElement("div");
	const elements = new Array(selectors.length);
	const blockedSelectors = {}; // Set() isn't used just in case somebody need older browser support
	forceShow(root);
	// First create all elements that can be blocked. If the DOM steps below are done in a single cycle,
	// browser will alternate tree modification and layout reading, that is very slow.
	for (let i = 0; i < selectors.length; ++i) {
		const element = selectorToElement(selectors[i]);
		if (element.tagName === "DIALOG") {
			element.show();
		}
		const holder = d.createElement("div"); // Protects from unwanted effects of `+` and `~` selectors of filters
		forceShow(holder);
		holder.appendChild(element);
		root.appendChild(holder);
		elements[i] = element;
	}
	// document.body can be null while the page is loading
	while (!d.body) {
		await wait(50);
	}
	d.body.appendChild(root);
	try {
		// Then check which of the elements are blocked
		for (let i = 0; i < selectors.length; ++i) {
			if (!elements[i].offsetParent) {
				blockedSelectors[selectors[i]] = true;
			}
		}
	} finally {
		// Then remove the elements
		root.parentNode?.removeChild(root);
	}
	return blockedSelectors;
}
function forceShow(element) {
	element.style.setProperty("display", "block", "important");
}
function printDebug(filters, blockedSelectors) {
	let message = "DOM blockers debug:\n```";
	for (const filterName of Object.keys(filters)) {
		message += `\n${filterName}:`;
		for (const selector of filters[filterName]) {
			message += `\n  ${blockedSelectors[selector] ? "🚫" : "➡"} ${selector}`;
		}
	}
	// console.log is ok here because it's under a debug clause
	// eslint-disable-next-line no-console
	console.log(`${message}\n\`\`\``);
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/color-gamut
 */
function getColorGamut() {
	// rec2020 includes p3 and p3 includes srgb
	for (const gamut of ["rec2020", "p3", "srgb"]) {
		if (matchMedia(`(color-gamut: ${gamut})`).matches) {
			return gamut;
		}
	}
	return undefined;
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/inverted-colors
 */
function areColorsInverted() {
	if (doesMatch$4("inverted")) {
		return true;
	}
	if (doesMatch$4("none")) {
		return false;
	}
	return undefined;
}
function doesMatch$4(value) {
	return matchMedia(`(inverted-colors: ${value})`).matches;
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
 */
function areColorsForced() {
	if (doesMatch$3("active")) {
		return true;
	}
	if (doesMatch$3("none")) {
		return false;
	}
	return undefined;
}
function doesMatch$3(value) {
	return matchMedia(`(forced-colors: ${value})`).matches;
}

const maxValueToCheck = 100;
/**
 * If the display is monochrome (e.g. black&white), the value will be ≥0 and will mean the number of bits per pixel.
 * If the display is not monochrome, the returned value will be 0.
 * If the browser doesn't support this feature, the returned value will be undefined.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/monochrome
 */
function getMonochromeDepth() {
	if (!matchMedia("(min-monochrome: 0)").matches) {
		// The media feature isn't supported by the browser
		return undefined;
	}
	// A variation of binary search algorithm can be used here.
	// But since expected values are very small (≤10), there is no sense in adding the complexity.
	for (let i = 0; i <= maxValueToCheck; ++i) {
		if (matchMedia(`(max-monochrome: ${i})`).matches) {
			return i;
		}
	}
	throw new Error("Too high value");
}

/**
 * @see https://www.w3.org/TR/mediaqueries-5/#prefers-contrast
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast
 */
function getContrastPreference() {
	if (doesMatch$2("no-preference")) {
		return 0 /* ContrastPreference.None */;
	}
	// The sources contradict on the keywords. Probably 'high' and 'low' will never be implemented.
	// Need to check it when all browsers implement the feature.
	if (doesMatch$2("high") || doesMatch$2("more")) {
		return 1 /* ContrastPreference.More */;
	}
	if (doesMatch$2("low") || doesMatch$2("less")) {
		return -1 /* ContrastPreference.Less */;
	}
	if (doesMatch$2("forced")) {
		return 10 /* ContrastPreference.ForcedColors */;
	}
	return undefined;
}
function doesMatch$2(value) {
	return matchMedia(`(prefers-contrast: ${value})`).matches;
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
 */
function isMotionReduced() {
	if (doesMatch$1("reduce")) {
		return true;
	}
	if (doesMatch$1("no-preference")) {
		return false;
	}
	return undefined;
}
function doesMatch$1(value) {
	return matchMedia(`(prefers-reduced-motion: ${value})`).matches;
}

/**
 * @see https://www.w3.org/TR/mediaqueries-5/#dynamic-range
 */
function isHDR() {
	if (doesMatch("high")) {
		return true;
	}
	if (doesMatch("standard")) {
		return false;
	}
	return undefined;
}
function doesMatch(value) {
	return matchMedia(`(dynamic-range: ${value})`).matches;
}

const M = Math; // To reduce the minified code size
const fallbackFn = () => 0;
/**
 * @see https://gitlab.torproject.org/legacy/trac/-/issues/13018
 * @see https://bugzilla.mozilla.org/show_bug.cgi?id=531915
 */
function getMathFingerprint() {
	// Native operations
	const acos = M.acos || fallbackFn;
	const acosh = M.acosh || fallbackFn;
	const asin = M.asin || fallbackFn;
	const asinh = M.asinh || fallbackFn;
	const atanh = M.atanh || fallbackFn;
	const atan = M.atan || fallbackFn;
	const sin = M.sin || fallbackFn;
	const sinh = M.sinh || fallbackFn;
	const cos = M.cos || fallbackFn;
	const cosh = M.cosh || fallbackFn;
	const tan = M.tan || fallbackFn;
	const tanh = M.tanh || fallbackFn;
	const exp = M.exp || fallbackFn;
	const expm1 = M.expm1 || fallbackFn;
	const log1p = M.log1p || fallbackFn;
	// Operation polyfills
	const powPI = (value) => M.pow(M.PI, value);
	const acoshPf = (value) => M.log(value + M.sqrt(value * value - 1));
	const asinhPf = (value) => M.log(value + M.sqrt(value * value + 1));
	const atanhPf = (value) => M.log((1 + value) / (1 - value)) / 2;
	const sinhPf = (value) => M.exp(value) - 1 / M.exp(value) / 2;
	const coshPf = (value) => (M.exp(value) + 1 / M.exp(value)) / 2;
	const expm1Pf = (value) => M.exp(value) - 1;
	const tanhPf = (value) => (M.exp(2 * value) - 1) / (M.exp(2 * value) + 1);
	const log1pPf = (value) => M.log(1 + value);
	// Note: constant values are empirical
	return {
		acos: acos(0.123124234234234242),
		acosh: acosh(1e308),
		acoshPf: acoshPf(1e154),
		asin: asin(0.123124234234234242),
		asinh: asinh(1),
		asinhPf: asinhPf(1),
		atanh: atanh(0.5),
		atanhPf: atanhPf(0.5),
		atan: atan(0.5),
		sin: sin(-1e300),
		sinh: sinh(1),
		sinhPf: sinhPf(1),
		cos: cos(10.000000000123),
		cosh: cosh(1),
		coshPf: coshPf(1),
		tan: tan(-1e300),
		tanh: tanh(1),
		tanhPf: tanhPf(1),
		exp: exp(1),
		expm1: expm1(1),
		expm1Pf: expm1Pf(1),
		log1p: log1p(10),
		log1pPf: log1pPf(10),
		powPI: powPI(-100),
	};
}

/**
 * We use m or w because these two characters take up the maximum width.
 * Also there are a couple of ligatures.
 */
const defaultText = "mmMwWLliI0fiflO&1";
/**
 * Settings of text blocks to measure. The keys are random but persistent words.
 */
const presets = {
	/**
	 * The default font. User can change it in desktop Chrome, desktop Firefox, IE 11,
	 * Android Chrome (but only when the size is ≥ than the default) and Android Firefox.
	 */
	default: [],
	/** OS font on macOS. User can change its size and weight. Applies after Safari restart. */
	apple: [{ font: "-apple-system-body" }],
	/** User can change it in desktop Chrome and desktop Firefox. */
	serif: [{ fontFamily: "serif" }],
	/** User can change it in desktop Chrome and desktop Firefox. */
	sans: [{ fontFamily: "sans-serif" }],
	/** User can change it in desktop Chrome and desktop Firefox. */
	mono: [{ fontFamily: "monospace" }],
	/**
	 * Check the smallest allowed font size. User can change it in desktop Chrome, desktop Firefox and desktop Safari.
	 * The height can be 0 in Chrome on a retina display.
	 */
	min: [{ fontSize: "1px" }],
	/** Tells one OS from another in desktop Chrome. */
	system: [{ fontFamily: "system-ui" }],
};
/**
 * The result is a dictionary of the width of the text samples.
 * Heights aren't included because they give no extra entropy and are unstable.
 *
 * The result is very stable in IE 11, Edge 18 and Safari 14.
 * The result changes when the OS pixel density changes in Chromium 87. The real pixel density is required to solve,
 * but seems like it's impossible: https://stackoverflow.com/q/1713771/1118709.
 * The "min" and the "mono" (only on Windows) value may change when the page is zoomed in Firefox 87.
 */
function getFontPreferences() {
	return withNaturalFonts((document, container) => {
		const elements = {};
		const sizes = {};
		// First create all elements to measure. If the DOM steps below are done in a single cycle,
		// browser will alternate tree modification and layout reading, that is very slow.
		for (const key of Object.keys(presets)) {
			const [style = {}, text = defaultText] = presets[key];
			const element = document.createElement("span");
			element.textContent = text;
			element.style.whiteSpace = "nowrap";
			for (const name of Object.keys(style)) {
				const value = style[name];
				if (value !== undefined) {
					element.style[name] = value;
				}
			}
			elements[key] = element;
			container.appendChild(document.createElement("br"));
			container.appendChild(element);
		}
		// Then measure the created elements
		for (const key of Object.keys(presets)) {
			sizes[key] = elements[key].getBoundingClientRect().width;
		}
		return sizes;
	});
}
/**
 * Creates a DOM environment that provides the most natural font available, including Android OS font.
 * Measurements of the elements are zoom-independent.
 * Don't put a content to measure inside an absolutely positioned element.
 */
function withNaturalFonts(action, containerWidthPx = 4000) {
	/*
	 * Requirements for Android Chrome to apply the system font size to a text inside an iframe:
	 * - The iframe mustn't have a `display: none;` style;
	 * - The text mustn't be positioned absolutely;
	 * - The text block must be wide enough.
	 *   2560px on some devices in portrait orientation for the biggest font size option (32px);
	 * - There must be much enough text to form a few lines (I don't know the exact numbers);
	 * - The text must have the `text-size-adjust: none` style. Otherwise the text will scale in "Desktop site" mode;
	 *
	 * Requirements for Android Firefox to apply the system font size to a text inside an iframe:
	 * - The iframe document must have a header: `<meta name="viewport" content="width=device-width, initial-scale=1" />`.
	 *   The only way to set it is to use the `srcdoc` attribute of the iframe;
	 * - The iframe content must get loaded before adding extra content with JavaScript;
	 *
	 * https://example.com as the iframe target always inherits Android font settings so it can be used as a reference.
	 *
	 * Observations on how page zoom affects the measurements:
	 * - macOS Safari 11.1, 12.1, 13.1, 14.0: zoom reset + offsetWidth = 100% reliable;
	 * - macOS Safari 11.1, 12.1, 13.1, 14.0: zoom reset + getBoundingClientRect = 100% reliable;
	 * - macOS Safari 14.0: offsetWidth = 5% fluctuation;
	 * - macOS Safari 14.0: getBoundingClientRect = 5% fluctuation;
	 * - iOS Safari 9, 10, 11.0, 12.0: haven't found a way to zoom a page (pinch doesn't change layout);
	 * - iOS Safari 13.1, 14.0: zoom reset + offsetWidth = 100% reliable;
	 * - iOS Safari 13.1, 14.0: zoom reset + getBoundingClientRect = 100% reliable;
	 * - iOS Safari 14.0: offsetWidth = 100% reliable;
	 * - iOS Safari 14.0: getBoundingClientRect = 100% reliable;
	 * - Chrome 42, 65, 80, 87: zoom 1/devicePixelRatio + offsetWidth = 1px fluctuation;
	 * - Chrome 42, 65, 80, 87: zoom 1/devicePixelRatio + getBoundingClientRect = 100% reliable;
	 * - Chrome 87: offsetWidth = 1px fluctuation;
	 * - Chrome 87: getBoundingClientRect = 0.7px fluctuation;
	 * - Firefox 48, 51: offsetWidth = 10% fluctuation;
	 * - Firefox 48, 51: getBoundingClientRect = 10% fluctuation;
	 * - Firefox 52, 53, 57, 62, 66, 67, 68, 71, 75, 80, 84: offsetWidth = width 100% reliable, height 10% fluctuation;
	 * - Firefox 52, 53, 57, 62, 66, 67, 68, 71, 75, 80, 84: getBoundingClientRect = width 100% reliable, height 10%
	 *   fluctuation;
	 * - Android Chrome 86: haven't found a way to zoom a page (pinch doesn't change layout);
	 * - Android Firefox 84: font size in accessibility settings changes all the CSS sizes, but offsetWidth and
	 *   getBoundingClientRect keep measuring with regular units, so the size reflects the font size setting and doesn't
	 *   fluctuate;
	 * - IE 11, Edge 18: zoom 1/devicePixelRatio + offsetWidth = 100% reliable;
	 * - IE 11, Edge 18: zoom 1/devicePixelRatio + getBoundingClientRect = reflects the zoom level;
	 * - IE 11, Edge 18: offsetWidth = 100% reliable;
	 * - IE 11, Edge 18: getBoundingClientRect = 100% reliable;
	 */
	return withIframe((_, iframeWindow) => {
		const iframeDocument = iframeWindow.document;
		const iframeBody = iframeDocument.body;
		const bodyStyle = iframeBody.style;
		bodyStyle.width = `${containerWidthPx}px`;
		bodyStyle.webkitTextSizeAdjust = bodyStyle.textSizeAdjust = "none";
		// See the big comment above
		if (isChromium()) {
			iframeBody.style.zoom = `${1 / iframeWindow.devicePixelRatio}`;
		} else if (isWebKit()) {
			iframeBody.style.zoom = "reset";
		}
		// See the big comment above
		const linesOfText = iframeDocument.createElement("div");
		linesOfText.textContent = [...Array((containerWidthPx / 20) << 0)]
			.map(() => "word")
			.join(" ");
		iframeBody.appendChild(linesOfText);
		return action(iframeDocument, iframeBody);
	}, '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">');
}

/**
 * @see Credits: https://stackoverflow.com/a/49267844
 */
function getVideoCard() {
	const canvas = document.createElement("canvas");
	const gl =
		canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
	if (gl && "getExtension" in gl) {
		const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
		if (debugInfo) {
			return {
				vendor: (
					gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || ""
				).toString(),
				renderer: (
					gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ""
				).toString(),
			};
		}
	}
	return undefined;
}

function isPdfViewerEnabled() {
	return navigator.pdfViewerEnabled;
}

/**
 * Unlike most other architectures, on x86/x86-64 when floating-point instructions
 * have no NaN arguments, but produce NaN output, the output NaN has sign bit set.
 * We use it to distinguish x86/x86-64 from other architectures, by doing subtraction
 * of two infinities (must produce NaN per IEEE 754 standard).
 *
 * See https://codebrowser.bddppq.com/pytorch/pytorch/third_party/XNNPACK/src/init.c.html#79
 */
function getArchitecture() {
	const f = new Float32Array(1);
	const u8 = new Uint8Array(f.buffer);
	f[0] = Number.POSITIVE_INFINITY;
	f[0] = f[0] - f[0];
	return u8[3];
}

/**
 * The list of entropy sources used to make visitor identifiers.
 *
 * This value isn't restricted by Semantic Versioning, i.e. it may be changed without bumping minor or major version of
 * this package.
 *
 * Note: Rollup and Webpack are smart enough to remove unused properties of this object during tree-shaking, so there is
 * no need to export the sources individually.
 */
const sources = {
	// READ FIRST:
	// See https://github.com/fingerprintjs/fingerprintjs/blob/master/contributing.md#how-to-make-an-entropy-source
	// to learn how entropy source works and how to make your own.
	// The sources run in this exact order.
	// The asynchronous sources are at the start to run in parallel with other sources.
	fonts: getFonts,
	domBlockers: getDomBlockers,
	fontPreferences: getFontPreferences,
	audio: getAudioFingerprint,
	screenFrame: getRoundedScreenFrame,
	osCpu: getOsCpu,
	languages: getLanguages,
	colorDepth: getColorDepth,
	deviceMemory: getDeviceMemory,
	screenResolution: getScreenResolution,
	hardwareConcurrency: getHardwareConcurrency,
	timezone: getTimezone,
	sessionStorage: getSessionStorage,
	localStorage: getLocalStorage,
	indexedDB: getIndexedDB,
	openDatabase: getOpenDatabase,
	cpuClass: getCpuClass,
	platform: getPlatform,
	plugins: getPlugins,
	canvas: getCanvasFingerprint,
	touchSupport: getTouchSupport,
	vendor: getVendor,
	vendorFlavors: getVendorFlavors,
	cookiesEnabled: areCookiesEnabled,
	colorGamut: getColorGamut,
	invertedColors: areColorsInverted,
	forcedColors: areColorsForced,
	monochrome: getMonochromeDepth,
	contrast: getContrastPreference,
	reducedMotion: isMotionReduced,
	hdr: isHDR,
	math: getMathFingerprint,
	videoCard: getVideoCard,
	pdfViewerEnabled: isPdfViewerEnabled,
	architecture: getArchitecture,
};
/**
 * Loads the built-in entropy sources.
 * Returns a function that collects the entropy components to make the visitor identifier.
 */
function loadBuiltinSources(options) {
	return loadSources(sources, options, []);
}

const commentTemplate = "$ if upgrade to Pro: https://fpjs.dev/pro";
function getConfidence(components) {
	const openConfidenceScore = getOpenConfidenceScore(components);
	const proConfidenceScore = deriveProConfidenceScore(openConfidenceScore);
	return {
		score: openConfidenceScore,
		comment: commentTemplate.replace(/\$/g, `${proConfidenceScore}`),
	};
}
function getOpenConfidenceScore(components) {
	// In order to calculate the true probability of the visitor identifier being correct, we need to know the number of
	// website visitors (the higher the number, the less the probability because the fingerprint entropy is limited).
	// JS agent doesn't know the number of visitors, so we can only do an approximate assessment.
	if (isAndroid()) {
		return 0.4;
	}
	// Safari (mobile and desktop)
	if (isWebKit()) {
		return isDesktopSafari() ? 0.5 : 0.3;
	}
	const platform = components.platform.value || "";
	// Windows
	if (/^Win/.test(platform)) {
		// The score is greater than on macOS because of the higher variety of devices running Windows.
		// Chrome provides more entropy than Firefox according too
		// https://netmarketshare.com/browser-market-share.aspx?options=%7B%22filter%22%3A%7B%22%24and%22%3A%5B%7B%22platform%22%3A%7B%22%24in%22%3A%5B%22Windows%22%5D%7D%7D%5D%7D%2C%22dateLabel%22%3A%22Trend%22%2C%22attributes%22%3A%22share%22%2C%22group%22%3A%22browser%22%2C%22sort%22%3A%7B%22share%22%3A-1%7D%2C%22id%22%3A%22browsersDesktop%22%2C%22dateInterval%22%3A%22Monthly%22%2C%22dateStart%22%3A%222019-11%22%2C%22dateEnd%22%3A%222020-10%22%2C%22segments%22%3A%22-1000%22%7D
		// So we assign the same score to them.
		return 0.6;
	}
	// macOS
	if (/^Mac/.test(platform)) {
		// Chrome provides more entropy than Safari and Safari provides more entropy than Firefox.
		// Chrome is more popular than Safari and Safari is more popular than Firefox according to
		// https://netmarketshare.com/browser-market-share.aspx?options=%7B%22filter%22%3A%7B%22%24and%22%3A%5B%7B%22platform%22%3A%7B%22%24in%22%3A%5B%22Mac%20OS%22%5D%7D%7D%5D%7D%2C%22dateLabel%22%3A%22Trend%22%2C%22attributes%22%3A%22share%22%2C%22group%22%3A%22browser%22%2C%22sort%22%3A%7B%22share%22%3A-1%7D%2C%22id%22%3A%22browsersDesktop%22%2C%22dateInterval%22%3A%22Monthly%22%2C%22dateStart%22%3A%222019-11%22%2C%22dateEnd%22%3A%222020-10%22%2C%22segments%22%3A%22-1000%22%7D
		// So we assign the same score to them.
		return 0.5;
	}
	// Another platform, e.g. a desktop Linux. It's rare, so it should be pretty unique.
	return 0.7;
}
function deriveProConfidenceScore(openConfidenceScore) {
	return round(0.99 + 0.01 * openConfidenceScore, 0.0001);
}

// Copyright 2021-2024 Prosopo (UK) Ltd.
function hexHash(data) {
	// default bit length is 256
	return x64hash128(data);
}
function hexHashArray(arr) {
	return hexHash(arr.join(""));
}

// Copyright 2021-2024 Prosopo (UK) Ltd.
class MerkleNode {
	constructor(hash) {
		this.hash = hash;
		this.parent = null;
	}
}
class CaptchaMerkleTree {
	constructor() {
		this.leaves = [];
		this.layers = [];
	}
	getRoot() {
		if (this.root === undefined) {
			throw new Error("root undefined");
		}
		return this.root;
	}
	build(leaves) {
		console.log("building tree");
		console.log(leaves);
		// allow rebuild
		if (this.layers.length) {
			this.layers = [];
		}
		const layerZero = [];
		for (const leaf of leaves) {
			const node = new MerkleNode(leaf);
			this.leaves.push(node);
			layerZero.push(node.hash);
		}
		this.layers.push(layerZero);
		this.root = this.buildMerkleTree(this.leaves)[0];
	}
	buildMerkleTree(leaves) {
		// Builds the Merkle tree from a list of leaves. In case of an odd number of leaves, the last leaf is duplicated.
		const numLeaves = leaves.length;
		if (numLeaves === 1) {
			return leaves;
		}
		const parents = [];
		let leafIndex = 0;
		const newLayer = [];
		while (leafIndex < numLeaves) {
			const leftChild = leaves[leafIndex];
			if (leftChild === undefined) {
				throw new Error("leftChild undefined");
			}
			const rightChild =
				leafIndex + 1 < numLeaves ? at(leaves, leafIndex + 1) : leftChild;
			const parentNode = this.createParent(leftChild, rightChild);
			newLayer.push(parentNode.hash);
			parents.push(parentNode);
			leafIndex += 2;
		}
		this.layers.push(newLayer);
		return this.buildMerkleTree(parents);
	}
	createParent(leftChild, rightChild) {
		const parent = new MerkleNode(
			hexHashArray([leftChild.hash, rightChild.hash]),
		);
		leftChild.parent = parent.hash;
		rightChild.parent = parent.hash;
		return parent;
	}
	proof(leafHash) {
		const proofTree = [];
		let layerNum = 0;
		while (layerNum < this.layers.length - 1) {
			const layer = this.layers[layerNum];
			if (layer === undefined) {
				throw new Error("layer undefined");
			}
			const leafIndex = layer.indexOf(leafHash);
			// if layer 0 leaf index is 3, it should be partnered with 2: [L0,L1],[L2,L3],[L3,L4],...
			// layer one pairs looks like [L0L1, L2L3], [L3L4, L5L6],...etc
			let partnerIndex =
				leafIndex % 2 && leafIndex > 0 ? leafIndex - 1 : leafIndex + 1;
			// if there are an odd number of leaves in the layer, the last leaf is duplicated
			if (partnerIndex > layer.length - 1) {
				partnerIndex = leafIndex;
			}
			const pair = [leafHash];
			// determine whether the leaf sits on the left or the right of its partner
			const partner = at(layer, partnerIndex);
			if (partnerIndex > leafIndex) {
				pair.push(partner);
			} else {
				pair.unshift(partner);
			}
			proofTree.push([at(pair, 0), at(pair, 1)]);
			layerNum += 1;
			leafHash = hexHashArray(pair);
		}
		const last = at(this.layers, this.layers.length - 1);
		return [...proofTree, [at(last, 0)]];
	}
}
const at = (array, index) => {
	if (index < 0 || index >= array.length) {
		throw new Error(`index ${index} out of bounds`);
	}
	return array[index];
};

function componentsToCanonicalString(components) {
	let result = "";
	for (const componentKey of Object.keys(components).sort()) {
		const component = components[componentKey];
		const value = component.error ? "error" : JSON.stringify(component.value);
		result += `${result ? "|" : ""}${componentKey.replace(/([:|\\])/g, "\\$1")}:${value}`;
	}
	return result;
}
function componentsToDebugString(components) {
	return JSON.stringify(
		components,
		(_key, value) => {
			if (value instanceof Error) {
				return errorToObject(value);
			}
			return value;
		},
		2,
	);
}
function hashComponents(components) {
	return x64hash128(componentsToCanonicalString(components));
}
/**
 * Makes a GetResult implementation that calculates the visitor id hash on demand.
 * Designed for optimisation.
 */
function makeLazyGetResult(components, tree) {
	let visitorIdCache;
	// This function runs very fast, so there is no need to make it lazy
	const confidence = getConfidence(components);
	// A plain class isn't used because its getters and setters aren't enumerable.
	return {
		get visitorId() {
			if (visitorIdCache === undefined) {
				visitorIdCache = hashComponents(this.components);
			}
			return visitorIdCache;
		},
		set visitorId(visitorId) {
			visitorIdCache = visitorId;
		},
		confidence,
		components,
		version,
		tree,
	};
}
/**
 * A delay is required to ensure consistent entropy components.
 * See https://github.com/fingerprintjs/fingerprintjs/issues/254
 * and https://github.com/fingerprintjs/fingerprintjs/issues/307
 * and https://github.com/fingerprintjs/fingerprintjs/commit/945633e7c5f67ae38eb0fea37349712f0e669b18
 */
function prepareForSources(delayFallback = 50) {
	// A proper deadline is unknown. Let it be twice the fallback timeout so that both cases have the same average time.
	return requestIdleCallbackIfAvailable(delayFallback, delayFallback * 2);
}
/**
 * The function isn't exported from the index file to not allow to call it without `load()`.
 * The hiding gives more freedom for future non-breaking updates.
 *
 * A factory function is used instead of a class to shorten the attribute names in the minified code.
 * Native private class fields could've been used, but TypeScript doesn't allow them with `"target": "es5"`.
 */
function makeAgent(getComponents, debug) {
	const creationTime = Date.now();
	return {
		get: async (options) => {
			const startTime = Date.now();
			const components = await getComponents();
			const componentValues = Object.keys(sources)
				.map((key) => {
					if (key in components) {
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						if (typeof components[key].value === "object") {
							// eslint-disable-next-line @typescript-eslint/ban-ts-comment
							// @ts-ignore
							console.log(
								"returning stringified value",
								JSON.stringify(components[key].value),
							);
							// eslint-disable-next-line @typescript-eslint/ban-ts-comment
							// @ts-ignore
							return JSON.stringify(components[key].value);
						}
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						return components[key].value;
					}
					return null;
				})
				.map((value) => murmurX64Hash128(value, 0));
			const tree = new CaptchaMerkleTree();
			tree.build(componentValues);
			const result = makeLazyGetResult(components, tree);
			if (debug || options?.debug) {
				// console.log is ok here because it's under a debug clause
				// eslint-disable-next-line no-console
				console.log(`Copy the text below to get the debug data:

\`\`\`
version: ${result.version}
userAgent: ${navigator.userAgent}
timeBetweenLoadAndGet: ${startTime - creationTime}
visitorId: ${result.visitorId}
components: ${componentsToDebugString(components)}
tree: ${JSON.stringify(tree)}
\`\`\``);
			}
			return result;
		},
	};
}
/**
 * Sends an unpersonalized AJAX request to collect installation statistics
 */
function monitor() {
	// The FingerprintJS CDN (https://github.com/fingerprintjs/cdn) replaces `window.__fpjs_d_m` with `true`
	if (window.__fpjs_d_m || Math.random() >= 0.001) {
		return;
	}
	try {
		const request = new XMLHttpRequest();
		request.open(
			"get",
			`https://m1.openfpcdn.io/fingerprintjs/v${version}/npm-monitoring`,
			true,
		);
		request.send();
	} catch (error) {
		// console.error is ok here because it's an unexpected error handler
		// eslint-disable-next-line no-console
		console.error(error);
	}
}
/**
 * Builds an instance of Agent and waits a delay required for a proper operation.
 */
async function load({ delayFallback, debug, monitoring = true } = {}) {
	if (monitoring) {
		monitor();
	}
	await prepareForSources(delayFallback);
	const getComponents = loadBuiltinSources({ debug });
	return makeAgent(getComponents, debug);
}

// The default export is a syntax sugar (`import * as FP from '...' → import FP from '...'`).
// It should contain all the public exported values.
var index = { load, hashComponents, componentsToDebugString };
// The exports below are for private usage. They may change unexpectedly. Use them at your own risk.
/** Not documented, out of Semantic Versioning, usage is at your own risk */
const murmurX64Hash128 = x64hash128;

export {
	componentsToDebugString,
	index as default,
	getFullscreenElement,
	getScreenFrame,
	hashComponents,
	isAndroid,
	isChromium,
	isDesktopSafari,
	isEdgeHTML,
	isGecko,
	isTrident,
	isWebKit,
	load,
	loadSources,
	murmurX64Hash128,
	prepareForSources,
	sources,
	transformSource,
	withIframe,
};

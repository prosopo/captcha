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

/**
 * Before/after accounting for what a script leaves on the page that loaded it.
 *
 * `installPageTracker` goes in before the script under test so it sees every
 * listener and interval that script adds to the host's own objects; the
 * snapshots then diff into a flat list of changes a host page would notice.
 */

type HostTarget = "window" | "document" | "body";

export interface PageTracker {
	listeners(): string[];
	intervals(): number;
	uninstall(): void;
}

type ListenerMethods = Pick<
	EventTarget,
	"addEventListener" | "removeEventListener"
>;

export const installPageTracker = (): PageTracker => {
	// jsdom's selector engine hangs mouseover/mouseout listeners on the document
	// the first time anything queries it; trigger that now so it is never
	// counted against the script under test.
	document.querySelector("*");

	const live = new Map<string, number>();
	const intervals = new Set<number>();
	const nativeSetInterval = window.setInterval;
	const nativeClearInterval = window.clearInterval;

	const hostName = (target: EventTarget): HostTarget | undefined => {
		if (target === window) return "window";
		if (target === document) return "document";
		if (target === document.body) return "body";
		return undefined;
	};
	const key = (target: EventTarget, type: string): string | undefined => {
		const host = hostName(target);
		return host === undefined ? undefined : `${host}:${type}`;
	};

	// Browsers resolve window.addEventListener through EventTarget.prototype,
	// but jsdom under vitest gives window its own bound copies, which a
	// prototype patch never sees.
	const holders: ListenerMethods[] = [EventTarget.prototype];
	if (Object.prototype.hasOwnProperty.call(window, "addEventListener"))
		holders.push(window);

	const restores = holders.map((holder) => {
		const nativeAdd = holder.addEventListener;
		const nativeRemove = holder.removeEventListener;
		holder.addEventListener = function trackedAdd(
			this: EventTarget,
			type: string,
			listener: EventListenerOrEventListenerObject | null,
			options?: AddEventListenerOptions | boolean,
		): void {
			const k = key(this, type);
			if (k !== undefined && listener !== null) {
				live.set(k, (live.get(k) ?? 0) + 1);
			}
			nativeAdd.call(this, type, listener, options);
		};
		holder.removeEventListener = function trackedRemove(
			this: EventTarget,
			type: string,
			listener: EventListenerOrEventListenerObject | null,
			options?: EventListenerOptions | boolean,
		): void {
			const k = key(this, type);
			const count = k === undefined ? 0 : (live.get(k) ?? 0);
			if (k !== undefined && count > 0) {
				live.set(k, count - 1);
			}
			nativeRemove.call(this, type, listener, options);
		};
		return () => {
			holder.addEventListener = nativeAdd;
			holder.removeEventListener = nativeRemove;
		};
	});

	window.setInterval = ((handler: TimerHandler, timeout?: number) => {
		const id = nativeSetInterval(handler, timeout);
		intervals.add(id);
		return id;
	}) as typeof window.setInterval;
	window.clearInterval = ((id?: number) => {
		if (id !== undefined) intervals.delete(id);
		nativeClearInterval(id);
	}) as typeof window.clearInterval;

	return {
		listeners: () =>
			[...live.entries()]
				.filter(([, count]) => count > 0)
				.flatMap(([k, count]) => Array<string>(count).fill(k))
				.sort(),
		intervals: () => intervals.size,
		uninstall: () => {
			for (const restore of restores) restore();
			window.setInterval = nativeSetInterval;
			window.clearInterval = nativeClearInterval;
		},
	};
};

const BUILTINS = {
	fetch: () => window.fetch,
	"XMLHttpRequest.prototype.open": () => XMLHttpRequest.prototype.open,
	"XMLHttpRequest.prototype.send": () => XMLHttpRequest.prototype.send,
	"XMLHttpRequest.prototype.setRequestHeader": () =>
		XMLHttpRequest.prototype.setRequestHeader,
	"history.pushState": () => history.pushState,
	"history.replaceState": () => history.replaceState,
	postMessage: () => window.postMessage,
} as const;

export type BuiltinName = keyof typeof BUILTINS;

export interface PageSnapshot {
	globals: string[];
	builtins: Record<BuiltinName, unknown>;
	htmlAttributes: string[];
	bodyAttributes: string[];
	nodes: string[];
	cookies: string[];
	storage: string[];
	listeners: string[];
	intervals: number;
}

const attributes = (element: Element | null): string[] =>
	element === null
		? []
		: Array.from(element.attributes)
				.map((a) => `${a.name}=${a.value}`)
				.sort();

const describeNode = (parent: string, element: Element): string =>
	`${parent}>${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`;

const storageKeys = (name: string, storage: Storage): string[] =>
	Array.from({ length: storage.length }, (_, i) => storage.key(i))
		.filter((k): k is string => k !== null)
		.map((k) => `${name}:${k}`);

export const snapshotPage = (tracker: PageTracker): PageSnapshot => ({
	globals: Object.getOwnPropertyNames(window).sort(),
	builtins: Object.fromEntries(
		Object.entries(BUILTINS).map(([name, read]) => [name, read()]),
	) as Record<BuiltinName, unknown>,
	htmlAttributes: attributes(document.documentElement),
	bodyAttributes: attributes(document.body),
	nodes: [
		...Array.from(document.head.children).map((e) => describeNode("head", e)),
		...Array.from(document.body.children).map((e) => describeNode("body", e)),
	].sort(),
	cookies: document.cookie
		.split(";")
		.map((c) => c.trim().split("=")[0] ?? "")
		.filter((c) => c !== "")
		.sort(),
	storage: [
		...storageKeys("localStorage", localStorage),
		...storageKeys("sessionStorage", sessionStorage),
	].sort(),
	listeners: tracker.listeners(),
	intervals: tracker.intervals(),
});

const listDiff = (
	kind: string,
	before: readonly string[],
	after: readonly string[],
): string[] => {
	const remaining = [...before];
	const added: string[] = [];
	for (const item of after) {
		const at = remaining.indexOf(item);
		if (at === -1) added.push(item);
		else remaining.splice(at, 1);
	}
	return [
		...added.map((item) => `+${kind} ${item}`),
		...remaining.map((item) => `-${kind} ${item}`),
	];
};

/** Every difference between two snapshots, one line each, in a stable order. */
export const diffPage = (
	before: PageSnapshot,
	after: PageSnapshot,
): string[] => [
	...listDiff("global", before.globals, after.globals),
	...(Object.keys(before.builtins) as BuiltinName[])
		.filter((name) => before.builtins[name] !== after.builtins[name])
		.map((name) => `~builtin ${name}`),
	...listDiff("html-attr", before.htmlAttributes, after.htmlAttributes),
	...listDiff("body-attr", before.bodyAttributes, after.bodyAttributes),
	...listDiff("node", before.nodes, after.nodes),
	...listDiff("cookie", before.cookies, after.cookies),
	...listDiff("storage", before.storage, after.storage),
	...listDiff("listener", before.listeners, after.listeners),
	...(after.intervals === before.intervals
		? []
		: [`~intervals ${before.intervals}->${after.intervals}`]),
];

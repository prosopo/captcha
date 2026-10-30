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

import { afterEach, describe, expect, it, vi } from "vitest";
import { sendDnsBeacons } from "../customDetectBot.js";

class RecordingImage {
	static sources: string[] = [];
	set src(value: string) {
		RecordingImage.sources.push(value);
	}
}

const stubBeaconGlobals = (): ReturnType<typeof vi.fn> => {
	const fetchMock = vi.fn(
		(_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
			Promise.resolve(new Response()),
	);
	vi.stubGlobal("fetch", fetchMock);
	vi.stubGlobal("Image", RecordingImage);
	RecordingImage.sources = [];
	return fetchMock;
};

describe("sendDnsBeacons", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("fetches the DNS URL and loads the asset URL as an image", () => {
		const fetchMock = stubBeaconGlobals();

		sendDnsBeacons({
			dns_url: "https://s1.px.example.com/a.gif?sid=s1",
			dns_asset_url: "https://s1.px.example.com/b.png?sid=s1",
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0]?.[0]).toBe(
			"https://s1.px.example.com/a.gif?sid=s1",
		);
		expect(RecordingImage.sources).toEqual([
			"https://s1.px.example.com/b.png?sid=s1",
		]);
	});

	it("sends nothing when the provider sent no URLs", () => {
		const fetchMock = stubBeaconGlobals();

		sendDnsBeacons({});

		expect(fetchMock).not.toHaveBeenCalled();
		expect(RecordingImage.sources).toEqual([]);
	});

	it("still fetches the DNS URL from a provider that sends no asset URL", () => {
		const fetchMock = stubBeaconGlobals();

		sendDnsBeacons({ dns_url: "https://s1.px.example.com/a.gif?sid=s1" });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(RecordingImage.sources).toEqual([]);
	});

	it("never throws when the fetch itself throws", () => {
		vi.stubGlobal(
			"fetch",
			vi.fn((): Promise<Response> => {
				throw new Error("blocked");
			}),
		);

		expect(() =>
			sendDnsBeacons({ dns_url: "https://s1.px.example.com/a.gif" }),
		).not.toThrow();
	});
});

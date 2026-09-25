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

import { describe, expect, it } from "vitest";
import {
	ResponseTooLargeError,
	readCappedJson,
	readCappedText,
} from "../readCappedBody.js";

const encoder = new TextEncoder();

interface ChunkedStream {
	stream: ReadableStream<Uint8Array>;
	chunksPulled: () => number;
	cancelled: () => boolean;
}

const chunkedStream = (chunk: string, count: number): ChunkedStream => {
	let pulled = 0;
	let wasCancelled = false;
	const stream = new ReadableStream<Uint8Array>({
		pull(controller) {
			if (pulled >= count) {
				controller.close();
				return;
			}
			pulled++;
			controller.enqueue(encoder.encode(chunk));
		},
		cancel() {
			wasCancelled = true;
		},
	});
	return {
		stream,
		chunksPulled: () => pulled,
		cancelled: () => wasCancelled,
	};
};

describe("readCappedText", () => {
	it("reads a body under the cap", async () => {
		await expect(readCappedText(new Response("hello"), 10)).resolves.toBe(
			"hello",
		);
	});

	it("reads a body of exactly the cap", async () => {
		await expect(readCappedText(new Response("hello"), 5)).resolves.toBe(
			"hello",
		);
	});

	it("reads a chunked body with no content-length", async () => {
		const { stream } = chunkedStream("ab", 4);
		const response = new Response(stream);
		expect(response.headers.get("content-length")).toBeNull();

		await expect(readCappedText(response, 8)).resolves.toBe("abababab");
	});

	it("reassembles a multi-byte character split across chunks", async () => {
		const bytes = encoder.encode("é");
		let sent = 0;
		const stream = new ReadableStream<Uint8Array>({
			pull(controller) {
				if (sent === bytes.length) {
					controller.close();
					return;
				}
				controller.enqueue(bytes.slice(sent, sent + 1));
				sent++;
			},
		});

		await expect(readCappedText(new Response(stream), 2)).resolves.toBe("é");
	});

	it("refuses a declared content-length over the cap without reading it", async () => {
		const tracked = chunkedStream("x", 1);
		const response = new Response(tracked.stream, {
			headers: { "content-length": "1000" },
		});

		await expect(readCappedText(response, 10)).rejects.toBeInstanceOf(
			ResponseTooLargeError,
		);
		expect(tracked.chunksPulled()).toBeLessThanOrEqual(1);
		expect(tracked.cancelled()).toBe(true);
	});

	it("stops reading a chunked body once it passes the cap", async () => {
		const tracked = chunkedStream("x".repeat(1024), 1_000_000);

		await expect(
			readCappedText(new Response(tracked.stream), 4096),
		).rejects.toThrow("exceeds 4096 bytes");
		expect(tracked.chunksPulled()).toBeLessThan(10);
		expect(tracked.cancelled()).toBe(true);
	});

	it("does not trust a content-length that understates the body", async () => {
		const { stream } = chunkedStream("x".repeat(100), 5);
		const response = new Response(stream, {
			headers: { "content-length": "10" },
		});

		await expect(readCappedText(response, 200)).rejects.toBeInstanceOf(
			ResponseTooLargeError,
		);
	});

	it("reads an empty body as an empty string", async () => {
		await expect(readCappedText(new Response(null), 10)).resolves.toBe("");
	});
});

describe("readCappedJson", () => {
	it("parses a body under the cap", async () => {
		await expect(
			readCappedJson(new Response(JSON.stringify({ a: 1 })), 100),
		).resolves.toEqual({ a: 1 });
	});

	it("refuses an oversized body before parsing it", async () => {
		await expect(
			readCappedJson(new Response(JSON.stringify({ a: "x".repeat(50) })), 10),
		).rejects.toBeInstanceOf(ResponseTooLargeError);
	});

	it("rejects malformed JSON as JSON.parse does", async () => {
		await expect(
			readCappedJson(new Response("{not json"), 100),
		).rejects.toBeInstanceOf(SyntaxError);
	});
});

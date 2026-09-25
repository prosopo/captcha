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

export class ResponseTooLargeError extends Error {
	constructor(
		readonly maxBytes: number,
		readonly url: string,
	) {
		super(`Response from ${url || "fetch"} exceeds ${maxBytes} bytes`);
		this.name = "ResponseTooLargeError";
	}
}

const declaredLength = (response: Response): number => {
	const header = response.headers.get("content-length");
	return header === null ? Number.NaN : Number(header);
};

/**
 * Read a response body as text, refusing one larger than `maxBytes`.
 *
 * The declared Content-Length is checked first so an honest oversized reply
 * is refused without reading it, and the stream is counted as it arrives so a
 * missing or lying header cannot get past the cap either.
 */
export const readCappedText = async (
	response: Response,
	maxBytes: number,
): Promise<string> => {
	if (declaredLength(response) > maxBytes) {
		await response.body?.cancel();
		throw new ResponseTooLargeError(maxBytes, response.url);
	}
	if (!response.body) {
		return "";
	}
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel();
			throw new ResponseTooLargeError(maxBytes, response.url);
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(bytes);
};

export const readCappedJson = async (
	response: Response,
	maxBytes: number,
): Promise<unknown> => JSON.parse(await readCappedText(response, maxBytes));

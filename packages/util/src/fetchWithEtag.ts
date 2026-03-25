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

export const fetchWithETag = async (
	url: string,
	etag: string | null,
): Promise<{
	stream: ReadableStream<Uint8Array> | null;
	etag: string | null;
	notModified: boolean;
	contentLength?: number;
}> => {
	const headers: Record<string, string> = {};
	if (etag) {
		headers["If-None-Match"] = etag;
	}

	try {
		const response = await fetch(url, {
			method: "GET",
			headers,
		});

		if (response.status === 304) {
			return { stream: null, etag: null, notModified: true };
		}

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const responseETag = response.headers.get("etag") || null;
		const contentLength = response.headers.get("content-length")
			? Number.parseInt(<string>response.headers.get("content-length"), 10)
			: undefined;

		return {
			stream: response.body,
			etag: responseETag,
			notModified: false,
			contentLength,
		};
	} catch (error) {
		throw new Error(`Fetch error: ${error}`);
	}
};

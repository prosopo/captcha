// Copyright 2021-2025 Prosopo (UK) Ltd.
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
	content: string | null;
	etag: string | null;
	notModified: boolean;
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
			return { content: null, etag: null, notModified: true };
		}

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const content = await response.text();
		const responseETag =
			response.headers.get("etag")?.replace(/"/g, "") || null;

		return { content, etag: responseETag, notModified: false };
	} catch (error) {
		throw new Error(`Fetch error: ${error}`);
	}
};

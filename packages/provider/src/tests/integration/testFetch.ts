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
// Store original NODE_TLS_REJECT_UNAUTHORIZED value
const originalTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

// Custom fetch wrapper that temporarily disables TLS verification for self-signed certs
export const testFetch = async (
	url: string,
	options?: RequestInit,
): Promise<Response> => {
	// For HTTPS requests in tests, disable certificate verification
	if (url.startsWith("https://")) {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		try {
			return await fetch(url, options);
		} finally {
			// Restore original value
			if (originalTlsReject !== undefined) {
				process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsReject;
			} else {
				process.env.NODE_TLS_REJECT_UNAUTHORIZED = undefined;
			}
		}
	}
	return fetch(url, options);
};

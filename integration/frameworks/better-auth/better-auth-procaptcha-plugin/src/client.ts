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
import type { BetterAuthClientPlugin } from "better-auth/client";
import { DEFAULT_ENDPOINTS, PROCAPTCHA_HEADER } from "./constants.js";
import type { procaptcha } from "./index.js";
import { createPathMatcher, normalizeAuthPath } from "./path.js";

export interface ProcaptchaClientOptions {
	/**
	 * Returns the current Procaptcha token, for example the value passed to the
	 * widget's `callback`. When set, the token is attached to requests for
	 * protected endpoints automatically.
	 */
	getToken?: () => string | undefined | Promise<string | undefined>;
	/** Must match the server plugin's `endpoints`. */
	endpoints?: readonly string[];
	/** Must match the server plugin's `headerName`. */
	headerName?: string;
}

export const procaptchaHeaders = (
	token: string,
	headerName: string = PROCAPTCHA_HEADER,
): Record<string, string> => ({ [headerName]: token });

const authPathOf = (url: string | URL, baseURL: string | undefined): string => {
	const requestURL = new URL(url, "http://localhost");
	const basePath = baseURL ? new URL(baseURL, requestURL).pathname : "";
	return normalizeAuthPath(requestURL.pathname, basePath);
};

export const procaptchaClient = (options: ProcaptchaClientOptions = {}) => {
	const { getToken } = options;
	const headerName = options.headerName ?? PROCAPTCHA_HEADER;
	const isProtected = createPathMatcher(
		options.endpoints?.length ? options.endpoints : DEFAULT_ENDPOINTS,
	);

	return {
		id: "procaptcha",
		$InferServerPlugin: {} as ReturnType<typeof procaptcha>,
		fetchPlugins: getToken
			? [
					{
						id: "procaptcha",
						name: "procaptcha",
						hooks: {
							onRequest: async (context) => {
								if (
									context.headers.has(headerName) ||
									!isProtected(authPathOf(context.url, context.baseURL))
								) {
									return context;
								}
								const token = await getToken();
								if (token) {
									context.headers.set(headerName, token);
								}
								return context;
							},
						},
					},
				]
			: [],
	} satisfies BetterAuthClientPlugin;
};

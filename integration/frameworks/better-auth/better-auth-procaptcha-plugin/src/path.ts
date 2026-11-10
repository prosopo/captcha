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
export const normalizeAuthPath = (
	pathname: string,
	basePath: string,
): string => {
	const relative =
		basePath && pathname.startsWith(basePath)
			? pathname.slice(basePath.length)
			: pathname;
	const collapsed = `/${relative}`.replace(/\/{2,}/g, "/");
	return collapsed.length > 1 ? collapsed.replace(/\/$/, "") : collapsed;
};

const escapeRegExp = (value: string): string =>
	value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

const toPattern = (endpoint: string): RegExp => {
	const source = endpoint
		.split("/")
		.map((segment) =>
			segment === "**" ? "**" : escapeRegExp(segment).replaceAll("*", "[^/]*"),
		)
		.join("/")
		.replaceAll("/**", "(?:/.*)?");
	return new RegExp(`^${source}$`);
};

export type PathMatcher = (path: string) => boolean;

export const createPathMatcher = (
	endpoints: readonly string[],
): PathMatcher => {
	const matchers: PathMatcher[] = endpoints.map((endpoint) => {
		if (!endpoint.includes("*")) {
			return (path: string): boolean => path === endpoint;
		}
		const pattern = toPattern(endpoint);
		return (path: string): boolean => pattern.test(path);
	});
	return (path: string): boolean => matchers.some((matches) => matches(path));
};

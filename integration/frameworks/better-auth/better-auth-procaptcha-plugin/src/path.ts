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

const matchesSegment = (pattern: string, segment: string): boolean => {
	const parts = pattern.split("*");
	if (parts.length === 1) {
		return pattern === segment;
	}
	const first = parts[0] ?? "";
	const last = parts[parts.length - 1] ?? "";
	if (
		segment.length < first.length + last.length ||
		!segment.startsWith(first) ||
		!segment.endsWith(last)
	) {
		return false;
	}
	let cursor = first.length;
	const end = segment.length - last.length;
	for (const part of parts.slice(1, -1)) {
		const found = segment.indexOf(part, cursor);
		if (found === -1 || found + part.length > end) {
			return false;
		}
		cursor = found + part.length;
	}
	return true;
};

const matchesSegments = (
	patterns: readonly string[],
	segments: readonly string[],
): boolean => {
	const [pattern, ...restPatterns] = patterns;
	if (pattern === undefined) {
		return segments.length === 0;
	}
	if (pattern === "**") {
		for (let skip = 0; skip <= segments.length; skip++) {
			if (matchesSegments(restPatterns, segments.slice(skip))) {
				return true;
			}
		}
		return false;
	}
	const [segment, ...restSegments] = segments;
	return (
		segment !== undefined &&
		matchesSegment(pattern, segment) &&
		matchesSegments(restPatterns, restSegments)
	);
};

export type PathMatcher = (path: string) => boolean;

export const createPathMatcher = (
	endpoints: readonly string[],
): PathMatcher => {
	const matchers: PathMatcher[] = endpoints.map((endpoint) => {
		if (!endpoint.includes("*")) {
			return (path: string): boolean => path === endpoint;
		}
		const patterns = endpoint.split("/");
		return (path: string): boolean =>
			matchesSegments(patterns, path.split("/"));
	});
	return (path: string): boolean => matchers.some((matches) => matches(path));
};

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

import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

/**
 * Glob patterns for `suffix` inside every member of the pnpm workspace rooted
 * beside `rootPackageJsonPath`, read from its pnpm-workspace.yaml. Excluded
 * members (`!dir`) become negative patterns, so pass the whole list to a
 * single glob call.
 */
export const getWorkspacePatterns = (
	rootPackageJsonPath: string,
	suffix: string,
): string[] => {
	const root = path.dirname(rootPackageJsonPath);
	const workspaceFile = path.join(root, "pnpm-workspace.yaml");
	if (!fs.existsSync(workspaceFile)) {
		throw new Error(
			`${rootPackageJsonPath} is not a workspace: no ${workspaceFile}`,
		);
	}
	const manifest: unknown = parse(fs.readFileSync(workspaceFile, "utf8"));
	const packages =
		manifest && typeof manifest === "object" && "packages" in manifest
			? manifest.packages
			: undefined;
	if (
		!Array.isArray(packages) ||
		!packages.every((glob): glob is string => typeof glob === "string")
	) {
		throw new Error(`${workspaceFile} has no list of packages`);
	}
	return packages.map((glob) =>
		glob.startsWith("!")
			? `!${root}/${glob.slice(1)}/${suffix}`
			: `${root}/${glob}/${suffix}`,
	);
};

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
import { fileURLToPath } from "node:url";

// Top Level

/**
 * The repository root — three levels up from this module, which sits at
 * `dev/workspace/{src,dist}/`. Both the source and the built layout are the
 * same depth, so this holds whether it is imported from `src` under vitest or
 * from `dist` by a consumer.
 *
 * `fileURLToPath` rather than `new URL(...).pathname`: `pathname` is
 * percent-encoded, so a checkout under a path containing a space or a `#`
 * yields `%20`/`%23` and every derived path fails to resolve.
 *
 * `path.resolve` drops the trailing separator that URL resolution leaves on a
 * directory, which is what the previous `.slice(0, -1)` was doing by hand.
 */
export const getRootDir = (): string =>
	path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

export const getCacheDir = () => `${getRootDir()}/.cache`;

export const getTestResultsDir = () => `${getCacheDir()}/test-results`;

export const getDevDir = () => `${getRootDir()}/dev`;

export const getDemosDir = () => `${getRootDir()}/demos`;

export const getPackagesDir = () => `${getRootDir()}/packages`;

export const getNodeModulesDir = () => `${getRootDir()}/node_modules`;

// Dev

export const getConfigPkgDir = () => `${getDevDir()}/config`;

export const getScriptsPkgDir = () => `${getDevDir()}/scripts`;

// Demos

// `getClientExampleDir` and `getDappExampleDir` used to live here. Both
// `demos/client-example` and `demos/dapp-example` were removed from the
// repository, so the getters returned paths that no longer exist; neither had
// any remaining caller.

export const getClientExampleServerDir = () =>
	`${getDemosDir()}/client-example-server`;

export const getClientBundleExampleDir = () =>
	`${getDemosDir()}/client-bundle-example`;

// Packages

export const getAccountPkgDir = () => `${getPackagesDir()}/account`;

export const getApiPkgDir = () => `${getPackagesDir()}/api`;

export const getCliPkgDir = () => `${getPackagesDir()}/cli`;

export const getCommonPkgDir = () => `${getPackagesDir()}/common`;

export const getDatabasePkgDir = () => `${getPackagesDir()}/database`;

export const getDatasetsPkgDir = () => `${getPackagesDir()}/datasets`;

export const getDatasetsFsPkgDir = () => `${getPackagesDir()}/datasets-fs`;

export const getDotEnvPkgDir = () => `${getPackagesDir()}/dotenv`;

export const getEnvPkgDir = () => `${getPackagesDir()}/env`;

export const getFileServerPkgDir = () => `${getPackagesDir()}/file-server`;

export const getProcaptchaPkgDir = () => `${getPackagesDir()}/procaptcha`;

export const getProcaptchaBundlePkgDir = () =>
	`${getPackagesDir()}/procaptcha-bundle`;

export const getProcaptchaCommonPkgDir = () =>
	`${getPackagesDir()}/procaptcha-common`;

export const getProcaptchaFrictionlessPkgDir = () =>
	`${getPackagesDir()}/procaptcha-frictionless`;

export const getProcaptchaPoWPkgDir = () =>
	`${getPackagesDir()}/procaptcha-pow`;

export const getProcaptchaReactPkgDir = () =>
	`${getPackagesDir()}/procaptcha-react`;

export const getProviderPkgDir = () => `${getPackagesDir()}/provider`;

export const getServerPkgDir = () => `${getPackagesDir()}/server`;

export const getTypesPkgDir = () => `${getPackagesDir()}/types`;

export const getTypesDatabasePkgDir = () =>
	`${getPackagesDir()}/types-database`;

export const getTypesEnvPkgDir = () => `${getPackagesDir()}/types-env`;

export const getUtilPkgDir = () => `${getPackagesDir()}/util`;

export const getWidgetSkeletonPkgDir = () =>
	`${getPackagesDir()}/widget-skeleton`;

export const getLocalePkgDir = () => `${getPackagesDir()}/locale`;

/** The maximum number of directories, starting at cwd, that are inspected. */
export const WORKSPACE_ROOT_MAX_DEPTH = 5;

/**
 * The ambient state `findWorkspaceRoot` reads.
 *
 * Injected rather than reached for directly so the search can be exercised
 * against a synthetic tree. Replacing `node:fs` wholesale instead would either
 * touch the developer's real filesystem or swap out a module the rest of the
 * run depends on.
 */
export interface WorkspaceRootDeps {
	cwd: () => string;
	existsSync: (target: string) => boolean;
	readFileSync: (target: string) => string;
	warn: (message: string) => void;
}

const defaultDeps: WorkspaceRootDeps = {
	cwd: (): string => process.cwd(),
	existsSync: (target: string): boolean => fs.existsSync(target),
	readFileSync: (target: string): string => fs.readFileSync(target, "utf8"),
	warn: (message: string): void => console.warn(message),
};

/** The one field of a package.json this module cares about. */
interface NamedPackageJson {
	name?: unknown;
}

/**
 * Finds the workspace root directory (captcha-private)
 */
export const findWorkspaceRoot = (
	name?: string,
	deps: WorkspaceRootDeps = defaultDeps,
): string => {
	const currentDir = deps.cwd();
	const lintDirPattern = /(.+)\/captcha\/dev\/lint$/;
	const match = currentDir.match(lintDirPattern);
	const targetName = name || "@prosopo/captcha-private";

	if (match?.[1]) {
		return match[1];
	}

	const websitePath = path.join(currentDir, "packages", "prosopo-website");
	if (deps.existsSync(websitePath)) {
		return currentDir;
	}

	let dir = currentDir;

	for (let i = 0; i < WORKSPACE_ROOT_MAX_DEPTH; i++) {
		const packageJsonPath = path.join(dir, "package.json");

		if (deps.existsSync(packageJsonPath)) {
			try {
				// Deliberately shallow typing: this is an arbitrary file on disk,
				// so the only safe assumption is that `name`, if present, may be
				// anything. A malformed or unreadable package.json must not abort
				// the ascent — a directory higher up may still be the root.
				const packageJson: NamedPackageJson = JSON.parse(
					deps.readFileSync(packageJsonPath),
				);
				if (packageJson.name === targetName) {
					return dir;
				}
			} catch {
				// Continue if there's an error
			}
		}

		const parentDir = path.dirname(dir);
		if (parentDir === dir) {
			// We've reached the root of the filesystem
			break;
		}

		dir = parentDir;
	}

	// If all approaches fail, warn but return current directory
	deps.warn("Warning: Could not find workspace root. Using current directory.");
	return currentDir;
};

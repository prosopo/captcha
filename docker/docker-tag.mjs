#!/usr/bin/env node
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

// Prints the docker tag for the package in the current working directory.
//
// This used to be an inline `node -e` one-liner duplicated into every image's
// package.json. The copies drifted — some appended a NODE_ENV suffix and some
// did not — which is exactly the sort of divergence that ends with a staging
// build pushed over a production tag. One implementation, called from every
// package, cannot drift.
//
// The repository name is derived from the package name so the image tag and
// the published package version can never disagree:
//
//   @prosopo/job-runner          -> prosopo/job-runner:<version>
//   @prosopo/ipinfo-docker       -> prosopo/ipinfo:<version>
//
// The `-docker` suffix strip is for the thin wrapper packages that exist only
// to build an image with no owning source package (caddy, vector, ipinfo).
//
// Where the image name cannot be derived from the package name, the owning
// package sets it explicitly:
//
//   "prosopo": { "dockerImage": "prosopo/provider" }
//
// @prosopo/cli needs this: it bundles the provider CLI, so the image has
// always been published as prosopo/provider at @prosopo/cli's version. That
// used to be enforced by an `npm pkg set version` step copying cli's version
// into a wrapper package on every release. Deriving both from cli directly
// removes the step, and the chance of it being skipped.
//
// NODE_ENV is appended as a tag suffix for anything other than production, so
// a staging build produces `prosopo/job-runner:3.1.47-staging` and can never
// collide with the production tag of the same version.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Exported so the bake driver derives image names the same way this script
// does. Two implementations of this mapping is exactly the drift that made
// the inline one-liners a problem.
export const dockerRepository = (manifest) =>
	manifest.prosopo?.dockerImage ??
	manifest.name.replace(/^@/, "").replace(/-docker$/, "");

export const tagSuffix = (nodeEnv) =>
	nodeEnv && nodeEnv !== "production" ? `-${nodeEnv}` : "";

// Only print when run as a script, not when imported for the helpers above.
if (process.argv[1] === import.meta.filename) {
	const manifestPath = resolve(process.cwd(), "package.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const tag = `${dockerRepository(manifest)}:${manifest.version}${tagSuffix(process.env.NODE_ENV)}`;
	process.stdout.write(`${tag}\n`);
}

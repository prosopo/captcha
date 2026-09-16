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
const getWebpackConfig = require("@prosopo/config/webpack/webpack.config");
const fs = require("node:fs");
const path = require("node:path");

// Walk up for the install rather than assuming one two levels above this
// package. That assumption holds only when this repo is the workspace root; as
// a submodule of captcha-private the hoisted node_modules is a level higher
// again, so both aliases below pointed at a directory that does not exist and
// every @polkadot/util copy failed to resolve them.
const packageDir = (name) => {
	let dir = __dirname;
	for (;;) {
		const candidate = path.join(dir, "node_modules", name);
		if (fs.existsSync(candidate)) {
			return candidate;
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			throw new Error(
				`Cannot find ${name} in any node_modules above ${__dirname}`,
			);
		}
		dir = parent;
	}
};

const args = process.argv.slice(2);
const mode =
	args.indexOf("--mode") > -1
		? args[args.indexOf("--mode") + 1]
		: "development";
const webpackConfig = getWebpackConfig(mode);

const bundleWebpackConfig = {
	...webpackConfig,
	resolve: {
		...webpackConfig.resolve,
		// The shared config pins resolve.modules to this package's own
		// node_modules, which switches off the upward walk, so everything
		// hoisted to the workspace root goes missing. This used to be papered
		// over by listing every node_modules directory in the repo, which then
		// made each nested install a global resolution root -- a transitive
		// copy such as @noble/curves' own @noble/hashes could satisfy a bare
		// `@noble/hashes/sha256` and fail on its exports map. The bare string
		// is webpack's default: walk up from the importer, exactly as node
		// does. The two aliases below are the only deliberate deviation.
		modules: ["node_modules"],
		alias: {
			"@polkadot/x-textdecoder": packageDir("@polkadot/x-textdecoder"),
			"@polkadot/x-textencoder": packageDir("@polkadot/x-textencoder"),
		},
	},
	externals: {
		...webpackConfig.externals,
		"node:crypto": "commonjs crypto",
		"node:util": "commonjs util",
	},
};

module.exports = bundleWebpackConfig;

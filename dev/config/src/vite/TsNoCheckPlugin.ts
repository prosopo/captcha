// Copyright 2021-2024 Prosopo (UK) Ltd.
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
export function tsNoCheckPlugin() {
	return {
		name: "vite-plugin-ts-nocheck",
		// biome-ignore lint/suspicious/noExplicitAny: TODO not sure of options/bundle type (same as NodejsPolarsNativeFilePlugin)
		generateBundle(_: any, bundle: any) {
			for (const fileName in bundle) {
				const chunk = bundle[fileName];
				if (chunk.type === "chunk" && chunk.code) {
					chunk.code = `// @ts-nocheck\n${chunk.code}`;
				}
			}
		},
	};
}

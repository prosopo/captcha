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

import { defineConfig } from "vite";

// The widget imports the detector from a blob URL, so it must be one
// self-contained ES module with no imports of its own.
export default defineConfig({
	build: {
		lib: {
			entry: "src/detector.ts",
			formats: ["es"],
			fileName: () => "detector.js",
		},
		outDir: "dist/bundle",
		emptyOutDir: true,
		target: "es2020",
	},
});

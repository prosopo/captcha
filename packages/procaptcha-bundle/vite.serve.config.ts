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

// vite.config.js
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const certPath = path.resolve(__dirname, "../../certs");
const keyPath = path.join(certPath, "server.key");
const crtPath = path.join(certPath, "server.crt");

// Check if certificates exist
const useTls = fs.existsSync(keyPath) && fs.existsSync(crtPath);

export default defineConfig({
	server: {
		port: 9269,
		host: true,
		cors: true,
		https: useTls
			? {
					key: fs.readFileSync(keyPath),
					cert: fs.readFileSync(crtPath),
				}
			: undefined,
		watch: {
			// Ensure the dev server watches the `dist/bundle` public directory so
			// changes there trigger a full reload.
			ignored: ["**/node_modules/**", "**/.git/**"],
		},
	},
	// Change the default public directory if needed
	publicDir: "dist/bundle", // assets in the "assets" folder at the project root will be served
});

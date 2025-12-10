import { resolve } from "node:path";
import { loadEnv } from "@prosopo/dotenv";
import react from "@vitejs/plugin-react";
// Copyright 2021-2025 Prosopo (UK) Ltd.
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

loadEnv();

export default defineConfig({
	plugins: [react()],
	root: ".",
	base: "/",
	server: {
		port: 9233,
		host: true,
		cors: true,
	},
	preview: {
		port: 9233,
	},
	build: {
		outDir: "dist/frontend",
		emptyOutDir: true,
		sourcemap: true,
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
	optimizeDeps: {
		exclude: ["@prosopo/dotenv"],
	},
	define: {
		"import.meta.env.VITE_PROSOPO_SITE_KEY": JSON.stringify(
			process.env.PROSOPO_SITE_KEY ||
				"5GCP69mhanZqJqnTvaaGvJCJZWSahz6xE2c7bTGETqSB5KDK",
		),
		"import.meta.env.VITE_API_URL": JSON.stringify(
			process.env.API_URL || "http://localhost:9234",
		),
		"import.meta.env.VITE_RENDER_SCRIPT_URL": JSON.stringify(
			process.env.VITE_RENDER_SCRIPT_URL ||
				"http://localhost:9269/procaptcha.bundle.js?renderExplicit=explicit",
		),
		"import.meta.env.VITE_RENDER_SCRIPT_ID": JSON.stringify(
			process.env.VITE_RENDER_SCRIPT_ID || "procaptcha-script",
		),
	},
	css: {
		postcss: "./postcss.config.js",
	},
});

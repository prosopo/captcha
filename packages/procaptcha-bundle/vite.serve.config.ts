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

// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 9269,
		host: true,
		cors: true,
	},
	// Change the default public directory if needed
	publicDir: "dist/bundle", // assets in the "assets" folder at the project root will be served
});

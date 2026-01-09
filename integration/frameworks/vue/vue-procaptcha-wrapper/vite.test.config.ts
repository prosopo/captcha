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

import { ViteTestConfig } from "@prosopo/config";
import vue from "@vitejs/plugin-vue";

export default function () {
    const config = ViteTestConfig();
    config.plugins = [...(config.plugins || []), vue()];
    config.test = config.test || {};
    config.test.environment = "jsdom";

    // Override coverage configuration for this integration package
    config.test.coverage = {
        enabled: true,
        include: ["src/**/*.ts", "src/**/*.vue"],
        exclude: [
            "src/**/*.test.ts",
            "src/**/*.test.vue",
            "src/**/*.spec.ts",
            "src/**/*.spec.vue",
            "**/node_modules/**",
            "**/dist/**"
        ],
        reporter: ["text", "html", "lcov"]
    };

    return config;
}

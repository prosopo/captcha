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

import { getPair } from "@prosopo/keyring";
import type { ProsopoServerConfigOutput } from "@prosopo/types";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProsopoServer } from "../server.js";

describe("ProsopoServer Integration Tests", () => {
	let container: StartedTestContainer;
	let mockProviderUrl: string;
	let server: ProsopoServer;

	const mockConfig: ProsopoServerConfigOutput = {
		defaultEnvironment: "development",
		serverUrl: "http://localhost:9228",
		dappName: "test-app",
		account: {
			password: "",
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			secret: "0x1234567890abcdef",
		},
		logLevel: "info",
		web2: true,
		solutionThreshold: 80,
		timeouts: {
			image: {
				challengeTimeout: 30000,
				solutionTimeout: 300000,
				verifiedTimeout: 300000,
				cachedTimeout: 300000,
			},
			pow: {
				verifiedTimeout: 600000,
				solutionTimeout: 600000,
				cachedTimeout: 600000,
			},
			contract: {
				maxVerifiedTime: 86400000,
			},
		},
	};

	beforeAll(async () => {
		// Start a simple HTTP server using testcontainers
		// Using a basic nginx setup that serves static content
		container = await new GenericContainer("nginx:alpine")
			.withCopyContentToContainer([
				{
					content: `
<!DOCTYPE html>
<html>
<head>
    <title>Mock Provider</title>
</head>
<body>
    <h1>Mock Provider API</h1>
    <div id="content">
        Mock provider response
    </div>
</body>
</html>
					`,
					target: "/usr/share/nginx/html/index.html",
				},
			])
			.withExposedPorts(80)
			.start();

		mockProviderUrl = `http://localhost:${container.getMappedPort(80)}`;

		// Create server instance
		const pair = getPair(undefined, mockConfig.account.address);
		server = new ProsopoServer(mockConfig, pair);
	}, 60000); // Increase timeout for container startup

	afterAll(async () => {
		if (container) {
			await container.stop();
		}
	});

	describe("HTTP connectivity", () => {
		it("container is running and nginx serves content", async () => {
			// Test that our test container is properly set up and nginx is serving
			const response = await fetch(mockProviderUrl);
			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Mock Provider API");
		});
	});

	describe("getProviderApi", () => {
		it("creates ProviderApi instance with correct URL", () => {
			// Test that the getProviderApi method creates a proper API instance
			const api = server.getProviderApi(mockProviderUrl);
			expect(api).toBeDefined();
			expect(api).toHaveProperty("account", mockConfig.account.address);
		});

		it("handles different provider URLs", () => {
			// Test getProviderApi with various URLs
			const testUrls = [
				"http://provider1.example.com",
				"https://provider2.example.com:8080",
				"http://localhost:3000/api",
			];

			for (const url of testUrls) {
				const api = server.getProviderApi(url);
				expect(api).toBeDefined();
				expect(api).toHaveProperty("account", mockConfig.account.address);
			}
		});
	});

	describe("server configuration", () => {
		it("initializes with correct config values", () => {
			// Test that server is properly initialized with config
			expect(server.config).toBe(mockConfig);
			expect(server.dappAccount).toBe(mockConfig.account.address);
			expect(server.defaultEnvironment).toBe(mockConfig.defaultEnvironment);
		});

		it("has required methods and properties", () => {
			// Test that server instance has all required methods
			expect(server).toHaveProperty("verifyProvider");
			expect(server).toHaveProperty("isVerified");
			expect(server).toHaveProperty("getProviderApi");
			expect(server).toHaveProperty("config");
			expect(server).toHaveProperty("pair");
			expect(server).toHaveProperty("dappAccount");
		});
	});
});

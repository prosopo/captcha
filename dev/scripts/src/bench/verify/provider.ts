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

import { type ChildProcess, spawn } from "node:child_process";
import { createWriteStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { BENCH_PORTS } from "./stack.js";

export const BENCH_DATABASE = "prosopo_bench";

export type BenchEnvTarget = "proxied" | "direct";

/**
 * The provider's environment for the bench: the checked-in test env with its
 * stores pointed at the bench stack. The provider process talks to the
 * proxied ports so injected latency applies to it; the bench itself seeds
 * data over the direct ports so seeding is never slowed down.
 */
export const benchEnv = (
	repoRoot: string,
	target: BenchEnvTarget,
): Record<string, string> => {
	const base = dotenv.parse(
		readFileSync(path.join(repoRoot, "dev", "scripts", "env.test")),
	);
	const proxied = target === "proxied";
	return {
		...base,
		NODE_ENV: "test",
		PROSOPO_LOG_LEVEL: "info",
		PROSOPO_API_PORT: String(BENCH_PORTS.provider),
		PROSOPO_DATABASE_HOST: "127.0.0.1",
		PROSOPO_DATABASE_PORT: String(
			proxied ? BENCH_PORTS.mongoProxied : BENCH_PORTS.mongoDirect,
		),
		PROSOPO_DATABASE_NAME: BENCH_DATABASE,
		PROSOPO_DATABASE_AUTH_SOURCE: "admin",
		PROSOPO_MONGO_CAPTCHA_URI: "",
		REDIS_CONNECTION_URL: `redis://127.0.0.1:${
			proxied ? BENCH_PORTS.redisProxied : BENCH_PORTS.redisDirect
		}`,
		REDIS_CONNECTION_PASSWORD: "root",
		PROSOPO_IPAPI_URL: `http://127.0.0.1:${BENCH_PORTS.ipapiProxied}`,
		// Schedulers would add background Mongo traffic to the op counts.
		CAPTCHA_STORAGE_SCHEDULE: "",
		CLIENT_LIST_SCHEDULE: "",
		CLIENT_ENTROPY_SCHEDULE: "",
		SPAM_EMAIL_DOMAINS_SCHEDULE: "",
	};
};

export class BenchProvider {
	private child: ChildProcess | undefined;

	constructor(
		private readonly repoRoot: string,
		private readonly logFile: string,
	) {}

	// The provider serves https whenever the repo has dev certs (see
	// setup_certs.sh), and those certs are self-signed.
	private get tls(): boolean {
		const certs = path.join(this.repoRoot, "certs");
		return (
			existsSync(path.join(certs, "server.crt")) &&
			existsSync(path.join(certs, "server.key"))
		);
	}

	get url(): string {
		return `${this.tls ? "https" : "http"}://localhost:${BENCH_PORTS.provider}`;
	}

	async start(): Promise<void> {
		if (this.tls) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		const cliDir = path.join(this.repoRoot, "packages", "cli");
		const log = createWriteStream(this.logFile, { flags: "a" });
		this.child = spawn(process.execPath, ["./dist/cli.js", "--api"], {
			cwd: cliDir,
			env: { ...process.env, ...benchEnv(this.repoRoot, "proxied") },
			stdio: ["ignore", "pipe", "pipe"],
		});
		this.child.stdout?.pipe(log);
		this.child.stderr?.pipe(log);
		const exited = new Promise<never>((_, reject) =>
			this.child?.once("exit", (code) =>
				reject(
					new Error(
						`provider exited with code ${code} during startup; see ${this.logFile}`,
					),
				),
			),
		);
		await Promise.race([this.waitHealthy(), exited]);
	}

	private async waitHealthy(): Promise<void> {
		const deadline = Date.now() + 60_000;
		while (Date.now() < deadline) {
			try {
				const response = await fetch(`${this.url}/healthz`);
				if (response.ok) return;
			} catch {
				// not listening yet
			}
			await new Promise((resolve) => setTimeout(resolve, 250));
		}
		throw new Error(`provider did not become healthy; see ${this.logFile}`);
	}

	async stop(): Promise<void> {
		const child = this.child;
		if (!child || child.exitCode !== null) return;
		await new Promise<void>((resolve) => {
			child.once("exit", () => resolve());
			child.kill("SIGTERM");
		});
	}
}

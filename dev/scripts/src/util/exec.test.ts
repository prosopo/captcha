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

import { spawn } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exec } from "./exec.js";

vi.mock("node:child_process");
vi.mock("node:process", () => ({
	stdin: {
		pipe: vi.fn(),
	},
}));

describe("exec", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		console.log = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should execute command and return success output", async () => {
		const mockSpawn = {
			stdout: {
				on: vi.fn((event, callback) => {
					if (event === "data") {
						setTimeout(() => callback(Buffer.from("stdout data")), 0);
					}
				}),
				pipe: vi.fn(),
			},
			stderr: {
				on: vi.fn((event, callback) => {
					if (event === "data") {
						setTimeout(() => callback(Buffer.from("stderr data")), 0);
					}
				}),
				pipe: vi.fn(),
			},
			on: vi.fn((event, callback) => {
				if (event === "close") {
					setTimeout(() => callback(0), 10);
				}
			}),
		};

		vi.mocked(spawn).mockReturnValue(mockSpawn as any);

		const result = await exec("echo test");

		expect(spawn).toHaveBeenCalledWith("echo test", { shell: true });
		expect(result).toEqual({
			stdout: "stdout data",
			stderr: "stderr data",
			code: 0,
		});
	});

	it("should reject on non-zero exit code", async () => {
		const mockSpawn = {
			stdout: {
				on: vi.fn((event, callback) => {
					if (event === "data") {
						setTimeout(() => callback(Buffer.from("stdout")), 0);
					}
				}),
				pipe: vi.fn(),
			},
			stderr: {
				on: vi.fn((event, callback) => {
					if (event === "data") {
						setTimeout(() => callback(Buffer.from("error")), 0);
					}
				}),
				pipe: vi.fn(),
			},
			on: vi.fn((event, callback) => {
				if (event === "close") {
					setTimeout(() => callback(1), 10);
				}
			}),
		};

		vi.mocked(spawn).mockReturnValue(mockSpawn as any);

		await expect(exec("false")).rejects.toEqual({
			stdout: "stdout",
			stderr: "error",
			code: 1,
		});
	});

	it("should print command when printCmd is true (default)", async () => {
		const mockSpawn = {
			stdout: {
				on: vi.fn((event, callback) => {
					if (event === "data") {
						setTimeout(() => callback(Buffer.from("")), 0);
					}
				}),
				pipe: vi.fn(),
			},
			stderr: {
				on: vi.fn(),
				pipe: vi.fn(),
			},
			on: vi.fn((event, callback) => {
				if (event === "close") {
					setTimeout(() => callback(0), 10);
				}
			}),
		};

		vi.mocked(spawn).mockReturnValue(mockSpawn as any);

		await exec("test command");

		expect(console.log).toHaveBeenCalledWith("[exec] test command");
	});

	it("should not print command when printCmd is false", async () => {
		const mockSpawn = {
			stdout: {
				on: vi.fn((event, callback) => {
					if (event === "data") {
						setTimeout(() => callback(Buffer.from("")), 0);
					}
				}),
				pipe: vi.fn(),
			},
			stderr: {
				on: vi.fn(),
				pipe: vi.fn(),
			},
			on: vi.fn((event, callback) => {
				if (event === "close") {
					setTimeout(() => callback(0), 10);
				}
			}),
		};

		vi.mocked(spawn).mockReturnValue(mockSpawn as any);

		await exec("test command", { printCmd: false });

		expect(console.log).not.toHaveBeenCalledWith("[exec] test command");
	});

	it("should pipe stdout and stderr when pipe is true (default)", async () => {
		const mockStdout = {
			on: vi.fn(),
			pipe: vi.fn(),
		};
		const mockStderr = {
			on: vi.fn(),
			pipe: vi.fn(),
		};
		const mockSpawn = {
			stdout: mockStdout,
			stderr: mockStderr,
			on: vi.fn((event, callback) => {
				if (event === "close") {
					setTimeout(() => callback(0), 10);
				}
			}),
		};

		vi.mocked(spawn).mockReturnValue(mockSpawn as any);

		await exec("test", { pipe: true });

		expect(mockStdout.pipe).toHaveBeenCalled();
		expect(mockStderr.pipe).toHaveBeenCalled();
	});

	it("should not pipe stdout and stderr when pipe is false", async () => {
		const mockStdout = {
			on: vi.fn(),
			pipe: vi.fn(),
		};
		const mockStderr = {
			on: vi.fn(),
			pipe: vi.fn(),
		};
		const mockSpawn = {
			stdout: mockStdout,
			stderr: mockStderr,
			on: vi.fn((event, callback) => {
				if (event === "close") {
					setTimeout(() => callback(0), 10);
				}
			}),
		};

		vi.mocked(spawn).mockReturnValue(mockSpawn as any);

		await exec("test", { pipe: false });

		expect(mockStdout.pipe).not.toHaveBeenCalled();
		expect(mockStderr.pipe).not.toHaveBeenCalled();
	});

	it("should accumulate multiple stdout chunks", async () => {
		const chunks: Buffer[] = [];
		const mockSpawn = {
			stdout: {
				on: vi.fn((event, callback) => {
					if (event === "data") {
						chunks.push(Buffer.from("chunk1"));
						chunks.push(Buffer.from("chunk2"));
						setTimeout(() => {
							chunks.forEach((chunk) => callback(chunk));
						}, 0);
					}
				}),
				pipe: vi.fn(),
			},
			stderr: {
				on: vi.fn(),
				pipe: vi.fn(),
			},
			on: vi.fn((event, callback) => {
				if (event === "close") {
					setTimeout(() => callback(0), 10);
				}
			}),
		};

		vi.mocked(spawn).mockReturnValue(mockSpawn as any);

		const result = await exec("test");

		expect(result.stdout).toBe("chunk1chunk2");
	});
});

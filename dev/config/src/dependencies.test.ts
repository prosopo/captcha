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

import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExec = vi.hoisted(() => vi.fn());

vi.mock("node:fs");
vi.mock("node:child_process", () => ({
    default: {
        exec: mockExec,
    },
}));

vi.mock("node:util", async () => {
    const actual = await vi.importActual<typeof import("node:util")>("node:util");
    return {
        ...actual,
        promisify: vi.fn((fn) => {
            return (...args: unknown[]) => {
                return new Promise((resolve, reject) => {
                    const callback = args[args.length - 1] as (
                        error: Error | null,
                        stdout: unknown,
                        stderr: unknown,
                    ) => void;
                    mockExec(
                        args[0],
                        (error: Error | null, stdout: unknown, stderr: unknown) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve({ stdout, stderr });
                            }
                        },
                    );
                });
            };
        }),
    };
});

import {
    filterDependencies,
    getDependencies,
    getExternalsFromReferences,
    getTsConfigs,
} from "./dependencies.js";

describe("getTsConfigs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return empty array when tsconfig has no references", () => {
        const mockTsConfig = { references: undefined };
        vi.spyOn(fs, "readFileSync").mockReturnValue(
            JSON.stringify(mockTsConfig) as unknown as Buffer,
        );

        const result = getTsConfigs("/path/to/tsconfig.json", [], [], true);

        expect(result).toEqual([]);
    });

    it("should include initial tsconfig when includeInitialTsConfig is true", () => {
        const mockTsConfig = { references: [] };
        vi.spyOn(fs, "readFileSync").mockReturnValue(
            JSON.stringify(mockTsConfig) as unknown as Buffer,
        );

        const result = getTsConfigs("/path/to/tsconfig.json", [], [], true);

        expect(result).toEqual(["/path/to/tsconfig.json"]);
    });

    it("should not include initial tsconfig when includeInitialTsConfig is false", () => {
        const mockTsConfig = { references: [] };
        vi.spyOn(fs, "readFileSync").mockReturnValue(
            JSON.stringify(mockTsConfig) as unknown as Buffer,
        );

        const result = getTsConfigs("/path/to/tsconfig.json", [], [], false);

        expect(result).toEqual([]);
    });

    it("should recursively get tsconfigs from references", () => {
        const mockTsConfig = {
            references: [{ path: "../package1" }, { path: "../package2" }],
        };
        const mockRefTsConfig1 = { references: [] };
        const mockRefTsConfig2 = { references: [] };

        vi.spyOn(fs, "readFileSync").mockImplementation(
            (filePath: fs.PathOrFileDescriptor) => {
                const pathStr =
                    typeof filePath === "string" ? filePath : filePath.toString();
                if (pathStr.includes("package1")) {
                    return JSON.stringify(mockRefTsConfig1) as unknown as Buffer;
                }
                if (pathStr.includes("package2")) {
                    return JSON.stringify(mockRefTsConfig2) as unknown as Buffer;
                }
                return JSON.stringify(mockTsConfig) as unknown as Buffer;
            },
        );

        const result = getTsConfigs("/path/to/tsconfig.json", [], [], true);

        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain("/path/to/tsconfig.json");
    });

    it("should filter out ignored patterns", () => {
        const mockTsConfig = {
            references: [{ path: "../package1" }, { path: "../ignored" }],
        };
        const mockRefTsConfig = { references: [] };
        const ignorePatterns = [/ignored/];

        vi.spyOn(fs, "readFileSync").mockImplementation(
            (filePath: fs.PathOrFileDescriptor) => {
                const pathStr =
                    typeof filePath === "string" ? filePath : filePath.toString();
                if (pathStr.includes("package1") && pathStr.endsWith(".json")) {
                    return JSON.stringify(mockRefTsConfig) as unknown as Buffer;
                }
                if (pathStr.includes("ignored") && pathStr.endsWith(".json")) {
                    return JSON.stringify(mockRefTsConfig) as unknown as Buffer;
                }
                return JSON.stringify(mockTsConfig) as unknown as Buffer;
            },
        );

        const result = getTsConfigs(
            "/path/to/tsconfig.json",
            ignorePatterns,
            [],
            true,
        );

        expect(result).toContain("/path/to/tsconfig.json");
        const ignoredPaths = result.filter((p) => p.includes("ignored"));
        expect(ignoredPaths.length).toBe(0);
    });

    it("should handle references with tsconfig.json extension", () => {
        const mockTsConfig = {
            references: [{ path: "../package1/tsconfig.json" }],
        };
        const mockRefTsConfig = { references: [] };

        vi.spyOn(fs, "readFileSync").mockImplementation(
            (filePath: fs.PathOrFileDescriptor) => {
                const pathStr =
                    typeof filePath === "string" ? filePath : filePath.toString();
                if (pathStr.includes("package1")) {
                    return JSON.stringify(mockRefTsConfig) as unknown as Buffer;
                }
                return JSON.stringify(mockTsConfig) as unknown as Buffer;
            },
        );

        const result = getTsConfigs("/path/to/tsconfig.json", [], [], true);

        expect(result.length).toBeGreaterThan(0);
    });

    it("should append tsconfig.json when reference path doesn't end with .json", () => {
        const mockTsConfig = {
            references: [{ path: "../package1" }],
        };
        const mockRefTsConfig = { references: [] };

        vi.spyOn(fs, "readFileSync").mockImplementation((filePath: string) => {
            if (filePath.includes("package1") && filePath.endsWith(".json")) {
                return JSON.stringify(mockRefTsConfig) as unknown as Buffer;
            }
            return JSON.stringify(mockTsConfig) as unknown as Buffer;
        });

        const result = getTsConfigs("/path/to/tsconfig.json", [], [], true);

        expect(result.length).toBeGreaterThan(0);
    });

    it("should avoid duplicates in tsconfig paths", () => {
        const mockTsConfig = {
            references: [{ path: "../package1" }],
        };
        const mockRefTsConfig = {
            references: [{ path: "../../package1" }],
        };

        vi.spyOn(fs, "readFileSync").mockImplementation(
            (filePath: fs.PathOrFileDescriptor) => {
                const pathStr =
                    typeof filePath === "string" ? filePath : filePath.toString();
                if (pathStr.includes("package1")) {
                    return JSON.stringify(mockRefTsConfig) as unknown as Buffer;
                }
                return JSON.stringify(mockTsConfig) as unknown as Buffer;
            },
        );

        const result = getTsConfigs("/path/to/tsconfig.json", [], [], true);
        const uniqueResults = new Set(result);

        expect(result.length).toBe(uniqueResults.size);
    });
});

describe("getExternalsFromReferences", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return empty array when no references exist", async () => {
        const mockTsConfig = { references: undefined };
        vi.spyOn(fs, "readFileSync").mockReturnValue(
            JSON.stringify(mockTsConfig) as unknown as Buffer,
        );

        const result = await getExternalsFromReferences("/path/to/tsconfig.json");

        expect(result).toEqual([]);
    });

    it("should extract package names from referenced package.json files", async () => {
        const mockTsConfig = {
            references: [{ path: "../package1" }],
        };
        const mockRefTsConfig = { references: [] };
        const mockPackageJson1 = { name: "@prosopo/package1" };

        let callCount = 0;
        vi.spyOn(fs, "readFileSync").mockImplementation(
            (filePath: fs.PathOrFileDescriptor) => {
                callCount++;
                const pathStr =
                    typeof filePath === "string" ? filePath : filePath.toString();
                if (
                    pathStr.includes("package1") &&
                    pathStr.endsWith(".json") &&
                    callCount > 1
                ) {
                    return JSON.stringify(mockRefTsConfig) as unknown as Buffer;
                }
                return JSON.stringify(mockTsConfig) as unknown as Buffer;
            },
        );

        vi.spyOn(fs, "stat").mockImplementation(
            ((filePath: fs.PathLike, callback: (err: NodeJS.ErrnoException | null, stats: fs.Stats) => void) => {
                setImmediate(() => callback(null, {} as fs.Stats));
                return {} as fs.Stats;
            }) as typeof fs.stat,
        );

        vi.spyOn(fs, "readFile").mockImplementation(
            (
                filePath,
                callback: (err: NodeJS.ErrnoException | null, data: Buffer) => void,
            ) => {
                if (filePath.toString().includes("package1")) {
                    setImmediate(() =>
                        callback(null, Buffer.from(JSON.stringify(mockPackageJson1))),
                    );
                } else {
                    setImmediate(() => callback(null, Buffer.from("{}")));
                }
                return {} as fs.ReadStream;
            },
        );

        const result = await getExternalsFromReferences("/path/to/tsconfig.json");

        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain("@prosopo/package1");
    });

    it("should handle errors when package.json doesn't exist", async () => {
        const mockTsConfig = {
            references: [{ path: "../package1" }],
        };
        const mockRefTsConfig = { references: [] };

        let callCount = 0;
        vi.spyOn(fs, "readFileSync").mockImplementation(
            (filePath: fs.PathOrFileDescriptor) => {
                callCount++;
                const pathStr =
                    typeof filePath === "string" ? filePath : filePath.toString();
                if (
                    pathStr.includes("package1") &&
                    pathStr.endsWith(".json") &&
                    callCount > 1
                ) {
                    return JSON.stringify(mockRefTsConfig) as unknown as Buffer;
                }
                return JSON.stringify(mockTsConfig) as unknown as Buffer;
            },
        );

        vi.spyOn(fs, "stat").mockImplementation(
            ((filePath: fs.PathLike, callback: (err: NodeJS.ErrnoException | null, stats: fs.Stats) => void) => {
                const error = new Error("File not found");
                setImmediate(() => callback(error, {} as fs.Stats));
                return {} as fs.Stats;
            }) as typeof fs.stat,
        );

        await expect(
            getExternalsFromReferences("/path/to/tsconfig.json"),
        ).rejects.toThrow();
    });

    it("should filter out ignored patterns", async () => {
        const mockTsConfig = {
            references: [{ path: "../package1" }, { path: "../ignored" }],
        };
        const mockRefTsConfig = { references: [] };
        const mockPackageJson1 = { name: "@prosopo/package1" };

        let callCount = 0;
        vi.spyOn(fs, "readFileSync").mockImplementation((filePath: string) => {
            callCount++;
            if (
                filePath.includes("package1") &&
                filePath.endsWith(".json") &&
                callCount > 1
            ) {
                return JSON.stringify(mockRefTsConfig) as unknown as Buffer;
            }
            if (
                filePath.includes("ignored") &&
                filePath.endsWith(".json") &&
                callCount > 1
            ) {
                return JSON.stringify(mockRefTsConfig) as unknown as Buffer;
            }
            return JSON.stringify(mockTsConfig) as unknown as Buffer;
        });

        vi.spyOn(fs, "stat").mockImplementation(
            ((filePath: fs.PathLike, callback: (err: NodeJS.ErrnoException | null, stats: fs.Stats) => void) => {
                if (filePath.toString().includes("package1")) {
                    setImmediate(() => callback(null, {} as fs.Stats));
                }
                return {} as fs.Stats;
            }) as typeof fs.stat,
        );

        vi.spyOn(fs, "readFile").mockImplementation(
            (
                filePath,
                callback: (err: NodeJS.ErrnoException | null, data: Buffer) => void,
            ) => {
                if (filePath.toString().includes("package1")) {
                    setImmediate(() =>
                        callback(null, Buffer.from(JSON.stringify(mockPackageJson1))),
                    );
                }
                return {} as fs.ReadStream;
            },
        );

        const result = await getExternalsFromReferences("/path/to/tsconfig.json", [
            /ignored/,
        ]);

        expect(result).toContain("@prosopo/package1");
        expect(result.some((p) => p.includes("ignored"))).toBe(false);
    });
});

describe("getDependencies", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should parse dependencies from npm ls output", async () => {
        const mockStdout = `
  │ │ │ ├─┬ package1@1.0.0
  │ │ │ ├─┬ package2@2.0.0
		`;
        const mockStderr = "";

        mockExec.mockImplementation((command, callback) => {
            if (typeof callback === "function") {
                callback(null, { stdout: mockStdout, stderr: mockStderr } as never, "");
            }
            return {} as never;
        });

        const result = await getDependencies();

        expect(result.dependencies).toContain("package1");
        expect(result.dependencies).toContain("package2");
    });

    it("should parse optional peer dependencies from npm ls output", async () => {
        const mockStdout = "";
        const mockStderr = `
  │ │ │   ├── UNMET OPTIONAL DEPENDENCY peer-dep@^1.0.0
		`;

        mockExec.mockImplementation((command, callback) => {
            if (typeof callback === "function") {
                callback(null, { stdout: mockStdout, stderr: mockStderr } as never, "");
            }
            return {} as never;
        });

        const result = await getDependencies();

        expect(result.optionalPeerDependencies).toContain("peer-dep");
    });

    it("should use production flag in command when production is true", async () => {
        mockExec.mockImplementation((command, callback) => {
            if (typeof callback === "function") {
                callback(null, { stdout: "", stderr: "" } as never, "");
            }
            return {} as never;
        });

        await getDependencies(undefined, true);

        expect(mockExec).toHaveBeenCalled();
        const callArgs = mockExec.mock.calls.find((call) =>
            call[0]?.toString().includes("npm ls"),
        )?.[0] as string;
        expect(callArgs).toContain("--omit=dev");
    });

    it("should use package directory when packageName is provided", async () => {
        mockExec.mockImplementation((command, callback) => {
            if (typeof callback === "function") {
                if (command.toString().includes("npm list")) {
                    callback(
                        null,
                        { stdout: "/path/to/package", stderr: "" } as never,
                        "",
                    );
                } else {
                    callback(null, { stdout: "", stderr: "" } as never, "");
                }
            }
            return {} as never;
        });

        await getDependencies("test-package", false);

        expect(mockExec).toHaveBeenCalled();
    });

    it("should add @prosopo/ prefix when packageName doesn't start with @prosopo/", async () => {
        mockExec.mockImplementation((command, callback) => {
            if (typeof callback === "function") {
                if (command.toString().includes("npm list")) {
                    callback(
                        null,
                        { stdout: "/path/to/package", stderr: "" } as never,
                        "",
                    );
                } else {
                    callback(null, { stdout: "", stderr: "" } as never, "");
                }
            }
            return {} as never;
        });

        await getDependencies("test-package", false);

        expect(mockExec).toHaveBeenCalled();
        const callArgs = mockExec.mock.calls.find((call) =>
            call[0]?.toString().includes("npm list"),
        )?.[0] as string;
        expect(callArgs).toContain("@prosopo/test-package");
    });

    it("should throw error when package directory is invalid", async () => {
        mockExec.mockImplementation((command, callback) => {
            if (typeof callback === "function") {
                if (command.toString().includes("npm list")) {
                    callback(null, { stdout: "", stderr: "ERR!" } as never, "");
                } else {
                    callback(null, { stdout: "", stderr: "" } as never, "");
                }
            }
            return {} as never;
        });

        await expect(getDependencies("invalid-package")).rejects.toThrow(
            "CONFIG.INVALID_PACKAGE_DIR",
        );
    });

    it("should deduplicate dependencies", async () => {
        const mockStdout = `
  │ │ │ ├─┬ package1@1.0.0
  │ │ │ ├─┬ package1@1.0.0
		`;
        const mockStderr = "";

        mockExec.mockImplementation((command, callback) => {
            if (typeof callback === "function") {
                callback(null, { stdout: mockStdout, stderr: mockStderr } as never, "");
            }
            return {} as never;
        });

        const result = await getDependencies();

        const package1Count = result.dependencies.filter(
            (d) => d === "package1",
        ).length;
        expect(package1Count).toBe(1);
    });

    it("should deduplicate optional peer dependencies", async () => {
        const mockStdout = "";
        const mockStderr = `
  │ │ │   ├── UNMET OPTIONAL DEPENDENCY peer-dep@^1.0.0
  │ │ │   ├── UNMET OPTIONAL DEPENDENCY peer-dep@^1.0.0
		`;

        mockExec.mockImplementation((command, callback) => {
            if (typeof callback === "function") {
                callback(null, { stdout: mockStdout, stderr: mockStderr } as never, "");
            }
            return {} as never;
        });

        const result = await getDependencies();

        const peerDepCount = result.optionalPeerDependencies.filter(
            (d) => d === "peer-dep",
        ).length;
        expect(peerDepCount).toBe(1);
    });

    it("should filter out empty dependencies", async () => {
        const mockStdout = `
  │ │ │ ├─┬ package1@1.0.0
  │ │ │ ├─┬ 
		`;
        const mockStderr = "";

        mockExec.mockImplementation((command, callback) => {
            if (typeof callback === "function") {
                callback(null, { stdout: mockStdout, stderr: mockStderr } as never, "");
            }
            return {} as never;
        });

        const result = await getDependencies();

        expect(result.dependencies.every((d) => d.length > 0)).toBe(true);
    });
});

describe("filterDependencies", () => {
    it("should separate internal and external dependencies based on filters", () => {
        const deps = [
            "@prosopo/package1",
            "@prosopo/package2",
            "external-package",
            "another-external",
        ];
        const filters = ["@prosopo/"];

        const result = filterDependencies(deps, filters);

        expect(result.external).toContain("@prosopo/package1");
        expect(result.external).toContain("@prosopo/package2");
        expect(result.internal).toContain("external-package");
        expect(result.internal).toContain("another-external");
    });

    it("should deduplicate dependencies", () => {
        const deps = ["package1", "package1", "package2"];
        const filters = ["package1"];

        const result = filterDependencies(deps, filters);

        const package1Count = result.external.filter(
            (d) => d === "package1",
        ).length;
        expect(package1Count).toBe(1);
    });

    it("should filter out empty dependencies", () => {
        const deps = ["package1", "", "package2", "   "];
        const filters = ["package1"];

        const result = filterDependencies(deps, filters);

        expect(result.internal.every((d) => d.length > 0)).toBe(true);
        expect(result.external.every((d) => d.length > 0)).toBe(true);
    });

    it("should sort dependencies", () => {
        const deps = ["z-package", "a-package", "m-package"];
        const filters = ["z-package"];

        const result = filterDependencies(deps, filters);

        expect(result.internal).toEqual(["a-package", "m-package"]);
        expect(result.external).toEqual(["z-package"]);
    });

    it("should handle multiple filter patterns", () => {
        const deps = ["@prosopo/package1", "@other/package2", "external-package"];
        const filters = ["@prosopo/", "@other/"];

        const result = filterDependencies(deps, filters);

        expect(result.external).toContain("@prosopo/package1");
        expect(result.external).toContain("@other/package2");
        expect(result.internal).toContain("external-package");
    });

    it("should handle empty dependencies array", () => {
        const deps: string[] = [];
        const filters = ["@prosopo/"];

        const result = filterDependencies(deps, filters);

        expect(result.internal).toEqual([]);
        expect(result.external).toEqual([]);
    });

    it("should handle empty filters array", () => {
        const deps = ["package1", "package2"];
        const filters: string[] = [];

        const result = filterDependencies(deps, filters);

        expect(result.external).toEqual(["package1", "package2"]);
        expect(result.internal).toEqual([]);
    });
});

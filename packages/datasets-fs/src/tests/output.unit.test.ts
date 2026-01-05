import fs from "node:fs";
import path from "node:path";
import { ProsopoEnvError, ProsopoError } from "@prosopo/common";
import { afterEach, describe, expect, test } from "vitest";
import { OutputArgsSchema, OutputCliCommand } from "../utils/output.js";

// Concrete implementation for testing
class TestOutputCommand extends OutputCliCommand<typeof OutputArgsSchema> {
	public override getArgSchema() {
		return OutputArgsSchema;
	}

	public override getDescription() {
		return "Test output command";
	}
}

describe("OutputCliCommand", () => {
	const testOutputDir = path.join(__dirname, "test_output");

	afterEach(() => {
		// Clean up test output directory
		if (fs.existsSync(testOutputDir)) {
			fs.rmSync(testOutputDir, { recursive: true });
		}
	});

	test("getOptions returns correct output options", () => {
		const command = new TestOutputCommand();
		const options = command.getOptions();
		expect(options.output).toBeDefined();
		expect(options.output.string).toBe(true);
		expect(options.output.alias).toBe("out");
		expect(options.output.demand).toBe(true);
		expect(options.output.description).toBe("The output path");
		expect(options.overwrite).toBeDefined();
		expect(options.overwrite.boolean).toBe(true);
		expect(options.overwrite.description).toContain("Overwrite");
	});

	test("outputExists returns false when output does not exist", () => {
		const command = new TestOutputCommand();
		expect(command.outputExists()).toBe(false);
	});

	test("_check passes when output does not exist", async () => {
		const command = new TestOutputCommand();
		const nonExistent = path.join(testOutputDir, "new_output");
		await expect(
			command._check({ output: nonExistent }),
		).resolves.not.toThrow();
		expect(command.outputExists()).toBe(false);
	});

	test("_check throws ProsopoEnvError when output exists and overwrite is false", async () => {
		const command = new TestOutputCommand();
		// Create a test file
		fs.mkdirSync(testOutputDir, { recursive: true });
		const existingFile = path.join(testOutputDir, "existing.json");
		fs.writeFileSync(existingFile, "{}");
		await expect(
			command._check({ output: existingFile, overwrite: false }),
		).rejects.toThrow(ProsopoEnvError);
		await expect(
			command._check({ output: existingFile, overwrite: false }),
		).rejects.toThrow("output path already exists");
		expect(command.outputExists()).toBe(true);
	});

	test("_check throws ProsopoEnvError with correct translation key", async () => {
		const command = new TestOutputCommand();
		fs.mkdirSync(testOutputDir, { recursive: true });
		const existingFile = path.join(testOutputDir, "existing.json");
		fs.writeFileSync(existingFile, "{}");
		try {
			await command._check({ output: existingFile, overwrite: false });
			expect.fail("Should have thrown");
		} catch (error) {
			if (error instanceof ProsopoEnvError) {
				expect(error.translationKey).toBe("FS.FILE_ALREADY_EXISTS");
			} else {
				expect.fail("Should have thrown ProsopoEnvError");
			}
		}
	});

	test("_check passes when output exists and overwrite is true", async () => {
		const command = new TestOutputCommand();
		fs.mkdirSync(testOutputDir, { recursive: true });
		const existingFile = path.join(testOutputDir, "existing.json");
		fs.writeFileSync(existingFile, "{}");
		await expect(
			command._check({ output: existingFile, overwrite: true }),
		).resolves.not.toThrow();
		expect(command.outputExists()).toBe(true);
	});

	test("_check passes when output exists and overwrite is undefined", async () => {
		const command = new TestOutputCommand();
		fs.mkdirSync(testOutputDir, { recursive: true });
		const existingFile = path.join(testOutputDir, "existing.json");
		fs.writeFileSync(existingFile, "{}");
		await expect(command._check({ output: existingFile })).rejects.toThrow(
			ProsopoEnvError,
		);
	});

	test("_run deletes output when overwrite is true and output exists", async () => {
		const command = new TestOutputCommand();
		fs.mkdirSync(testOutputDir, { recursive: true });
		const existingDir = path.join(testOutputDir, "existing_dir");
		fs.mkdirSync(existingDir);
		const testFile = path.join(existingDir, "test.txt");
		fs.writeFileSync(testFile, "test content");
		// First check to set outputExists flag
		await command._check({ output: existingDir, overwrite: true });
		expect(command.outputExists()).toBe(true);
		// Then run
		await command._run({ output: existingDir, overwrite: true });
		// Directory should be deleted
		expect(fs.existsSync(existingDir)).toBe(false);
	});

	test("_run does not delete output when overwrite is false", async () => {
		const command = new TestOutputCommand();
		fs.mkdirSync(testOutputDir, { recursive: true });
		const existingDir = path.join(testOutputDir, "existing_dir");
		fs.mkdirSync(existingDir);
		const testFile = path.join(existingDir, "test.txt");
		fs.writeFileSync(testFile, "test content");
		// First call _check with overwrite: true to set outputExists flag
		await command._check({ output: existingDir, overwrite: true });
		expect(command.outputExists()).toBe(true);
		// Then call _run with overwrite: false - should not delete
		await command._run({ output: existingDir, overwrite: false });
		// Directory should still exist
		expect(fs.existsSync(existingDir)).toBe(true);
		expect(fs.existsSync(testFile)).toBe(true);
	});

	test("_run does not delete output when output does not exist", async () => {
		const command = new TestOutputCommand();
		const nonExistent = path.join(testOutputDir, "new_output");
		await command._check({ output: nonExistent });
		expect(command.outputExists()).toBe(false);
		await command._run({ output: nonExistent });
		// Should not throw
		expect(fs.existsSync(nonExistent)).toBe(false);
	});

	test("getArgSchema throws ProsopoError when not implemented", () => {
		const command = new OutputCliCommand<typeof OutputArgsSchema>();
		expect(() => command.getArgSchema()).toThrow(ProsopoError);
		expect(() => command.getArgSchema()).toThrow(
			"DEVELOPER.METHOD_NOT_IMPLEMENTED",
		);
	});

	test("getDescription throws ProsopoError when not implemented", () => {
		const command = new OutputCliCommand<typeof OutputArgsSchema>();
		expect(() => command.getDescription()).toThrow(ProsopoError);
		expect(() => command.getDescription()).toThrow(
			"DEVELOPER.METHOD_NOT_IMPLEMENTED",
		);
	});

	test("types", () => {
		const command = new TestOutputCommand();
		// Type check: getOptions should return object with string keys
		const options: ReturnType<typeof command.getOptions> = command.getOptions();
		expect(typeof options).toBe("object");
		// Type check: outputExists should return boolean
		const exists: ReturnType<typeof command.outputExists> =
			command.outputExists();
		expect(typeof exists).toBe("boolean");
		// Type check: _check should accept OutputArgs
		const args: Parameters<typeof command._check>[0] = {
			output: "test",
			overwrite: true,
		};
		expect(args.output).toBe("test");
		expect(args.overwrite).toBe(true);
	});
});

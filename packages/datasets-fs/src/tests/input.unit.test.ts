import path from "node:path";
import { ProsopoDatasetError, ProsopoError } from "@prosopo/common";
import { describe, expect, test } from "vitest";
import { InputArgsSchema, InputCliCommand } from "../utils/input.js";

// Concrete implementation for testing
class TestInputCommand extends InputCliCommand<typeof InputArgsSchema> {
	public override getArgSchema() {
		return InputArgsSchema;
	}

	public override getDescription() {
		return "Test input command";
	}
}

describe("InputCliCommand", () => {
	test("getOptions returns correct input options", () => {
		const command = new TestInputCommand();
		const options = command.getOptions();
		expect(options.input).toBeDefined();
		expect(options.input.string).toBe(true);
		expect(options.input.alias).toBe("in");
		expect(options.input.demand).toBe(true);
		expect(options.input.description).toBe("The input path");
	});

	test("_check passes when input file exists", async () => {
		const command = new TestInputCommand();
		const testFile = path.join(__dirname, "data", "flat", "data.json");
		await expect(command._check({ input: testFile })).resolves.not.toThrow();
	});

	test("_check throws ProsopoDatasetError when input file does not exist", async () => {
		const command = new TestInputCommand();
		const nonExistent = path.join(__dirname, "nonexistent", "file.json");
		await expect(command._check({ input: nonExistent })).rejects.toThrow(
			ProsopoDatasetError,
		);
		await expect(command._check({ input: nonExistent })).rejects.toThrow(
			"input path does not exist",
		);
	});

	test("_check throws ProsopoDatasetError with correct translation key", async () => {
		const command = new TestInputCommand();
		const nonExistent = path.join(__dirname, "nonexistent", "file.json");
		try {
			await command._check({ input: nonExistent });
			expect.fail("Should have thrown");
		} catch (error) {
			if (error instanceof ProsopoDatasetError) {
				expect(error.translationKey).toBe("FS.FILE_NOT_FOUND");
			} else {
				expect.fail("Should have thrown ProsopoDatasetError");
			}
		}
	});

	test("_check passes when input directory exists", async () => {
		const command = new TestInputCommand();
		const testDir = path.join(__dirname, "data", "hierarchical");
		await expect(command._check({ input: testDir })).resolves.not.toThrow();
	});

	test("getArgSchema throws ProsopoError when not implemented", () => {
		const command = new InputCliCommand<typeof InputArgsSchema>();
		expect(() => command.getArgSchema()).toThrow(ProsopoError);
		expect(() => command.getArgSchema()).toThrow(
			"DEVELOPER.METHOD_NOT_IMPLEMENTED",
		);
	});

	test("getDescription throws ProsopoError when not implemented", () => {
		const command = new InputCliCommand<typeof InputArgsSchema>();
		expect(() => command.getDescription()).toThrow(ProsopoError);
		expect(() => command.getDescription()).toThrow(
			"DEVELOPER.METHOD_NOT_IMPLEMENTED",
		);
	});

	test("types", () => {
		const command = new TestInputCommand();
		// Type check: getOptions should return object with string keys
		const options: ReturnType<typeof command.getOptions> = command.getOptions();
		expect(typeof options).toBe("object");
		// Type check: _check should accept InputArgs
		const args: Parameters<typeof command._check>[0] = {
			input: "test",
		};
		expect(args.input).toBe("test");
	});
});

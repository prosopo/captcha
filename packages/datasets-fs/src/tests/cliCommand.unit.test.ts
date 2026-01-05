import { describe, expect, test, vi } from "vitest";
import * as z from "zod";
import { CliCommand } from "../cli/cliCommand.js";

// Concrete implementation for testing
const TestArgsSchema = z.object({
	test: z.string(),
	optional: z.number().optional(),
});

type TestArgs = z.infer<typeof TestArgsSchema>;

class TestCliCommand extends CliCommand<typeof TestArgsSchema> {
	public override getArgSchema() {
		return TestArgsSchema;
	}

	public override getDescription() {
		return "Test CLI command";
	}

	public override _check = vi.fn<[TestArgs], Promise<void>>();
	public override _run = vi.fn<[TestArgs], Promise<void>>();
}

describe("CliCommand", () => {
	test("getOptions returns empty object by default", () => {
		const command = new TestCliCommand();
		const options = command.getOptions();
		expect(options).toEqual({});
	});

	test("getArgSchema returns correct schema", () => {
		const command = new TestCliCommand();
		const schema = command.getArgSchema();
		expect(schema).toBe(TestArgsSchema);
	});

	test("parse validates and returns parsed args", async () => {
		const command = new TestCliCommand();
		const args = { test: "value", optional: 123 };
		const parsed = await command.parse(args);
		expect(parsed.test).toBe("value");
		expect(parsed.optional).toBe(123);
	});

	test("parse throws on invalid args", async () => {
		const command = new TestCliCommand();
		const invalidArgs = { test: 123 }; // wrong type
		await expect(command.parse(invalidArgs)).rejects.toThrow();
	});

	test("parse handles optional fields", async () => {
		const command = new TestCliCommand();
		const args = { test: "value" }; // optional field missing
		const parsed = await command.parse(args);
		expect(parsed.test).toBe("value");
		expect(parsed.optional).toBeUndefined();
	});

	test("getCommandName returns kebab-case of class name", () => {
		const command = new TestCliCommand();
		const name = command.getCommandName();
		expect(name).toBe("test-cli-command");
	});

	test("_check is called during exec", async () => {
		const command = new TestCliCommand();
		const args = { test: "value" };
		await command.exec(args);
		expect(command._check).toHaveBeenCalledWith(args);
		expect(command._check).toHaveBeenCalledTimes(1);
	});

	test("_run is called during exec", async () => {
		const command = new TestCliCommand();
		const args = { test: "value" };
		await command.exec(args);
		expect(command._run).toHaveBeenCalledWith(args);
		expect(command._run).toHaveBeenCalledTimes(1);
	});

	test("_check is called before _run during exec", async () => {
		const command = new TestCliCommand();
		const args = { test: "value" };
		const callOrder: string[] = [];
		command._check.mockImplementation(async () => {
			callOrder.push("check");
		});
		command._run.mockImplementation(async () => {
			callOrder.push("run");
		});
		await command.exec(args);
		expect(callOrder).toEqual(["check", "run"]);
	});

	test("exec propagates errors from _check", async () => {
		const command = new TestCliCommand();
		const args = { test: "value" };
		const error = new Error("Check failed");
		command._check.mockRejectedValue(error);
		await expect(command.exec(args)).rejects.toThrow("Check failed");
		expect(command._run).not.toHaveBeenCalled();
	});

	test("exec propagates errors from _run", async () => {
		const command = new TestCliCommand();
		const args = { test: "value" };
		const error = new Error("Run failed");
		command._run.mockRejectedValue(error);
		await expect(command.exec(args)).rejects.toThrow("Run failed");
		expect(command._check).toHaveBeenCalled();
	});

	test("getDescription returns correct description", () => {
		const command = new TestCliCommand();
		const description = command.getDescription();
		expect(description).toBe("Test CLI command");
	});

	test("types", () => {
		const command = new TestCliCommand();
		// Type check: parse should return TestArgs
		const args: TestArgs = { test: "value" };
		// Type check: getArgSchema should return typeof TestArgsSchema
		const schema: ReturnType<typeof command.getArgSchema> =
			command.getArgSchema();
		expect(schema).toBeDefined();
		// Type check: getCommandName should return string
		const name: ReturnType<typeof command.getCommandName> =
			command.getCommandName();
		expect(typeof name).toBe("string");
		// Type check: getDescription should return string
		const description: ReturnType<typeof command.getDescription> =
			command.getDescription();
		expect(typeof description).toBe("string");
	});
});

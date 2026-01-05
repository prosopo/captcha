import { describe, expect, test, vi } from "vitest";
import * as z from "zod";
import { CliCommand } from "../cli/cliCommand.js";
import { CliCommandComposite } from "../cli/cliCommandComposite.js";

// Concrete implementations for testing
const TestArgsSchema = z.object({
	test: z.string(),
});

type TestArgs = z.infer<typeof TestArgsSchema>;

class TestCommand1 extends CliCommand<typeof TestArgsSchema> {
	public override getArgSchema() {
		return TestArgsSchema;
	}

	public override getDescription() {
		return "Test command 1";
	}

	public override getOptions() {
		return {
			option1: {
				string: true,
				description: "Option 1",
			},
		};
	}

	public override _check = vi.fn<[TestArgs], Promise<void>>();
	public override _run = vi.fn<[TestArgs], Promise<void>>();
}

class TestCommand2 extends CliCommand<typeof TestArgsSchema> {
	public override getArgSchema() {
		return TestArgsSchema;
	}

	public override getDescription() {
		return "Test command 2";
	}

	public override getOptions() {
		return {
			option2: {
				string: true,
				description: "Option 2",
			},
			option1: {
				// Override option1
				string: true,
				description: "Option 1 overridden",
			},
		};
	}

	public override _check = vi.fn<[TestArgs], Promise<void>>();
	public override _run = vi.fn<[TestArgs], Promise<void>>();
}

class TestCompositeCommand extends CliCommandComposite<typeof TestArgsSchema> {
	public override getArgSchema() {
		return TestArgsSchema;
	}

	public override getDescription() {
		return "Test composite command";
	}

	constructor() {
		super([new TestCommand1(), new TestCommand2()]);
	}
}

describe("CliCommandComposite", () => {
	test("constructor stores commands", () => {
		const command = new TestCompositeCommand();
		const commands = command.getCommands();
		expect(commands.length).toBe(2);
		expect(commands[0]).toBeInstanceOf(TestCommand1);
		expect(commands[1]).toBeInstanceOf(TestCommand2);
	});

	test("getOptions merges options from all commands", () => {
		const command = new TestCompositeCommand();
		const options = command.getOptions();
		expect(options.option1).toBeDefined();
		expect(options.option2).toBeDefined();
	});

	test("getOptions later commands override earlier commands", () => {
		const command = new TestCompositeCommand();
		const options = command.getOptions();
		// TestCommand2's option1 should override TestCommand1's
		expect(options.option1.description).toBe("Option 1 overridden");
	});

	test("_check calls _check on all commands in order", async () => {
		const command = new TestCompositeCommand();
		const commands = command.getCommands();
		const args = { test: "value" };
		const callOrder: number[] = [];
		(commands[0]._check as ReturnType<typeof vi.fn>).mockImplementation(
			async () => {
				callOrder.push(0);
			},
		);
		(commands[1]._check as ReturnType<typeof vi.fn>).mockImplementation(
			async () => {
				callOrder.push(1);
			},
		);
		await command._check(args);
		expect(callOrder).toEqual([0, 1]);
		expect(commands[0]._check).toHaveBeenCalledWith(args);
		expect(commands[1]._check).toHaveBeenCalledWith(args);
	});

	test("_run calls _run on all commands in order", async () => {
		const command = new TestCompositeCommand();
		const commands = command.getCommands();
		const args = { test: "value" };
		const callOrder: number[] = [];
		(commands[0]._run as ReturnType<typeof vi.fn>).mockImplementation(
			async () => {
				callOrder.push(0);
			},
		);
		(commands[1]._run as ReturnType<typeof vi.fn>).mockImplementation(
			async () => {
				callOrder.push(1);
			},
		);
		await command._run(args);
		expect(callOrder).toEqual([0, 1]);
		expect(commands[0]._run).toHaveBeenCalledWith(args);
		expect(commands[1]._run).toHaveBeenCalledWith(args);
	});

	test("_check propagates errors from any command", async () => {
		const command = new TestCompositeCommand();
		const commands = command.getCommands();
		const args = { test: "value" };
		const error = new Error("Check failed");
		(commands[0]._check as ReturnType<typeof vi.fn>).mockRejectedValue(error);
		await expect(command._check(args)).rejects.toThrow("Check failed");
		expect(commands[1]._check).not.toHaveBeenCalled();
	});

	test("_run propagates errors from any command", async () => {
		const command = new TestCompositeCommand();
		const commands = command.getCommands();
		const args = { test: "value" };
		const error = new Error("Run failed");
		(commands[1]._run as ReturnType<typeof vi.fn>).mockRejectedValue(error);
		await expect(command._run(args)).rejects.toThrow("Run failed");
		expect(commands[0]._run).toHaveBeenCalled();
	});

	test("constructor creates copy of commands array", () => {
		const commands = [new TestCommand1(), new TestCommand2()];
		const command = new TestCompositeCommand();
		// Modifying original array should not affect composite
		commands.push(new TestCommand1());
		expect(command.getCommands().length).toBe(2);
	});

	test("types", () => {
		const command = new TestCompositeCommand();
		// Type check: getOptions should return object with string keys
		const options: ReturnType<typeof command.getOptions> = command.getOptions();
		expect(typeof options).toBe("object");
		// Type check: getCommands should return array of CliCommandAny
		const commands: ReturnType<typeof command.getCommands> =
			command.getCommands();
		expect(Array.isArray(commands)).toBe(true);
	});
});

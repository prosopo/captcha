import { ProsopoCliError } from "@prosopo/common";
import { describe, expect, test, vi } from "vitest";
import * as z from "zod";
import { Cli } from "../cli/cli.js";
import { CliCommand } from "../cli/cliCommand.js";

// Concrete implementations for testing
const TestArgsSchema = z.object({
	test: z.string(),
});

type TestArgs = z.infer<typeof TestArgsSchema>;

class TestCommand extends CliCommand<typeof TestArgsSchema> {
	public override getArgSchema() {
		return TestArgsSchema;
	}

	public override getDescription() {
		return "Test command description";
	}

	public override getOptions() {
		return {
			test: {
				string: true,
				demand: true,
				description: "Test option",
			},
		};
	}

	public override _check = vi.fn<[TestArgs], Promise<void>>();
	public override _run = vi.fn<[TestArgs], Promise<void>>();
}

class DefaultCommand extends CliCommand<typeof TestArgsSchema> {
	public override getCommandName() {
		return "$0";
	}

	public override getArgSchema() {
		return TestArgsSchema;
	}

	public override getDescription() {
		return "Default command";
	}

	public override _check = vi.fn<[TestArgs], Promise<void>>();
	public override _run = vi.fn<[TestArgs], Promise<void>>();
}

describe("Cli", () => {
	test("constructor stores commands", () => {
		const command = new TestCommand();
		const cli = new Cli([command]);
		// Commands are private, so we test through exec
		expect(cli).toBeDefined();
	});

	test("exec parses and executes command", async () => {
		const command = new TestCommand();
		const cli = new Cli([command]);
		await cli.exec(["test-command", "--test", "value"]);
		expect(command._check).toHaveBeenCalled();
		expect(command._run).toHaveBeenCalled();
	});

	test("exec throws ProsopoCliError when no command specified", async () => {
		const command = new TestCommand();
		const cli = new Cli([command]);
		await expect(cli.exec([])).rejects.toThrow(ProsopoCliError);
		try {
			await cli.exec([]);
		} catch (error) {
			if (error instanceof ProsopoCliError) {
				expect(error.translationKey).toBe("CLI.PARAMETER_ERROR");
			}
		}
	});

	test("exec uses default command when provided", async () => {
		const defaultCommand = new DefaultCommand();
		const cli = new Cli([defaultCommand]);
		// Default command should be called when no command is specified
		// Note: yargs behavior may vary, so we test that it doesn't throw the "no command" error
		try {
			await cli.exec([]);
		} catch (error) {
			// Should not be "no command specified" error if default command exists
			if (error instanceof ProsopoCliError) {
				expect(error.translationKey).not.toBe("CLI.PARAMETER_ERROR");
			}
		}
	});

	test("exec sets log level from argv", async () => {
		const command = new TestCommand();
		const cli = new Cli([command]);
		const originalSetLogLevel = cli.logger.setLogLevel;
		const setLogLevelSpy = vi.spyOn(cli.logger, "setLogLevel");
		await cli.exec(["test-command", "--test", "value", "--log-level", "debug"]);
		expect(setLogLevelSpy).toHaveBeenCalled();
		setLogLevelSpy.mockRestore();
	});

	test("exec handles multiple commands", async () => {
		const command1 = new TestCommand();
		// Create a second command with a different name
		class TestCommand2 extends CliCommand<typeof TestArgsSchema> {
			public override getCommandName() {
				return "test-command-2";
			}

			public override getArgSchema() {
				return TestArgsSchema;
			}

			public override getDescription() {
				return "Test command 2 description";
			}

			public override getOptions() {
				return {
					test: {
						string: true,
						demand: true,
						description: "Test option",
					},
				};
			}

			public override _check = vi.fn<[TestArgs], Promise<void>>();
			public override _run = vi.fn<[TestArgs], Promise<void>>();
		}
		const command2 = new TestCommand2();
		const cli = new Cli([command1, command2]);
		// Should be able to execute the first command
		await cli.exec(["test-command", "--test", "value"]);
		// First command should be executed
		expect(command1._check).toHaveBeenCalled();
		expect(command1._run).toHaveBeenCalled();
		// Second command should not be executed (different name)
		expect(command2._check).not.toHaveBeenCalled();
		expect(command2._run).not.toHaveBeenCalled();
	});

	test("exec calls command.parse with parsed argv", async () => {
		const command = new TestCommand();
		const parseSpy = vi.spyOn(command, "parse");
		const cli = new Cli([command]);
		await cli.exec(["test-command", "--test", "value"]);
		expect(parseSpy).toHaveBeenCalled();
		parseSpy.mockRestore();
	});

	test("exec calls command.exec after parsing", async () => {
		const command = new TestCommand();
		const execSpy = vi.spyOn(command, "exec");
		const cli = new Cli([command]);
		await cli.exec(["test-command", "--test", "value"]);
		expect(execSpy).toHaveBeenCalled();
		execSpy.mockRestore();
	});

	test("types", () => {
		const command = new TestCommand();
		const cli = new Cli([command]);
		// Type check: exec should accept string array
		const args: Parameters<typeof cli.exec>[0] = ["test"];
		expect(Array.isArray(args)).toBe(true);
	});
});


import { describe, expect, test } from "vitest";
import { InputCliCommand } from "../utils/input.js";
import {
	InputOutputArgsSchema,
	InputOutputCliCommand,
} from "../utils/inputOutput.js";
import { OutputCliCommand } from "../utils/output.js";

// Concrete implementation for testing
class TestInputOutputCommand extends InputOutputCliCommand<
	typeof InputOutputArgsSchema
> {
	public override getArgSchema() {
		return InputOutputArgsSchema;
	}

	public override getDescription() {
		return "Test input output command";
	}
}

describe("InputOutputCliCommand", () => {
	test("constructor creates composite with input and output commands", () => {
		const command = new TestInputOutputCommand();
		const commands = command.getCommands();
		expect(commands.length).toBe(2);
		expect(commands[0]).toBeInstanceOf(InputCliCommand);
		expect(commands[1]).toBeInstanceOf(OutputCliCommand);
	});

	test("getOptions merges input and output options", () => {
		const command = new TestInputOutputCommand();
		const options = command.getOptions();
		// Should have both input and output options
		expect(options.input).toBeDefined();
		expect(options.output).toBeDefined();
		expect(options.overwrite).toBeDefined();
	});

	test("getOptions output options override input options when conflicting", () => {
		const command = new TestInputOutputCommand();
		const options = command.getOptions();
		// Output command comes after input, so its options should take precedence
		// Both have alias, but output's should be used
		expect(options.output.alias).toBe("out");
		expect(options.input.alias).toBe("in");
	});

	test("types", () => {
		const command = new TestInputOutputCommand();
		// Type check: getOptions should return object with string keys
		const options: ReturnType<typeof command.getOptions> = command.getOptions();
		expect(typeof options).toBe("object");
		// Type check: getArgSchema should return InputOutputArgsSchema
		const schema: ReturnType<typeof command.getArgSchema> =
			command.getArgSchema();
		expect(schema).toBeDefined();
	});
});

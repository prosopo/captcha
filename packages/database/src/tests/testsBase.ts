import { it } from "vitest";

abstract class TestsBase {
	protected abstract getTests(): {
		name: string;
		method: () => Promise<void>;
	}[];

	public abstract getName(): string;

	public async runAll(): Promise<void> {
		const tests = this.getTests();

		for (const test of tests) {
			it(test.name, async () => {
				await test.method();
			});
		}
	}
}

export { TestsBase };

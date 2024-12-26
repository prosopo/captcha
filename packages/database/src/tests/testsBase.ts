import { it } from "vitest";

abstract class TestsBase {
	protected abstract getTests(): {
		name: string;
		method: () => Promise<void>;
	}[];

	protected abstract getTestName(): string;

	public async runAll(): Promise<void> {
		const tests = this.getTests();

		const testName = this.getTestName();

		for (const test of tests) {
			it(`test${testName} : ${test.name}`, async () => {
				await test.method();
			});
		}
	}
}

export { TestsBase };

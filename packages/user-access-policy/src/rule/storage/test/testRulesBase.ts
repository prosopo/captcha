import { TestsBase } from "../../../testsBase.js";
import type TestRulesStorage from "./testRulesStorage.js";

abstract class TestRulesBase extends TestsBase {
	public constructor(protected readonly rulesStorage: TestRulesStorage) {
		super();
	}
}

export default TestRulesBase;

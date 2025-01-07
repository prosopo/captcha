import { TestsBase } from "../../../testsBase.js";
import type RulesStorage from "../rulesStorage.js";

abstract class TestRulesStorageBase extends TestsBase {
	public constructor(protected rulesStorage: RulesStorage) {
		super();
	}
}

export default TestRulesStorageBase;

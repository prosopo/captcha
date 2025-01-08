import type RequestInspector from "./requestInspector.js";
import type RulesStorage from "../rule/storage/rulesStorage.js";
import RequestRulesInspector from "./requestRulesInspector.js";

export default function (rulesStorage: RulesStorage): RequestInspector {
	return new RequestRulesInspector(rulesStorage);
}

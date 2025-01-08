import type ApiRoutesProvider from "../../api/route/apiRoutesProvider.js";
import type ApiRoute from "../../api/route/apiRoute.js";
import ApiDeleteManyRulesEndpoint from "./deleteMany/apiDeleteManyRulesEndpoint.js";
import InsertManyRulesEndpoint from "./insertMany/insertManyRulesEndpoint.js";
import type RulesStorage from "../storage/rulesStorage.js";
import apiRulePaths from "./apiRulePaths.js";

class ApiRuleRoutesProvider implements ApiRoutesProvider {
	public getRoutes(rulesStorage: RulesStorage): ApiRoute[] {
		return [
			{
				path: apiRulePaths.INSERT_MANY,
				endpoint: new InsertManyRulesEndpoint(rulesStorage),
			},
			{
				path: apiRulePaths.DELETE_MANY,
				endpoint: new ApiDeleteManyRulesEndpoint(rulesStorage),
			},
		];
	}
}

export default ApiRuleRoutesProvider;

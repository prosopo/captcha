import type ApiRoutesProvider from "../../api/route/apiRoutesProvider.js";
import type ApiRoute from "../../api/route/apiRoute.js";
import ApiDeleteManyRulesEndpoint from "./deleteMany/apiDeleteManyRulesEndpoint.js";
import InsertManyRulesEndpoint from "./insertMany/insertManyRulesEndpoint.js";
import type RulesStorage from "../storage/rulesStorage.js";

class ApiRuleRoutesProvider implements ApiRoutesProvider {
	public getRoutes(rulesStorage: RulesStorage): ApiRoute[] {
		return [
			{
				path: "/v1/prosopo/user-access-policy/rule/insert-many",
				endpoint: new InsertManyRulesEndpoint(rulesStorage),
			},
			{
				path: "/v1/prosopo/user-access-policy/rule/delete-many",
				endpoint: new ApiDeleteManyRulesEndpoint(rulesStorage),
			},
		];
	}
}

export default ApiRuleRoutesProvider;

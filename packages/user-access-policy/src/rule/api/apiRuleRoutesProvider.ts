import type ApiRoutesProvider from "../../api/route/apiRoutesProvider.js";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type ApiRoute from "../../api/route/apiRoute.js";
import ApiDeleteManyRulesEndpoint from "./deleteMany/apiDeleteManyRulesEndpoint.js";
import InsertManyRulesEndpoint from "./insertMany/insertManyRulesEndpoint.js";

class ApiRuleRoutesProvider implements ApiRoutesProvider {
	public getRoutes(providerEnvironment: ProviderEnvironment): ApiRoute[] {
		const rulesStorage = providerEnvironment
			.getDb()
			.getUserAccessRulesStorage();

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

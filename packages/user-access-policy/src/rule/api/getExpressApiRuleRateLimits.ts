import apiRulePaths from "./apiRulePaths.js";

export default function () {
	const defaultWindowsMs = 60000;
	const defaultLimit = 5;

	return {
		[apiRulePaths.INSERT_MANY]: {
			windowMs:
				process.env.PROSOPO_USER_ACCESS_POLICY_RULE_INSERT_MANY_WINDOW ||
				defaultWindowsMs,
			limit:
				process.env.PROSOPO_USER_ACCESS_POLICY_RULE_INSERT_MANY_LIMIT ||
				defaultLimit,
		},
		[apiRulePaths.DELETE_MANY]: {
			windowMs:
				process.env.PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_MANY_WINDOW ||
				defaultWindowsMs,
			limit:
				process.env.PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_MANY_LIMIT ||
				defaultLimit,
		},
	};
}

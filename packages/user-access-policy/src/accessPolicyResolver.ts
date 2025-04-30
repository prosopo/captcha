import type { UserAttributes } from "./userAttributes.js";
import type { AccessPolicy } from "./accessPolicy.js";
import type { AccessRulesReader } from "./rules/accessRules.js";
import type { AccessRule } from "./rules/accessRule.js";
import type { Logger } from "@prosopo/common";

export type ResolveAccessPolicy = (
	userAttributes: UserAttributes,
	clientId: string,
) => Promise<AccessPolicy | undefined>;

export const createAccessPolicyResolver = (
	accessRulesReader: AccessRulesReader,
	logger: Logger,
): ResolveAccessPolicy => {
	return async (
		userAttributes: UserAttributes,
		clientId: string,
	): Promise<AccessPolicy | undefined> => {
		const accessRules = await accessRulesReader.findRules({
			...userAttributes,
			clientId: clientId,
		});

		const primaryAccessRule = resolvePrimaryAccessRule(accessRules);

		logger.debug("Resolved access policy", {
			userAttributes: userAttributes,
			clientId: clientId,
			accessRules: accessRules,
			primaryAccessRule: primaryAccessRule,
		});

		return primaryAccessRule;
	};
};

const resolvePrimaryAccessRule = (
	accessRules: AccessRule[],
): AccessRule | undefined => {
	const clientRules = accessRules.filter(
		(accessRule) => "string" === typeof accessRule.clientId,
	);
	const globalRules = accessRules.filter(
		(accessRule) => undefined === accessRule.clientId,
	);

	return clientRules.length > 0 ? clientRules.shift() : globalRules.shift();
};

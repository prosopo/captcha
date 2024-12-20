import type { BlockRule, IProviderDatabase } from "@prosopo/types-database";

export const checkUserRules = async (
	db: IProviderDatabase,
	user: string,
	dapp: string,
): Promise<BlockRule | undefined> => {
	const userRule = await db.getUserBlockRuleRecord(user, dapp);

	if (
		userRule &&
		userRule.userAccount === user &&
		userRule.dappAccount === dapp
	) {
		return userRule;
	}
	return undefined;
};

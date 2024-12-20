import type { BlockRule, IProviderDatabase } from "@prosopo/types-database";
import type { Address4, Address6 } from "ip-address";

export const checkIpRules = async (
	db: IProviderDatabase,
	ipAddress: Address4 | Address6,
	dapp: string,
): Promise<BlockRule | undefined> => {
	const rule = await db.getIPBlockRuleRecord(ipAddress.bigInt());

	if (rule && BigInt(rule.ip) === ipAddress.bigInt()) {
		// block by IP address globally
		if (rule.global) {
			return rule;
		}

		if (rule.dappAccount === dapp) {
			return rule;
		}
	}

	const dappRule = await db.getIPBlockRuleRecord(ipAddress.bigInt(), dapp);
	if (
		dappRule &&
		dappRule.dappAccount === dapp &&
		BigInt(dappRule.ip) === ipAddress.bigInt()
	) {
		return rule;
	}

	return undefined;
};

import type RulesStorage from "../../../rule/storage/rulesStorage.js";
import type {
	IPAddress,
	ProsopoCaptchaCountConfigSchemaOutput,
} from "@prosopo/types";

interface CaptchaConfigResolver {
	resolveConfig(
		rulesStorage: RulesStorage,
		defaults: ProsopoCaptchaCountConfigSchemaOutput,
		userIpAddress: IPAddress,
		userId: string,
		clientId: string,
	): Promise<ProsopoCaptchaCountConfigSchemaOutput>;
}

export default CaptchaConfigResolver;

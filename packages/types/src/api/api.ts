import type { IUserSettings, Tier } from "../client/index.js";
import type { CaptchaSolution } from "../datasets/index.js";
import type {
	DecisionMachineCaptchaType,
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
} from "../decisionMachine/index.js";
import type { ProcaptchaToken, StoredEvents } from "../procaptcha/index.js";
import type {
	ApiResponse,
	CaptchaResponseBody,
	CaptchaSolutionResponse,
	GetPowCaptchaResponse,
	ImageVerificationResponse,
	PowCaptchaSolutionResponse,
	Provider,
	ProviderRegistered,
	RandomProvider,
	UpdateProviderClientsResponse,
} from "../provider/index.js";

export interface ProviderApiInterface {
	getCaptchaChallenge(
		userAccount: string,
		randomProvider: RandomProvider,
	): Promise<CaptchaResponseBody>;
	submitCaptchaSolution(
		captchas: CaptchaSolution[],
		requestHash: string,
		userAccount: string,
		timestamp: string,
		providerRequestHashSignature: string,
		userRequestHashSignature: string,
	): Promise<CaptchaSolutionResponse>;
	verifyDappUser(
		token: ProcaptchaToken,
		signature: string,
		userAccount: string,
		maxVerifiedTime?: number,
	): Promise<ImageVerificationResponse>;
	getPowCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
	): Promise<GetPowCaptchaResponse>;
	submitPowCaptchaSolution(
		challenge: GetPowCaptchaResponse,
		userAccount: string,
		dappAccount: string,
		nonce: number,
		userTimestampSignature: string,
		timeout?: number,
		salt?: string,
	): Promise<PowCaptchaSolutionResponse>;
	submitUserEvents(
		events: StoredEvents,
		string: string,
	): Promise<UpdateProviderClientsResponse>;
	getProviderStatus(): Promise<ProviderRegistered>;
	getProviderDetails(): Promise<Provider>;
	registerSiteKey(
		siteKey: string,
		tier: Tier,
		settings: IUserSettings,
		jwt: string,
	): Promise<ApiResponse>;
	updateDetectorKey(detectorKey: string, jwt: string): Promise<ApiResponse>;
	removeDetectorKey(
		detectorKey: string,
		jwt: string,
		expirationInSeconds?: number,
	): Promise<ApiResponse>;
	updateDecisionMachine(
		scope: DecisionMachineScope,
		runtime: DecisionMachineRuntime,
		source: string,
		jwt: string,
		dappAccount?: string,
		language?: DecisionMachineLanguage,
		name?: string,
		version?: string,
		captchaType?: DecisionMachineCaptchaType,
	): Promise<ApiResponse>;
}

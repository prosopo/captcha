import { loadBalancer } from "@prosopo/load-balancer";
import type {
	ProcaptchaClientConfigOutput,
	RandomProvider,
} from "@prosopo/types";
import { at } from "@prosopo/util";

export const getRandomActiveProvider = async (
	config: ProcaptchaClientConfigOutput,
): Promise<RandomProvider> => {
	const randomIntBetween = (min: number, max: number) =>
		Math.floor(Math.random() * (max - min + 1) + min);

	// TODO maybe add some signing of timestamp here by the current account and then pass the timestamp to the Provider
	//  to ensure that the random selection was completed within a certain timeframe

	const PROVIDERS = await loadBalancer(config.defaultEnvironment);

	console.log(PROVIDERS);

	const randomProvderObj = at(
		PROVIDERS,
		randomIntBetween(0, PROVIDERS.length - 1),
	);
	return {
		providerAccount: randomProvderObj.address,
		provider: {
			url: randomProvderObj.url,
			datasetId: randomProvderObj.datasetId,
		},
	};
};

export const providerRetry = async (
	currentFn: () => Promise<void>,
	retryFn: ( ) => Promise<void>,
	stateReset: () => void,
	attemptCount: number,
	retryMax: number,
) => {
	try {
		await currentFn();
	} catch (err) {
		if (attemptCount >= retryMax) {
			return stateReset();
		}
		console.log(`Retry count: ${attemptCount}`);
		console.error(err);
		// hit an error, disallow user's claim to be human
		stateReset();
		// trigger a retry to attempt a new provider until it passes
		await retryFn();
	}
};

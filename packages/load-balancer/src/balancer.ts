import type { EnvironmentTypes } from "@prosopo/types";
import { z } from "zod";

const HardcodedProviderSchema = z.object({
	address: z.string(),
	url: z.string(),
	datasetId: z.string(),
	weight: z
		.number()
		.optional()
		.default(1)
		.transform((val) => {
			// weight coerced to int 1-100
			const weight = Math.round(val);
			return Math.max(1, Math.min(100, weight));
		}),
});

export type HardcodedProvider = z.infer<typeof HardcodedProviderSchema>;

type hostedProviders = Record<string, unknown>;

export const convertHostedProvider = (
	provider: hostedProviders,
): HardcodedProvider[] => {
	const providers = Object.values(provider).map((p) =>
		HardcodedProviderSchema.parse(p),
	);
	return providers.sort((a, b) => a.url.localeCompare(b.url));
};

export const getLoadBalancerUrl = (environment: EnvironmentTypes): string => {
	//if (environment === "production") {
	return "https://provider-list.prosopo.io/";
	// }
	// if (environment === "staging") {
	// 	return "https://provider-list.prosopo.io/staging.json";
	// }
	// throw new ProsopoEnvError("CONFIG.UNKNOWN_ENVIRONMENT", {
	// 	context: { environment },
	// });
};

export const loadBalancer = async (
	environment: EnvironmentTypes,
): Promise<HardcodedProvider[]> => {
	// if (environment === "development") {
	// 	return [
	// 		{
	// 			address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
	// 			url: "http://localhost:9229",
	// 			datasetId:
	// 				"0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef25",
	// 			weight: 1,
	// 		},
	// 	];
	// }

	const providers: hostedProviders = await fetch(
		getLoadBalancerUrl(environment),
		{
			method: "GET",
			mode: "cors",
		},
	).then((res) => res.json());
	return convertHostedProvider(providers);
};

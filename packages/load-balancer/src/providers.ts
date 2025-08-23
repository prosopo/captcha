import {HardcodedProvider, loadBalancer} from "./index.js";
import {EnvironmentTypes, RandomProvider} from "@prosopo/types";
import {at} from "@prosopo/util";

let providers: HardcodedProvider[] = [];

export const getRandomActiveProvider = async (
    env:EnvironmentTypes,
    entropy:number,
): Promise<RandomProvider> => {

    if (providers.length === 0) {
        // only get the providers JSON once
        providers = await loadBalancer(env);
    }

    console.log({entropy, providerLength: providers.length, index: entropy % (providers.length -  1)})
    const randomProvderObj = at(
        providers,
        entropy % (Math.max(providers.length -  1, 1))
    );
    return {
        providerAccount: randomProvderObj.address,
        provider: {
            url: randomProvderObj.url,
            datasetId: randomProvderObj.datasetId,
        },
    };
};
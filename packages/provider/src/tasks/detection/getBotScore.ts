import getBotScoreFromPayload from "./decodePayload.js";

export const getBotScore = async (payload: string) => {
	try {
		const botScore = await getBotScoreFromPayload(payload);

		if (botScore === undefined) {
			return 1;
		}

		return botScore;
	} catch (error) {
		console.error(error);
		return 1;
	}
};

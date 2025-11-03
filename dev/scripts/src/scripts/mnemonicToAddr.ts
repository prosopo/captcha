import { getPair } from "@prosopo/keyring";

const main = async () => {
	const mnemonic = process.argv[2];
	if (!mnemonic) {
		throw new Error("Mnemonic is required");
	}
	const res = getPair(mnemonic);
	console.log(res.address);
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

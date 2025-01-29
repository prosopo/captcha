const getLang = async (language: string) => {
	// @ts-ignore
	return (await import("@prosopo/locale"))[language];
};

getLang("en")
	.then((lang) => {
		console.log(lang);
	})
	.catch((err) => {
		console.error(err);
	});

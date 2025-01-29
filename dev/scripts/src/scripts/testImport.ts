const getLang = async (language: string) => {
	console.log("Getting language", language);
	// @ts-ignore
	return (await import(`@prosopo/locale/locales/${language}`)).default;
};

getLang("en")
	.then((lang) => {
		console.log(lang);
	})
	.catch((err) => {
		console.error(err);
	});

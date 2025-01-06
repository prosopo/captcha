import { Schema } from "mongoose";
import type Config from "./config.js";
import MongooseImageCaptchaConfig from "./imageCaptcha/mongooseImageCaptchaConfig.js";

const mongooseConfig = new Schema<Config>(
	{
		imageCaptcha: {
			type: MongooseImageCaptchaConfig,
			required: false,
		},
	},
	{ _id: false },
);

export default mongooseConfig;

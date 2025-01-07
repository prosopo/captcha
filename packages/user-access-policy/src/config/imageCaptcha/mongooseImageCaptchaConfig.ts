import { Schema } from "mongoose";
import type ImageCaptchaConfig from "./imageCaptchaConfig.js";

const mongooseImageCaptchaConfig = new Schema<ImageCaptchaConfig>(
	{
		solvedCount: {
			type: Number,
			required: false,
		},
		unsolvedCount: {
			type: Number,
			required: false,
		},
	},
	{ _id: false },
);

export default mongooseImageCaptchaConfig;

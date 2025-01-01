import { Schema } from "mongoose";

interface ImageCaptchaAccessRule {
	solvedCount?: number;
	unsolvedCount?: number;
}

const imageCaptchaAccessRuleSchema = new Schema<ImageCaptchaAccessRule>(
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

export { type ImageCaptchaAccessRule, imageCaptchaAccessRuleSchema };

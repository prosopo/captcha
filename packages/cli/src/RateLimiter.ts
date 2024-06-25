import { AdminApiPaths, ApiPaths } from '@prosopo/types'

export const getRateLimitConfig = () => {
    return {
        [ApiPaths.GetImageCaptchaChallenge]: {
            windowMs: process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_WINDOW,
            limit: process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_LIMIT,
        },
        [ApiPaths.GetPowCaptchaChallenge]: {
            windowMs: process.env.PROSOPO_GET_POW_CAPTCHA_CHALLENGE_WINDOW,
            limit: process.env.PROSOPO_GET_POW_CAPTCHA_CHALLENGE_LIMIT,
        },
        [ApiPaths.SubmitImageCaptchaSolution]: {
            windowMs: process.env.PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_WINDOW,
            limit: process.env.PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_LIMIT,
        },
        [ApiPaths.SubmitPowCaptchaSolution]: {
            windowMs: process.env.PROSOPO_SUBMIT_POW_CAPTCHA_SOLUTION_WINDOW,
            limit: process.env.PROSOPO_SUBMIT_POW_CAPTCHA_SOLUTION_LIMIT,
        },
        [ApiPaths.VerifyPowCaptchaSolution]: {
            windowMs: process.env.PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_WINDOW,
            limit: process.env.PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_LIMIT,
        },
        [ApiPaths.VerifyImageCaptchaSolutionDapp]: {
            windowMs: process.env.PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP_WINDOW,
            limit: process.env.PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP_LIMIT,
        },
        [ApiPaths.VerifyImageCaptchaSolutionUser]: {
            windowMs: process.env.PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_USER_WINDOW,
            limit: process.env.PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_USER_LIMIT,
        },
        [ApiPaths.GetProviderStatus]: {
            windowMs: process.env.PROSOPO_GET_PROVIDER_STATUS_WINDOW,
            limit: process.env.PROSOPO_GET_PROVIDER_STATUS_LIMIT,
        },
        [ApiPaths.GetProviderDetails]: {
            windowMs: process.env.PROSOPO_GET_PROVIDER_DETAILS_WINDOW,
            limit: process.env.PROSOPO_GET_PROVIDER_DETAILS_LIMIT,
        },
        [ApiPaths.SubmitUserEvents]: {
            windowMs: process.env.PROSOPO_SUBMIT_USER_EVENTS_WINDOW,
            limit: process.env.PROSOPO_SUBMIT_USER_EVENTS_LIMIT,
        },
        [AdminApiPaths.BatchCommit]: {
            windowMs: process.env.PROSOPO_BATCH_COMMIT_WINDOW,
            limit: process.env.PROSOPO_BATCH_COMMIT_LIMIT,
        },
        [AdminApiPaths.UpdateDataset]: {
            windowMs: process.env.PROSOPO_UPDATE_DATASET_WINDOW,
            limit: process.env.PROSOPO_UPDATE_DATASET_LIMIT,
        },
        [AdminApiPaths.ProviderDeregister]: {
            windowMs: process.env.PROSOPO_PROVIDER_DEREGISTER_WINDOW,
            limit: process.env.PROSOPO_PROVIDER_DEREGISTER_LIMIT,
        },
        [AdminApiPaths.ProviderUpdate]: {
            windowMs: process.env.PROSOPO_PROVIDER_UPDATE_WINDOW,
            limit: process.env.PROSOPO_PROVIDER_UPDATE_LIMIT,
        },
    }
}

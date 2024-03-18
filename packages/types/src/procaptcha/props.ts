import { ProcaptchaCallbacks } from './manager.js'
import { ProcaptchaClientConfigInput } from '../config/index.js'

/**
 * The props for the Procaptcha component.
 */
export interface ProcaptchaProps {
    // the configuration for procaptcha
    config: ProcaptchaClientConfigInput
    // optional set of callbacks for various captcha events
    callbacks?: Partial<ProcaptchaCallbacks>
}

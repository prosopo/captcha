import { IProCaptchaConfig } from '../types';

export class ProCaptchaConfig {

    protected config: IProCaptchaConfig;

    constructor(config: IProCaptchaConfig) {
        this.config = config;
    }

    public getConfig<T>(key?: keyof IProCaptchaConfig): IProCaptchaConfig | T {
        return key ? this.config[key] as unknown as T : this.config;
    }

}

export default ProCaptchaConfig;
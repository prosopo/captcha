import config from '../config';
import { ProsopoConfig } from '../types';

export function getConfig<T>(key?: keyof ProsopoConfig): ProsopoConfig | T {
    return key ? config[key] as unknown as T : config;
}

export default getConfig;
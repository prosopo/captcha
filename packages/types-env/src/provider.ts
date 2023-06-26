import { ProsopoConfig } from '@prosopo/types'
import { ProsopoEnvironment } from './env'

export interface ProviderEnvironment extends ProsopoEnvironment {
    config: ProsopoConfig
}

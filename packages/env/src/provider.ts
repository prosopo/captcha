import { Environment } from './env'
import { ProsopoConfig } from '@prosopo/types'

export class ProviderEnvironment extends Environment {
    declare config: ProsopoConfig
}

import { ProsopoEnvError } from '@prosopo/common'
import { EnvironmentTypes } from '@prosopo/types'

type HardcodedProvider = {
    address: string
    url: string
    datasetId: string
    datasetIdContent: string
}

export const loadBalancer = (environment: EnvironmentTypes): HardcodedProvider[] => {
    if (environment === 'production' || environment === 'staging') {
        return [
            {
                address: '5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G',
                url: 'https://pronode2.prosopo.io',
                datasetId: '0x7eca1e4806d91c9f905448d0ba9ed18b420d2930c8c8e11d3471befbbd75a672',
                datasetIdContent: '0x1b66283e8d4dc61f9a076141974db4ba810bc8385268205a01d650ea0d40c320',
            },
        ]
    }
    if (environment === 'development') {
        return [
            {
                address: '5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV',
                url: 'http://localhost:9229',
                datasetId: '0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef25',
                datasetIdContent: '0x3a2dbbf5610f04f54581843db3adf7e0fadc02cdb8e42e30b028c850e0603165',
            },
        ]
    }

    throw new ProsopoEnvError('CONFIG.UNKNOWN_ENVIRONMENT')
}

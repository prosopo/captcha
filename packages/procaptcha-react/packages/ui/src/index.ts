import {ProsopoContractApi} from '@prosopo/contract'

console.log(ProsopoContractApi)

export function createNewApiInstance() {
    return new ProsopoContractApi('5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL',
        '','', '')
}
import { DispatchError } from '@polkadot/types/interfaces'

/** Convert a dispatch error to a readable message
 * @param dispatchError
 */
export function getDispatchError(dispatchError: DispatchError): string {
    let message: string = dispatchError.type

    if (dispatchError.isModule) {
        try {
            const mod = dispatchError.asModule
            const error = dispatchError.registry.findMetaError(mod)

            message = `${error.section}.${error.name}`
        } catch (error) {
            console.log('ERROR GETTING ERROR!', error)
            // swallow
        }
    } else if (dispatchError.isToken) {
        message = `${dispatchError.type}.${dispatchError.asToken.type}`
    }

    return message
}

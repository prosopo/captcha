import openpgp, { WebStream } from 'openpgp'

/**
 * To encrypt a message with an array of encryption public keys
 * @param {string} message Message to encrypt
 * @param {array} encryptionKeys Armored version of array of public key
 * @returns {string} Return armored version of encrypted message
 */
export const encryptMessage = async (message: string, encryptionKeys: string[]): Promise<WebStream<string> | null> => {
    try {
        const publicKeys = await Promise.all(encryptionKeys.map((armoredKey) => openpgp.readKey({ armoredKey })))
        const pgpMessage = await openpgp.createMessage({ text: message.replace('\\“', '\\"') })
        // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
        return await openpgp.encrypt({
            message: pgpMessage, // input as Message object
            encryptionKeys: publicKeys,
        })
    } catch (error) {
        console.error('danger', 'Data encryption failed')
        return null
    }
}

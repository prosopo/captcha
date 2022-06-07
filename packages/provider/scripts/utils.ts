import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';

export async function generateMnemonic(keyring?: Keyring): Promise<[string, string]> {
    if (!keyring) {
        keyring = new Keyring({ type: 'sr25519' });
    }
    await cryptoWaitReady();
    const mnemonic = mnemonicGenerate();
    const account = keyring.addFromMnemonic(mnemonic);
    return [mnemonic, account.address];
}

export function updateEnvFileVar(source: string, name: string, value: string) {
    return source.replace(new RegExp(`.*(${name}=)(.*)`, 'gi'), `$1${value}`);
}

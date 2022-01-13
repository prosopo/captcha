const {mnemonicGenerate, cryptoWaitReady} = require('@polkadot/util-crypto');
const {Keyring} = require('@polkadot/keyring');
const keyring = new Keyring({type: 'sr25519'});

function mnemonic() {
    cryptoWaitReady().then(() => {

        const mnemonic = mnemonicGenerate();
        const account = keyring.addFromMnemonic(mnemonic);
        console.log(`Address: ${account.address}`);
        console.log(`Mnemonic: ${mnemonic}`);
    });
}

mnemonic()
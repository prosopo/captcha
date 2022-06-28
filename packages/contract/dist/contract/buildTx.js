"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTx = void 0;
const tslib_1 = require("tslib");
function buildTx(registry, extrinsic, signer, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const signerAddress = signer;
        return new Promise((resolve, reject) => {
            const actionStatus = {
                from: signerAddress.toString(),
                txHash: extrinsic.hash.toHex()
            };
            extrinsic
                .signAndSend(signerAddress, Object.assign({}, options), (result) => {
                if (result.status.isInBlock) {
                    actionStatus.blockHash = result.status.asInBlock.toHex();
                }
                if (result.status.isFinalized || result.status.isInBlock) {
                    result.events
                        .filter(({ event: { section } }) => section === 'system')
                        .forEach((event) => {
                        const { event: { data, method } } = event;
                        if (method === 'ExtrinsicFailed') {
                            const [dispatchError] = data;
                            let message = dispatchError.type;
                            if (dispatchError.isModule) {
                                try {
                                    const mod = dispatchError.asModule;
                                    const error = registry.findMetaError(new Uint8Array([
                                        mod.index.toNumber(),
                                        mod.error.toNumber()
                                    ]));
                                    message = `${error.section}.${error.name}${Array.isArray(error.docs)
                                        ? `(${error.docs.join('')})`
                                        : error.docs || ''}`;
                                }
                                catch (error) {
                                    // swallow
                                }
                            }
                            actionStatus.error = {
                                message
                            };
                            reject(actionStatus);
                        }
                        else if (method === 'ExtrinsicSuccess') {
                            actionStatus.result = result;
                            resolve(actionStatus);
                        }
                    });
                }
                else if (result.isError) {
                    actionStatus.error = {
                        data: result
                    };
                    actionStatus.events = undefined;
                    reject(actionStatus);
                }
            })
                .catch((error) => {
                actionStatus.error = {
                    message: error.message
                };
                reject(actionStatus);
            });
        });
    });
}
exports.buildTx = buildTx;
//# sourceMappingURL=buildTx.js.map
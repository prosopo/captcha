"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProsopoContractError = exports.ProsopoEnvError = void 0;
class ProsopoEnvError extends Error {
    constructor(error, context, ...params) {
        const isError = error instanceof Error;
        super(isError ? error.message : error);
        this.name = context && `${ProsopoEnvError.name}@${context}` || ProsopoEnvError.name;
        if (isError) {
            this.cause = error;
        }
        console.error('\n********************* ERROR *********************\n');
        console.error(this.cause, this.stack, ...params);
    }
}
exports.ProsopoEnvError = ProsopoEnvError;
class ProsopoContractError extends Error {
    constructor(error, context, ...params) {
        if (typeof error === "string") {
            super(error);
        }
        else {
            const mod = error.asModule;
            const dispatchError = error.registry.findMetaError(mod);
            super(`${dispatchError.section}.${dispatchError.name}`);
        }
        this.name = context && `${ProsopoContractError.name}@${context}` || ProsopoContractError.name;
        console.error('\n********************* ERROR *********************\n');
        console.error(error, this.stack, ...params);
    }
}
exports.ProsopoContractError = ProsopoContractError;
//# sourceMappingURL=handlers.js.map
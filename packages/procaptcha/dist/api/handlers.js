"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProsopoApiError = void 0;
class ProsopoApiError extends Error {
    constructor(error, context, ...params) {
        super(`${error.data.message ? error.data.message : error.statusText}`);
        this.name = context && `${ProsopoApiError.name}@${context}` || ProsopoApiError.name;
        // TODO: if env.debug
        console.error('\n********************* ERROR *********************\n');
        console.error(this.cause, this.stack, ...params);
    }
}
exports.ProsopoApiError = ProsopoApiError;
//# sourceMappingURL=handlers.js.map
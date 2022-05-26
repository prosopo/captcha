
export class ProsopoEnvError extends Error {
    constructor(error: Error, context?: string) {
        super(error.message);
        this.name = context && `${ProsopoEnvError.name}@${context}` || ProsopoEnvError.name;
        this.cause = error;
        // TODO: if env.debug
        console.error('\n********************* ERROR *********************\n');
        console.error(this.cause, this.stack);
    }
}
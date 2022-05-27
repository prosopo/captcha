
export class ProsopoEnvError extends Error {
    constructor(error: Error | string, context?: string, ...params: any[]) {
        const isError = error instanceof Error;
        super(isError ? error.message : error);
        this.name = context && `${ProsopoEnvError.name}@${context}` || ProsopoEnvError.name;
        if (isError) {
            this.cause = error;
        }
        // TODO: if env.debug
        console.error('\n********************* ERROR *********************\n');
        console.error(this.cause, this.stack, ...params);
    }
}
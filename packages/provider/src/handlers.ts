
export class EnvError extends Error {
    constructor(error: Error) {
        super(error.message);
        this.name = EnvError.name;
        this.cause = error;
        // TODO: if env.debug
        console.error('\n********************* ERROR *********************\n');
        console.error(this.cause, this.stack);
    }
}
export abstract class AsyncFactory {

    constructor() {
        throw new Error("Use `create` factory method");
    }
    
    public static async create(...args: any[]) {
        return await Object.create(this.prototype).init(...args);
    }

    public abstract init(...args: any[]): Promise<this>;

}

export default AsyncFactory;
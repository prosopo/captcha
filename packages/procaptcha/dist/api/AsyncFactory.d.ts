export declare abstract class AsyncFactory {
    constructor();
    static create(...args: any[]): Promise<any>;
    abstract init(...args: any[]): Promise<this>;
}
export default AsyncFactory;
//# sourceMappingURL=AsyncFactory.d.ts.map
import { AxiosInstance, AxiosResponse } from 'axios';
export declare class HttpClientBase {
    protected readonly axios: AxiosInstance;
    constructor(baseURL: string, prefix?: string);
    protected responseHandler: (response: AxiosResponse) => any;
    protected errorHandler: (error: any) => Promise<never>;
}
export default HttpClientBase;
//# sourceMappingURL=HttpClientBase.d.ts.map
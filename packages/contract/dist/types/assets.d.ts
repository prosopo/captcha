export interface Asset {
    URI: string;
    getURL(): string;
}
export interface AssetsResolver {
    resolveAsset(assetURI: string): Asset;
}
//# sourceMappingURL=assets.d.ts.map
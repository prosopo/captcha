// Copyright 2021-2022 Prosopo (UK) Ltd.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Asset, AssetsResolver } from "@prosopo/contract";
import { URL } from 'url';
import { Application } from 'express';

export type LocalAssetsResolverConfig = {
    absolutePath: string;
    basePath: string;
    serverBaseURL: string;
}

/*
    Local assets resolver assumes the URI is a path relative to the assetsBasePath property
*/
export class LocalAssetsResolver implements AssetsResolver {
    private config : LocalAssetsResolverConfig;
    constructor (configuration : LocalAssetsResolverConfig) {
        this.config = configuration;
    }

    resolveAsset(assetURI: string) : Asset {
        const url = new URL(assetURI);
        return {
            URI: assetURI,
            getURL: () => {
                if (url.protocol === 'file:') {
                    return this.config.serverBaseURL + this.config.basePath + url.pathname?.replace( this.config.absolutePath, '');
                }
                return '';
            }
        };
    }

    injectMiddleware(app : Application) : void {
        // app.use(virtual_path, folder_with_static_assets)
        // app.use(this.config.basePath, express.static(this.config.absolutePath));
    }
}

// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
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

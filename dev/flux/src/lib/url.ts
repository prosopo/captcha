// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import qs from 'qs'

export const getSocketURL = (nodeAPIURL: URL) => {
    const urlPort = nodeAPIURL.port || 16127
    return new URL(`https://${nodeAPIURL.hostname.replace(/\./g, '-')}-${urlPort}.node.api.runonflux.io`)
}

export const getZelIdAuthHeader = (zelid: string, signature: string, loginPhrase: string) => {
    return qs.stringify({
        zelid,
        signature,
        loginPhrase,
    })
}

export const prefixIPAddress = (ip: string) => {
    return new URL(`http://${ip.replace(/http(s)*:\/\//g, '')}`)
}

export const getNodeAPIURL = (url: string) => {
    const _url = new URL(prefixIPAddress(url))
    let apiPort = 16187
    if (_url.port) {
        apiPort = Number(_url.port) + 1
    }
    return new URL(prefixIPAddress(`${_url.hostname}:${apiPort}`)) // API is always one port higher than the UI
}

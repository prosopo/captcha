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

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

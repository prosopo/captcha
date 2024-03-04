export const getURLProtocol = (url: URL) => {
    if (url.hostname.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
        return 'http'
    }
    return 'https'
}

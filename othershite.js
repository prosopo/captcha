// Configuration variables (would come from options/env)
let DATADOME_SERVER_SIDE_KEY = '';
let DATADOME_ENABLE_GRAPHQL_SUPPORT = false;
let DATADOME_ENABLE_REFERRER_RESTORATION = false;
let DATADOME_MAXIMUM_BODY_SIZE = 25 * 1024; // 25 KB
let DATADOME_CUSTOM_FIELD_STRING_1 = null;
let DATADOME_CUSTOM_FIELD_STRING_2 = null;
let DATADOME_CUSTOM_FIELD_STRING_3 = null;
let DATADOME_CUSTOM_FIELD_INTEGER_1 = null;
let DATADOME_CUSTOM_FIELD_INTEGER_2 = null;
let DATADOME_CUSTOM_FIELD_FLOAT_1 = null;

const datadomeModuleName = 'CloudflareWorkers';
const datadomeModuleVersion = '2.2.0';
const datadomeMaxGraphqlBodyLength = 1024;

/**
 * Main function to build the request data payload
 */
async function buildDataDomeRequestData(request, config = {}) {
    // Apply config overrides
    if (config.serverSideKey) DATADOME_SERVER_SIDE_KEY = config.serverSideKey;
    if (config.enableGraphQLSupport) DATADOME_ENABLE_GRAPHQL_SUPPORT = config.enableGraphQLSupport;
    if (config.enableReferrerRestoration) DATADOME_ENABLE_REFERRER_RESTORATION = config.enableReferrerRestoration;
    if (config.maximumBodySize) DATADOME_MAXIMUM_BODY_SIZE = config.maximumBodySize;
    if (config.customFieldString1) DATADOME_CUSTOM_FIELD_STRING_1 = config.customFieldString1;
    if (config.customFieldString2) DATADOME_CUSTOM_FIELD_STRING_2 = config.customFieldString2;
    if (config.customFieldString3) DATADOME_CUSTOM_FIELD_STRING_3 = config.customFieldString3;
    if (config.customFieldInteger1) DATADOME_CUSTOM_FIELD_INTEGER_1 = config.customFieldInteger1;
    if (config.customFieldInteger2) DATADOME_CUSTOM_FIELD_INTEGER_2 = config.customFieldInteger2;
    if (config.customFieldFloat1) DATADOME_CUSTOM_FIELD_FLOAT_1 = config.customFieldFloat1;

    let url = new URL(request.url);
    let newRequest = new Request(url.href, request);

    // Restore referrer if enabled
    const mutatedFields = restoreReferrer(newRequest, url);
    newRequest = mutatedFields.request;
    url = mutatedFields.url;

    const headers = newRequest.headers;
    const cf = newRequest.cf;
    const { clientId, cookiesLength, cookiesList } = getCookieData(newRequest);
    const clientIdHeader = headers.get('x-datadome-clientid');

    // Build the request data object
    const requestData = {
        Key: DATADOME_SERVER_SIDE_KEY,
        IP: getIp(newRequest),
        RequestModuleName: datadomeModuleName,
        ModuleVersion: datadomeModuleVersion,
        ClientID: clientIdHeader ?? clientId,
        Accept: headers.get('accept'),
        AcceptCharset: headers.get('accept-charset'),
        AcceptEncoding: headers.get('accept-encoding'),
        AcceptLanguage: headers.get('accept-language'),
        APIConnectionState: 'new',
        AuthorizationLen: getAuthorizationLength(newRequest).toString(),
        CacheControl: headers.get('cache-control'),
        Connection: headers.get('connection'),
        ContentType: headers.get('content-type'),
        CookiesLen: cookiesLength.toString(),
        CookiesList: cookiesList,
        From: headers.get('from'),
        HeadersList: getHeaderNames(headers),
        Host: headers.get('host'),
        Method: newRequest.method,
        Origin: headers.get('origin'),
        Port: '0',
        PostParamLen: headers.get('content-length'),
        Pragma: headers.get('pragma'),
        Protocol: headers.get('x-forwarded-proto'),
        Referer: headers.get('referer'),
        Request: url.pathname + url.search,
        SecCHDeviceMemory: headers.get('sec-ch-device-memory'),
        SecCHUA: headers.get('sec-ch-ua'),
        SecCHUAArch: headers.get('sec-ch-ua-arch'),
        SecCHUAFullVersionList: headers.get('sec-ch-ua-full-version-list'),
        SecCHUAModel: headers.get('sec-ch-ua-model'),
        SecCHUAMobile: headers.get('sec-ch-ua-mobile'),
        SecCHUAPlatform: headers.get('sec-ch-ua-platform'),
        SecFetchDest: headers.get('sec-fetch-dest'),
        SecFetchMode: headers.get('sec-fetch-mode'),
        SecFetchSite: headers.get('sec-fetch-site'),
        SecFetchUser: headers.get('sec-fetch-user'),
        ServerHostname: headers.get('host'),
        ServerName: 'cloudflare',
        Signature: headers.get('signature'),
        SignatureAgent: headers.get('signature-agent'),
        SignatureInput: headers.get('signature-input'),
        SkyfirePayId: headers.get('skyfire-pay-id'),
        TimeRequest: getCurrentMicroTime().toString(),
        TlsCipher: cf?.tlsCipher?.toString(),
        TlsProtocol: cf?.tlsVersion?.toString(),
        TrueClientIP: headers.get('true-client-ip'),
        UserAgent: headers.get('user-agent'),
        Via: headers.get('via'),
        'X-Real-IP': headers.get('x-real-ip'),
        'X-Requested-With': headers.get('x-requested-with'),
        XForwardedForIP: headers.get('x-forwarded-for'),
    };

    // Add Cloudflare-specific data
    if (cf?.colo) {
        requestData.ServerRegion = cf.colo.toString();
    }

    if (cf?.botManagement) {
        const botManagement = cf.botManagement;
        requestData.JA3 = botManagement.ja3Hash?.toString();
        requestData.JA4 = botManagement.ja4?.toString();
    }

    // Override IP with IPv6 if available
    const ipv6Header = headers.get('cf-connecting-ipv6');
    if (ipv6Header != null) {
        requestData.IP = ipv6Header;
    }

    // GraphQL support
    if (DATADOME_ENABLE_GRAPHQL_SUPPORT) {
        const graphQLResult = await collectGraphQL(newRequest);
        if (graphQLResult.count > 0) {
            requestData.GraphQLOperationType = graphQLResult.type;
            requestData.GraphQLOperationName = graphQLResult.name;
            requestData.GraphQLOperationCount = graphQLResult.count.toString();
        }
    }

    // Add custom fields
    addCustomFields(newRequest, requestData);

    // Filter out null values
    const filteredRequestData = Object.fromEntries(
        Object.entries(requestData).filter(([_, v]) => v != null)
    );

    // Truncate values to size limits
    const truncatedData = truncateData(filteredRequestData);

    return truncatedData;
}

/**
 * Converts request data to URL-encoded string for POST body
 */
function stringify(input) {
    return input ? new URLSearchParams(input).toString() : '';
}

/**
 * Get IP address from request
 */
function getIp(request) {
    return request.headers.get('cf-connecting-ip');
}

/**
 * Get current timestamp in microseconds
 */
function getCurrentMicroTime() {
    return Date.now() * 1000;
}

/**
 * Get comma-separated list of header names
 */
function getHeaderNames(headers) {
    const headerNames = [];
    headers.forEach((_, name) => headerNames.push(name));
    return headerNames.join(',');
}

/**
 * Get length of Authorization header
 */
function getAuthorizationLength(request) {
    const authorization = request.headers.get('authorization');
    return authorization == null ? 0 : authorization.length;
}

/**
 * Extract cookie data from request
 */
function getCookieData(request) {
    const cookies = request.headers.get('cookie');
    let clientId = '';
    let cookiesLength = 0;
    let cookiesList = '';

    if (cookies != null) {
        const cookieMap = parseCookieString(cookies);
        clientId = cookieMap.get('datadome') ?? '';
        cookiesLength = cookies.length;
        cookiesList = Array.from(cookieMap.keys()).join(',');
    }

    return { clientId, cookiesLength, cookiesList };
}

/**
 * Parse cookie string into Map
 */
function parseCookieString(input) {
    const cookies = new Map();
    input.split(/; */).forEach((pair) => {
        let eqIndex = pair.indexOf('=');
        if (eqIndex > 0) {
            const key = pair.substring(0, eqIndex).trim();
            let value = pair.substring(++eqIndex, eqIndex + pair.length).trim();
            if (value[0] === '"') {
                value = value.slice(1, -1);
            }
            if (!cookies.has(key)) {
                cookies.set(key, tryDecode(value));
            }
        }
    });
    return cookies;
}

/**
 * Safely decode URL-encoded string
 */
function tryDecode(input) {
    try {
        return decodeURIComponent(input);
    } catch (e) {
        return input;
    }
}

/**
 * Restore referrer from query parameter if configured
 */
function restoreReferrer(request, url) {
//impl
}

function isMatchingRefererHeader(requestUrl, refererHeaderValue) {
//impl
}


/**
 * Collect GraphQL operation details
 */
async function collectGraphQL(request) {
//graphql stuff
}

/**
 * Add custom fields to request data
 */
function addCustomFields(request, requestData) {
    try {
        const customFields = [
            { configValue: DATADOME_CUSTOM_FIELD_STRING_1, fieldName: 'CustomFieldString1' },
            { configValue: DATADOME_CUSTOM_FIELD_STRING_2, fieldName: 'CustomFieldString2' },
            { configValue: DATADOME_CUSTOM_FIELD_STRING_3, fieldName: 'CustomFieldString3' },
            { configValue: DATADOME_CUSTOM_FIELD_INTEGER_1, fieldName: 'CustomFieldInteger1' },
            { configValue: DATADOME_CUSTOM_FIELD_INTEGER_2, fieldName: 'CustomFieldInteger2' },
            { configValue: DATADOME_CUSTOM_FIELD_FLOAT_1, fieldName: 'CustomFieldFloat1' },
        ];

        for (const { configValue, fieldName } of customFields) {
            if (configValue != null) {
                if (typeof configValue === 'function') {
                    try {
                        const value = configValue(request);
                        if (value != null) {
                            if (typeof value === 'string') {
                                requestData[fieldName] = value;
                            } else if (typeof value === 'number') {
                                requestData[fieldName] = value.toString();
                            }
                        }
                    } catch (e) {
                        // Skip on error
                    }
                } else if (typeof configValue === 'string') {
                    requestData[fieldName] = configValue;
                } else if (typeof configValue === 'number') {
                    requestData[fieldName] = configValue.toString();
                }
            }
        }
    } catch (e) {
        // Skip on error
    }
}


// Export main function
export { buildDataDomeRequestData, stringify };

function renameKeysForDataAttr(data: { [key: string]: string } = {}) {
    return Object.keys(data).reduce((prev, curr) => ({ ...prev, [`data-${curr}`]: data[curr] }), {})
}

/**
 * maps any data to data attributes (mapped to { data-[key]: value })
 *
 * dev - only in development mode
 */
export default function addDataAttr({
    general,
    dev,
}: {
    general?: { [key: string]: string }
    dev?: { [key: string]: string }
}) {
    return {
        ...renameKeysForDataAttr(general),
        ...(process.env.NODE_ENV === 'development' ? renameKeysForDataAttr(dev) : {}),
    }
}

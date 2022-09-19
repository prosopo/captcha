/**
 * maps dev/test data to data attributes for development environment
 * @param cypressData - data-cy value
 * @param additional - data values mapped to { data-[key]: value }
 * @returns 
 */
export function devData(
    cypressData: string,
    additional: { [key: string]: string } = {}
) {
    const _additional = Object.keys(additional).reduce(
        (prev, curr) => ({ ...prev, [`data-${curr}`]: additional[curr] }),
        {}
    );

    return process.env.NODE_ENV === "development"
        ? { "data-cy": cypressData, ..._additional }
        : {};
}

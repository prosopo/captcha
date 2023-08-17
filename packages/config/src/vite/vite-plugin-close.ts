export default function ClosePlugin() {
    return {
        name: 'ClosePlugin', // required, will show up in warnings and errors
        closeBundle() {
            console.log('Bundle closed')
            process.exit(0)
        },
    }
}

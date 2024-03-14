import { ProsopoServer } from '../server.js'
import { beforeEach, describe, expect, test } from 'vitest'
import { getServerConfig } from '../config.js'

describe('Server', () => {
    let server: ProsopoServer

    beforeEach(() => {
        const config = getServerConfig()
        server = new ProsopoServer(config)
        // Add any setup if needed
    })

    test('checkRandomProvider', async () => {
        // todo
        expect(result).toBe(true) // or false, depending on what you expect
    })
})

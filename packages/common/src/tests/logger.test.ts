import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLogger, getLoggerDefault, LogLevel, Loggable } from '../logger.js'

describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should create a logger with specified log level', () => {
    const logger = getLogger('debug', 'test')
    expect(logger.getLogLevel()).toBe(LogLevel.enum.debug)
  })

  it('should set log level correctly', () => {
    const logger = getLogger('info', 'test')
    logger.setLogLevel('warn')
    expect(logger.getLogLevel()).toBe(LogLevel.enum.warn)
  })

  it('should throw for invalid log level', () => {
    expect(() => getLogger('invalid', 'test')).toThrow()
  })

  it('should return default logger', () => {
    const defaultLogger = getLoggerDefault()
    expect(defaultLogger).toBeDefined()
    expect(defaultLogger.getLogLevel()).toBe(LogLevel.enum.info)
  })


  describe('Loggable', () => {
    it('should have a default logger', () => {
      const loggable = new Loggable()
      expect(loggable.logger).toBeDefined()
    })

    it('should allow setting a custom logger', () => {
      const loggable = new Loggable()
      const customLogger = getLogger('debug', 'custom')
      loggable.logger = customLogger
      expect(loggable.logger).toBe(customLogger)
    })
  })
})
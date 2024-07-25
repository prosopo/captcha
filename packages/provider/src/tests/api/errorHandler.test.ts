import { describe, it, expect, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { ProsopoApiError, ProsopoBaseError, ProsopoEnvError } from '@prosopo/common'
import { ZodError } from 'zod'
import { handleErrors } from '../../api/errorHandler.js'

describe('handleErrors', () => {
    it('should handle ProsopoApiError', () => {
        const mockRequest = {} as Request
        const mockResponse = {
            writeHead: vi.fn().mockReturnThis(),
            end: vi.fn(),
        } as unknown as Response
        const mockNext = vi.fn() as unknown as NextFunction

        const error = new ProsopoApiError('CONTRACT.INVALID_DATA_FORMAT')

        handleErrors(error, mockRequest, mockResponse, mockNext)

        expect(mockResponse.writeHead).toHaveBeenCalledWith(500, JSON.stringify('Invalid data format'), {
            'content-type': 'application/json',
        })
        expect(mockResponse.end).toHaveBeenCalled()
    })

    it('should handle SyntaxError', () => {
        const mockRequest = {} as Request
        const mockResponse = {
            writeHead: vi.fn().mockReturnThis(),
            end: vi.fn(),
        } as unknown as Response
        const mockNext = vi.fn() as unknown as NextFunction

        const [len, max] = [100, 50]
        const error = new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`)

        handleErrors(error, mockRequest, mockResponse, mockNext)

        expect(mockResponse.writeHead).toHaveBeenCalledWith(
            400,
            JSON.stringify(`Input length: ${len}, exceeds maximum allowed length: ${max}`),
            {
                'content-type': 'application/json',
            }
        )
        expect(mockResponse.end).toHaveBeenCalled()
    })

    it('should handle ZodError', () => {
        const mockRequest = {} as Request
        const mockResponse = {
            writeHead: vi.fn().mockReturnThis(),
            end: vi.fn(),
        } as unknown as Response
        const mockNext = vi.fn() as unknown as NextFunction

        const error = new ZodError([])

        handleErrors(error, mockRequest, mockResponse, mockNext)

        expect(mockResponse.writeHead).toHaveBeenCalledWith(400, `\"[]\"`, {
            'content-type': 'application/json',
        })
        expect(mockResponse.end).toHaveBeenCalled()
    })

    it('should unwrap nested ProsopoBaseError', () => {
        const mockRequest = {} as Request
        const mockResponse = {
            writeHead: vi.fn().mockReturnThis(),
            end: vi.fn(),
        } as unknown as Response
        const mockNext = vi.fn() as unknown as NextFunction

        const envError = new ProsopoEnvError('GENERAL.ENVIRONMENT_NOT_READY')
        const apiError = new ProsopoApiError(envError)

        handleErrors(apiError, mockRequest, mockResponse, mockNext)

        expect(mockResponse.writeHead).toHaveBeenCalledWith(500, JSON.stringify('Environment not ready'), {
            'content-type': 'application/json',
        })
        expect(mockResponse.end).toHaveBeenCalled()
    })
})

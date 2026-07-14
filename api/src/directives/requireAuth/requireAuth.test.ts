import { mockRedwoodDirective, getDirectiveName } from '@redwoodjs/testing/api'

import requireAuth from './requireAuth'

describe('requireAuth directive', () => {
  it('declares the directive sdl as schema, with the correct name', () => {
    expect(requireAuth.schema).toBeTruthy()
    expect(getDirectiveName(requireAuth.schema)).toBe('requireAuth')
  })

  it('throws when there is no current user', () => {
    const mockExecution = mockRedwoodDirective(requireAuth, { context: {} })

    expect(mockExecution).toThrowError()
  })

  it('does not throw when a current user is present', () => {
    const mockExecution = mockRedwoodDirective(requireAuth, {
      context: { currentUser: { email: 'admin@example.com', roles: ['admin'] } },
    })

    expect(mockExecution).not.toThrowError()
  })

  it('throws when the current user lacks a required role', () => {
    const mockExecution = mockRedwoodDirective(requireAuth, {
      directiveArgs: { roles: ['admin'] },
      context: { currentUser: { email: 'family@example.com', roles: [] } },
    })

    expect(mockExecution).toThrowError()
  })

  it('does not throw when the current user has a required role', () => {
    const mockExecution = mockRedwoodDirective(requireAuth, {
      directiveArgs: { roles: ['admin'] },
      context: { currentUser: { email: 'admin@example.com', roles: ['admin'] } },
    })

    expect(mockExecution).not.toThrowError()
  })
})

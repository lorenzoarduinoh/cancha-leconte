import { jest } from '@jest/globals'

// Mock Supabase client
export const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      gt: jest.fn(() => ({
        order: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
  rpc: jest.fn(),
}

// Mock the createServerClient function
jest.mock('@/lib/supabase/client', () => ({
  createServerClient: () => mockSupabaseClient,
}))

export const resetSupabaseMocks = () => {
  Object.values(mockSupabaseClient).forEach(mock => {
    if (typeof mock === 'function') {
      (mock as any).mockClear()
    }
  })
  
  // Reset nested mocks
  const fromMock = mockSupabaseClient.from()
  const selectMock = fromMock.select()
  const eqMock = selectMock.eq()
  
  if (eqMock.single) (eqMock.single as any).mockClear()
  if (eqMock.eq) (eqMock.eq as any).mockClear()
  if (fromMock.insert) (fromMock.insert as any).mockClear()
  if (fromMock.update) (fromMock.update as any).mockClear()
  if (fromMock.delete) (fromMock.delete as any).mockClear()
}
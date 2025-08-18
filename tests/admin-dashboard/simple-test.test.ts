/**
 * Simple test to verify test setup is working
 */

describe('Simple Admin Dashboard Test', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have working mocks', () => {
    const mockFetch = global.fetch as jest.Mock;
    expect(mockFetch).toBeDefined();
  });

  it('should have environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});
describe('Example Test Suite', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async code', async () => {
    const result = await Promise.resolve('async test');
    expect(result).toBe('async test');
  });
});

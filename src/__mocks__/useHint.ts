// Mock implementation for the useHint hook
const mockSelectHint = jest.fn();
const mockResetHint = jest.fn();

type UseHintReturn = {
  selectedHintType: string | null;
  hintContent: string | null;
  canSelectHint: boolean;
  selectHint: jest.Mock;
  resetHint: jest.Mock;
};

export const useHint = jest.fn((): UseHintReturn => ({
  selectedHintType: null,
  hintContent: null,
  canSelectHint: true,
  selectHint: mockSelectHint,
  resetHint: mockResetHint,
}));

// Helper to mock the hook with specific return values
export const mockUseHint = (overrides: Partial<UseHintReturn> = {}) => {
  const defaultValues: UseHintReturn = {
    selectedHintType: null,
    hintContent: null,
    canSelectHint: true,
    selectHint: mockSelectHint,
    resetHint: mockResetHint,
    ...overrides,
  };
  
  (useHint as jest.Mock).mockImplementation(() => defaultValues);
  return defaultValues;
};

// Reset all mocks between tests
export const resetUseHintMocks = (): void => {
  mockSelectHint.mockClear();
  mockResetHint.mockClear();
  (useHint as jest.Mock).mockClear();
};

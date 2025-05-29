import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGameRound } from '../useGameRound';
import { GameProvider } from '@/contexts/GameContext';

// Mock the useGameTimer hook
jest.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: () => ({
    remainingTime: 60,
    hasTimedOut: false,
    resetTimer: jest.fn(),
  }),
}));

// Mock the useHint hook
jest.mock('@/hooks/useHint', () => ({
  useHint: () => ({
    selectedHintType: null,
    hintContent: null,
    canSelectHint: true,
    selectHint: jest.fn(),
    resetHint: jest.fn(),
  }),
}));

describe('useGameRound', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <GameProvider>{children}</GameProvider>
    </QueryClientProvider>
  );

  const defaultProps = {
    roundNumber: 1,
    effectiveRoomId: 'test-room-id',
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useGameRound(defaultProps), { wrapper });

    expect(result.current.currentGuess).toEqual({ lat: 0, lng: 0 });
    expect(result.current.selectedYear).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.hintsUsedThisRound).toBe(0);
    expect(result.current.hasGuessedLocation).toBe(false);
  });

  it('should update currentGuess when handleMapClick is called', () => {
    const { result } = renderHook(() => useGameRound(defaultProps), { wrapper });
    
    const mockEvent = {
      latlng: { lat: 40.7128, lng: -74.0060 }
    } as any;
    
    act(() => {
      result.current.handleMapClick(mockEvent);
    });
    
    expect(result.current.currentGuess).toEqual({ lat: 40.7128, lng: -74.0060 });
    expect(result.current.hasGuessedLocation).toBe(true);
  });

  it('should update selectedYear when handleYearSelect is called', () => {
    const { result } = renderHook(() => useGameRound(defaultProps), { wrapper });
    
    act(() => {
      result.current.handleYearSelect(2020);
    });
    
    expect(result.current.selectedYear).toBe(2020);
  });

  it('should call handleUseHint when a hint is used', () => {
    const { result } = renderHook(() => useGameRound(defaultProps), { wrapper });
    
    // Mock the useHint hook to return a mock selectHint function
    const mockSelectHint = jest.fn();
    jest.requireMock('@/hooks/useHint').useHint.mockReturnValue({
      selectedHintType: null,
      hintContent: null,
      canSelectHint: true,
      selectHint: mockSelectHint,
      resetHint: jest.fn(),
    });
    
    act(() => {
      result.current.handleUseHint('location');
    });
    
    expect(mockSelectHint).toHaveBeenCalledWith('location');
  });

  // Add more test cases for other functions and edge cases
});

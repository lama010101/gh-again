import { renderHook, act } from '@testing-library/react';
import { useHint } from '../useHint';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient();
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useHint', () => {
  const mockImage = {
    id: '1',
    title: 'Test Image',
    description: 'Test Description',
    latitude: 40.7128,
    longitude: -74.0060,
    year: 2020,
    image_url: 'https://example.com/image.jpg',
    location_name: 'New York',
  };

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useHint(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.selectedHintType).toBeNull();
    expect(result.current.hintContent).toBeNull();
    expect(result.current.canSelectHint).toBe(false);
  });

  it('should allow selecting a hint when an image is provided', () => {
    const { result } = renderHook(() => useHint(mockImage), {
      wrapper: createWrapper(),
    });

    expect(result.current.canSelectHint).toBe(true);
  });

  it('should select a hint type and update state', () => {
    const { result } = renderHook(() => useHint(mockImage), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.selectHint('location');
    });

    expect(result.current.selectedHintType).toBe('location');
    expect(result.current.hintContent).toBeTruthy();
    expect(result.current.canSelectHint).toBe(false);
  });

  it('should reset the hint', () => {
    const { result } = renderHook(() => useHint(mockImage), {
      wrapper: createWrapper(),
    });

    // First select a hint
    act(() => {
      result.current.selectHint('year');
    });

    // Then reset it
    act(() => {
      result.current.resetHint();
    });

    expect(result.current.selectedHintType).toBeNull();
    expect(result.current.hintContent).toBeNull();
    expect(result.current.canSelectHint).toBe(true);
  });
});

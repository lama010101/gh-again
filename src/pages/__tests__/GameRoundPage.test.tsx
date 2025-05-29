import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GameProvider } from '@/contexts/GameContext';
import GameRoundPage from '../GameRoundPage';
import { useHint } from '@/hooks/useHint';

// Mock the useHint hook
jest.mock('@/hooks/useHint');

// Mock the components that are not relevant for this test
jest.mock('@/components/game/MapView', () => ({
  __esModule: true,
  default: () => <div data-testid="map-view">Map View</div>,
}));

jest.mock('@/components/game/ImageDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="image-display">Image Display</div>,
}));

// Mock the useGameTimer hook
jest.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: () => ({
    remainingTime: 60,
    hasTimedOut: false,
    resetTimer: jest.fn(),
  }),
}));

describe('GameRoundPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderGameRoundPage = (initialEntries = ['/game/round/1']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <GameProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/game/round/:roundNumber" element={<GameRoundPage />} />
            </Routes>
          </MemoryRouter>
        </GameProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock the useHint hook with default values
    (useHint as jest.Mock).mockReturnValue({
      selectedHintType: null,
      hintContent: null,
      canSelectHint: true,
      selectHint: jest.fn(),
      resetHint: jest.fn(),
    });
  });

  it('renders the game round page with default state', async () => {
    renderGameRoundPage();

    // Check if the main components are rendered
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.getByTestId('image-display')).toBeInTheDocument();
    
    // Check if the timer is displayed
    expect(screen.getByText(/time remaining/i)).toBeInTheDocument();
    
    // Check if the submit button is rendered
    expect(screen.getByRole('button', { name: /submit guess/i })).toBeInTheDocument();
  });

  it('shows the hint button when hints are available', () => {
    // Mock useHint to allow hint selection
    (useHint as jest.Mock).mockReturnValue({
      selectedHintType: null,
      hintContent: null,
      canSelectHint: true,
      selectHint: jest.fn(),
      resetHint: jest.fn(),
    });

    renderGameRoundPage();
    
    // Check if the hint button is visible
    expect(screen.getByRole('button', { name: /hint/i })).toBeInTheDocument();
  });

  it('disables the submit button when no guess has been made', () => {
    renderGameRoundPage();
    
    // The submit button should be disabled initially
    const submitButton = screen.getByRole('button', { name: /submit guess/i });
    expect(submitButton).toBeDisabled();
  });

  // Add more test cases as needed
});

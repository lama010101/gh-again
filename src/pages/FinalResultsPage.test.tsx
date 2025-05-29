import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useParams } from 'react-router-dom';
import '@testing-library/jest-dom';
import FinalResultsPage from './FinalResultsPage';
import { useGame } from '@/contexts/GameContext';

// Mock the useGame hook
jest.mock('@/contexts/GameContext', () => ({
  useGame: jest.fn()
}));

// Mock react-router-dom's useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn()
}));

// Mock the RoundDetailCard component
jest.mock('@/components/RoundDetailCard', () => ({
  __esModule: true,
  default: ({ image, result, score, isOpen, onToggleDetails, index }: any) => (
    <div data-testid="round-detail-card" data-id={image.id} data-open={isOpen}>
      <button onClick={() => onToggleDetails(image.id)}>
        ROUND {index + 1}
      </button>
      {isOpen && (
        <div>
          <div>Score: {score?.roundXP} XP</div>
          <div>Location: {result.guessLocation ? 'Guessed' : 'Not guessed'}</div>
          <div>Year: {result.guessYear}</div>
        </div>
      )}
    </div>
  )
}));

describe('FinalResultsPage', () => {
  const mockUseGame = useGame as jest.Mock;
  const mockUseParams = useParams as jest.Mock;

  const mockGameData = {
    gameId: 'test-game-123',
    images: [
      {
        id: 'img1',
        image_url: 'https://example.com/img1.jpg',
        year: 2000,
        latitude: 51.5,
        longitude: -0.1
      },
      {
        id: 'img2',
        image_url: 'https://example.com/img2.jpg',
        year: 2010,
        latitude: 52.5,
        longitude: -0.2
      }
    ],
    roundResults: [
      {
        guessCoordinates: { lat: 51.6, lng: -0.15 },
        guessYear: 2005,
        hintsUsed: 1
      },
      {
        guessCoordinates: { lat: 52.6, lng: -0.25 },
        guessYear: 2015,
        hintsUsed: 0
      }
    ],
    totalScore: 300,
    refreshGlobalMetrics: jest.fn()
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUseParams.mockReturnValue({ gameId: 'test-game-123' });
    mockUseGame.mockReturnValue({
      ...mockGameData,
      loading: false,
      error: null
    });
  });

  it('renders loading state when data is loading', () => {
    mockUseGame.mockReturnValueOnce({
      ...mockGameData,
      loading: true,
      error: null
    });

    render(
      <MemoryRouter>
        <FinalResultsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading results...')).toBeInTheDocument();
  });

  it('renders error state when there is an error', () => {
    const errorMessage = 'Failed to load game data';
    mockUseGame.mockReturnValueOnce({
      ...mockGameData,
      loading: false,
      error: new Error(errorMessage)
    });

    render(
      <MemoryRouter>
        <FinalResultsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders the final score and round cards when data is loaded', async () => {
    render(
      <MemoryRouter>
        <FinalResultsPage />
      </MemoryRouter>
    );

    // Check if the final score is displayed
    expect(screen.getByText('FINAL SCORE')).toBeInTheDocument();
    expect(screen.getByText('300 XP')).toBeInTheDocument();

    // Check if round cards are rendered
    const roundCards = screen.getAllByTestId('round-detail-card');
    expect(roundCards).toHaveLength(2);

    // Check if the first round card is rendered with correct data
    expect(roundCards[0]).toHaveAttribute('data-id', 'img1');
    expect(screen.getByText('ROUND 1')).toBeInTheDocument();
    expect(screen.getByText('ROUND 2')).toBeInTheDocument();
  });

  it('calls refreshGlobalMetrics on mount', async () => {
    const refreshGlobalMetrics = jest.fn();
    mockUseGame.mockReturnValueOnce({
      ...mockGameData,
      refreshGlobalMetrics
    });

    render(
      <MemoryRouter>
        <FinalResultsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(refreshGlobalMetrics).toHaveBeenCalled();
    });
  });
});

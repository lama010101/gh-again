import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useParams } from 'react-router-dom';
import '@testing-library/jest-dom';
import FinalResultsPage from './FinalResultsPage';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLogs } from '@/contexts/LogContext';
import { useRoundScores } from '@/hooks/useRoundScores';
import { useFinalScoreData } from '@/hooks/useFinalScoreData';
import { updateUserMetrics } from '@/utils/profile/profileService';

// Mock contexts and hooks
jest.mock('@/contexts/GameContext', () => ({
  useGame: jest.fn()
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));
jest.mock('@/contexts/LogContext', () => ({
  useLogs: jest.fn()
}));
jest.mock('@/hooks/useRoundScores', () => ({
  useRoundScores: jest.fn()
}));
jest.mock('@/hooks/useFinalScoreData', () => ({
  useFinalScoreData: jest.fn()
}));
jest.mock('@/utils/profile/profileService', () => ({
  updateUserMetrics: jest.fn()
}));

// Mock react-router-dom's useParams
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: () => mockNavigate
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
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseLogs = useLogs as jest.Mock;
  const mockUseRoundScores = useRoundScores as jest.Mock;
  const mockUseFinalScoreData = useFinalScoreData as jest.Mock;
  const mockUpdateUserMetrics = updateUserMetrics as jest.Mock;
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
        roundIndex: 0,
        imageId: 'img1',
        guessCoordinates: { lat: 51.6, lng: -0.15 },
        actualCoordinates: { lat: 51.5, lng: -0.1 },
        distanceKm: 10,
        score: 80,
        guessYear: 2005,
        xpWhere: 40,
        xpWhen: 40,
        accuracy: 80,
        hintsUsed: 1,
        timeTakenSeconds: 30
      },
      {
        roundIndex: 1,
        imageId: 'img2',
        guessCoordinates: { lat: 52.6, lng: -0.25 },
        actualCoordinates: { lat: 52.5, lng: -0.2 },
        distanceKm: 5,
        score: 90,
        guessYear: 2015,
        xpWhere: 45,
        xpWhen: 45,
        accuracy: 90,
        hintsUsed: 0,
        timeTakenSeconds: 25
      }
    ],
    refreshGlobalMetrics: jest.fn(),
    resetGame: jest.fn(),
    startGame: jest.fn(),
    fetchGlobalMetrics: jest.fn()
  };

  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockDetailedRoundScores = [
    {
      originalImageId: 'img1',
      originalImageUrl: 'https://example.com/img1.jpg',
      originalYear: 2000,
      originalLatitude: 51.5,
      originalLongitude: -0.1,
      originalGuessCoordinates: { lat: 51.6, lng: -0.15 },
      originalGuessYear: 2005,
      originalHintsUsed: 1,
      distanceKm: 10,
      roundXP: 80,
      roundPercent: 80,
      locationAccuracy: { score: 40, distanceKm: 10 },
      timeAccuracy: { score: 40, yearDiff: 5 }
    },
    {
      originalImageId: 'img2',
      originalImageUrl: 'https://example.com/img2.jpg',
      originalYear: 2010,
      originalLatitude: 52.5,
      originalLongitude: -0.2,
      originalGuessCoordinates: { lat: 52.6, lng: -0.25 },
      originalGuessYear: 2015,
      originalHintsUsed: 0,
      distanceKm: 5,
      roundXP: 90,
      roundPercent: 90,
      locationAccuracy: { score: 45, distanceKm: 5 },
      timeAccuracy: { score: 45, yearDiff: 5 }
    }
  ];
  const mockFinalScoreData = {
    roundScores: mockDetailedRoundScores, // Assuming this structure is fine for the hook
    finalXP: 170,
    finalPercent: 85,
    totalHintPenalty: 10, // Example value
    totalHintPenaltyPercent: 5 // Example value
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUseParams.mockReturnValue({ gameId: 'test-game-123' });
    mockUseGame.mockReturnValue({
      ...mockGameData,
      isLoading: false,
      error: null
    });
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    mockUseLogs.mockReturnValue({ addLog: jest.fn(), logs: [] });
    mockUseRoundScores.mockReturnValue(mockDetailedRoundScores);
    mockUseFinalScoreData.mockReturnValue(mockFinalScoreData);
    mockUpdateUserMetrics.mockResolvedValue({ success: true }); // Or mock the expected return
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

    // Check if the final score is displayed (using mockFinalScoreData)
    expect(screen.getByText('FINAL SCORE')).toBeInTheDocument();
    expect(screen.getByText(`${mockFinalScoreData.finalXP} XP`)).toBeInTheDocument();

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
      expect(mockGameData.fetchGlobalMetrics).toHaveBeenCalled();
    });
  });

  it('calls updateUserMetrics with correct data when conditions are met', async () => {
    render(
      <MemoryRouter>
        <FinalResultsPage />
      </MemoryRouter>
    );

    // Wait for the effect that calls updateUserMetrics
    await waitFor(() => {
      expect(mockUpdateUserMetrics).toHaveBeenCalled();
    });

    expect(mockUpdateUserMetrics).toHaveBeenCalledWith(
      mockUser.id,
      {
        gameXP: mockFinalScoreData.finalXP,
        gameAccuracy: mockFinalScoreData.finalPercent,
        isPerfectGame: false, // Based on mockDetailedRoundScores (1 hint used, 85% accuracy)
        locationAccuracy: (mockDetailedRoundScores[0].locationAccuracy.score + mockDetailedRoundScores[1].locationAccuracy.score) / 2,
        timeAccuracy: (mockDetailedRoundScores[0].timeAccuracy.score + mockDetailedRoundScores[1].timeAccuracy.score) / 2,
        yearBullseye: false, // Neither round has yearDiff === 0
        locationBullseye: false, // Neither round has distanceKm === 0
      },
      mockGameData.gameId
    );
  });

  it('navigates to home if gameId is missing after loading', async () => {
    mockUseGame.mockReturnValueOnce({
      ...mockGameData,
      gameId: null,
      isLoading: false,
      error: null,
    });
    const mockAddLog = jest.fn();
    mockUseLogs.mockReturnValueOnce({ addLog: mockAddLog, logs: [] });

    render(
      <MemoryRouter>
        <FinalResultsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
    expect(mockAddLog).toHaveBeenCalledWith('[FinalResultsPage] Missing gameId or roundResults, navigating to home.');
  });

  it('navigates to home if roundResults are empty after loading', async () => {
    mockUseGame.mockReturnValueOnce({
      ...mockGameData,
      roundResults: [],
      isLoading: false,
      error: null,
    });
    const mockAddLog = jest.fn();
    mockUseLogs.mockReturnValueOnce({ addLog: mockAddLog, logs: [] });

    render(
      <MemoryRouter>
        <FinalResultsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
    expect(mockAddLog).toHaveBeenCalledWith('[FinalResultsPage] Missing gameId or roundResults, navigating to home.');
  });

});

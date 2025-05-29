import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoundDetailCard from './RoundDetailCard';
import type { GameImage, RoundResult } from '@/types';

// Mock data for testing
const mockImage: GameImage = {
  id: 'test-1',
  url: 'https://example.com/test.jpg',
  year: 2000,
  latitude: 51.5,
  longitude: -0.1
};

const mockResult: RoundResult = {
  guessLocation: { lat: 51.6, lng: -0.2 },
  guessYear: 2005,
  hintsUsed: 1
};

const mockScore = {
  roundXP: 150,
  roundPercent: 75,
  locationAccuracy: { score: 80, distanceKm: 15.5 },
  timeAccuracy: { score: 70 },
  timeDifference: 5,
  distanceKm: 15.5,
  hintPenalty: 30,
  hintPenaltyPercent: 15
};

describe('RoundDetailCard', () => {
  const toggleDetails = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the card with correct content when closed', () => {
    render(
      <RoundDetailCard
        image={mockImage}
        result={mockResult}
        score={mockScore}
        isOpen={false}
        onToggleDetails={toggleDetails}
        index={0}
      />
    );

    // Check if the image is rendered
    const image = screen.getByAltText('Round 1 - Image ID: test-1');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', mockImage.url);

    // Check if the round number is displayed
    expect(screen.getByText('ROUND 1')).toBeInTheDocument();

    // Check if the score is displayed
    expect(screen.getByText('150 XP')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();

    // Check if the details are not shown when closed
    expect(screen.queryByText('Location Accuracy')).not.toBeInTheDocument();
    expect(screen.queryByText('Time Accuracy')).not.toBeInTheDocument();
  });

  it('toggles details when the header is clicked', () => {
    render(
      <RoundDetailCard
        image={mockImage}
        result={mockResult}
        score={mockScore}
        isOpen={false}
        onToggleDetails={toggleDetails}
        index={0}
      />
    );

    // Click on the header to toggle details
    const header = screen.getByRole('button', { name: /round 1/i });
    fireEvent.click(header);

    // Check if the toggle callback was called with the correct image ID
    expect(toggleDetails).toHaveBeenCalledWith(mockImage.id);
  });

  it('shows details when isOpen is true', () => {
    render(
      <RoundDetailCard
        image={mockImage}
        result={mockResult}
        score={mockScore}
        isOpen={true}
        onToggleDetails={toggleDetails}
        index={0}
      />
    );

    // Check if details are shown when isOpen is true
    expect(screen.getByText('Location Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Time Accuracy')).toBeInTheDocument();
    expect(screen.getByText('15.5 km')).toBeInTheDocument();
    expect(screen.getByText('5 years')).toBeInTheDocument();
    expect(screen.getByText('1 hint used')).toBeInTheDocument();
  });

  it('handles missing score gracefully', () => {
    render(
      <RoundDetailCard
        image={mockImage}
        result={mockResult}
        score={null}
        isOpen={false}
        onToggleDetails={toggleDetails}
        index={0}
      />
    );

    // The component should render nothing if score is null
    expect(screen.queryByText('ROUND 1')).not.toBeInTheDocument();
  });
});

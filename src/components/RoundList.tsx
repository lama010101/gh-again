import React from 'react';
import { FixedSizeList as List } from 'react-window';
import RoundDetailCard from '@/components/RoundDetailCard';
import type { GameImage, RoundResult } from '@/types/game';
import type { DetailedRoundScore } from '@/types/results';

interface RoundListProps {
  detailedRoundScores: DetailedRoundScore[];
  images: GameImage[];
  open: Record<string, boolean>;
  onToggleDetails: (imageId: string) => void;
  addLog: (log: string) => void;
  roundResults: RoundResult[]; // Added to get timeTakenSeconds
}

// Define the Row component that FixedSizeList will render
const Row = ({ index, style, data }: { index: number; style: React.CSSProperties; data: RoundListProps }) => {
  const {
    detailedRoundScores,
    images,
    open,
    onToggleDetails,
    addLog,
    roundResults
  } = data;

  const score = detailedRoundScores[index];
  const imageFromContext = images[index];

  if (!score || !imageFromContext) {
    addLog(`[RoundList Row] Missing score or image data at index ${index}`);
    return <div style={style}>Error loading round data.</div>; // Placeholder for missing data
  }

  const imageForCard: GameImage = {
    id: score.originalImageId,
    image_url: score.originalImageUrl,
    year: score.originalYear,
    latitude: score.originalLatitude,
    longitude: score.originalLongitude,
    title: imageFromContext.title || `Image ${index + 1}`,
    location_name: imageFromContext.location_name || 'Unknown Location',
    description: imageFromContext.description || ''
  };

  const currentRoundResult = roundResults && roundResults[index];

  const resultForCard: RoundResult = {
    roundIndex: index,
    imageId: score.originalImageId,
    guessCoordinates: score.originalGuessCoordinates,
    actualCoordinates: { lat: score.originalLatitude, lng: score.originalLongitude },
    distanceKm: score.distanceKm,
    score: score.roundXP,
    guessYear: score.originalGuessYear,
    xpWhere: score.locationAccuracy?.score || 0,
    xpWhen: score.timeAccuracy?.score || 0,
    accuracy: score.roundPercent,
    hintsUsed: score.originalHintsUsed,
    timeTakenSeconds: currentRoundResult?.timeTakenSeconds || 0
  };

  return (
    <div style={style} className="px-1 py-2"> {/* Added padding to simulate gap from grid */} 
      <RoundDetailCard
        key={imageForCard.id} // key is managed by the List, but good practice if Row was standalone
        image={imageForCard}
        result={resultForCard}
        score={score}
        isOpen={open[imageForCard.id] || false}
        onToggleDetails={onToggleDetails}
        index={index}
      />
    </div>
  );
};

const RoundList: React.FC<RoundListProps> = (props) => {
  const { detailedRoundScores } = props;
  // Estimate item height. This should be adjusted based on RoundDetailCard's actual height.
  // If cards can have variable heights (e.g., when expanded), VariableSizeList would be more appropriate.
  const ITEM_HEIGHT = 250; // Adjust this value based on your card's typical height

  if (!detailedRoundScores || detailedRoundScores.length === 0) {
    return <div className="text-center p-4">No round data to display.</div>;
  }

  return (
    <List
      className="mb-8" // Retain bottom margin
      height={600} // Example height, adjust as needed or make dynamic
      itemCount={detailedRoundScores.length}
      itemSize={ITEM_HEIGHT} // Height of each row/card
      width="100%" // Take full width of its container
      itemData={props} // Pass all props to the Row component
    >
      {Row}
    </List>
  );
};

export default RoundList;

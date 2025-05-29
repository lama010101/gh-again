import React from 'react';
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Target } from "lucide-react";
import { formatInteger } from '@/utils/format';
import type { GameImage, RoundResult } from '@/types';

interface RoundScore {
  roundXP: number;
  roundPercent: number;
  locationAccuracy: { score: number; distanceKm: number };
  timeAccuracy: { score: number };
  timeDifference: number;
  distanceKm: number;
  hintPenalty?: number;
  hintPenaltyPercent?: number;
}

interface RoundDetailCardProps {
  image: GameImage; // Sourced from src/types/index.ts
  result: RoundResult; // Sourced from src/types/index.ts
  score: RoundScore | null | undefined;
  isOpen: boolean;
  onToggleDetails: (imageId: string) => void;
  index: number;
}

const RoundDetailCard: React.FC<RoundDetailCardProps> = ({ 
  image, 
  result, 
  score, 
  isOpen, 
  onToggleDetails, 
  index 
}) => {
  if (!score) {
    // Or some placeholder/loading state for the card if a score is missing but the card should render
    return null; 
  }

  return (
    <div
      key={image.id}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
    >
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/3">
          <img
            src={image.url} // Use 'url' as defined in src/types/index.ts GameImage
            alt={`Round ${index + 1} - Image ID: ${image.id}`}
            className="w-full h-48 md:h-full object-cover"
            loading="lazy"
            aria-label={`Historical image for round ${index + 1}`}
          />
        </div>
        <div className="p-4 md:w-2/3">
          <div className="flex justify-between items-start mb-4">
            <div
              className="cursor-pointer w-full"
              onClick={() => onToggleDetails(image.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleDetails(image.id);
                }
              }}
              tabIndex={0}
              role="button"
              aria-expanded={isOpen}
              aria-controls={`round-details-${image.id}`}
              aria-label={`Toggle details for Image ID: ${image.id}`}
            >
              <h3 className="text-xl font-bold mb-1">Image ID: {image.id}</h3>
              {/* If a title is needed, it should be added to the GameImage type and fetched/passed down */}
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Actual Coordinates: {image.latitude.toFixed(2)}, {image.longitude.toFixed(2)}
              </p>
              {/* If location_name is needed, it should be added to the GameImage type and fetched/passed down */}
              
              <div className="flex flex-wrap gap-2 items-center mt-2">
                <Badge className="bg-history-primary/10 text-history-primary border-history-primary">
                  <MapPin className="h-3 w-3 mr-1" />
                  {score.distanceKm ? `${formatInteger(score.distanceKm)} km` : 'No guess'}
                </Badge>
                
                <Badge className="bg-history-primary/10 text-history-primary border-history-primary">
                  <Calendar className="h-3 w-3 mr-1" />
                  {result.guessYear ? `${result.guessYear} (${score.timeDifference} years off)` : 'No guess'}
                </Badge>
                <Badge variant="secondary">
                  <Target className="h-4 w-4 mr-1" />
                  {score?.locationAccuracy?.score || 0} pts
                </Badge>
                <Badge variant="secondary">
                  <Calendar className="h-4 w-4 mr-1" />
                  {score?.timeAccuracy?.score || 0} pts
                </Badge>
              </div>
            </div>
          </div>
          {/* Collapsible details section (optional, can be added here) */}
          {/* {isOpen && ( <div id={`round-details-${image.id}`}> More details... </div> )} */}
        </div>
      </div>
    </div>
  );
};

export default RoundDetailCard;

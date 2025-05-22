
import { useState, useEffect, useCallback } from 'react'; // Added useCallback

export type HintType = 'where' | 'when' | null;

interface HintState {
  selectedHintType: HintType;
  hintContent: string | null;
  canSelectHintType: boolean; // Added this property
}

// Mock data for development - in a real implementation this would come from props or context
const mockImageData = {
  location_name: "Berlin, Germany",
  gps: { lat: 52.5200, lng: 13.4050 },
  year: 1989,
  title: "Fall of the Berlin Wall",
  description: "Historic moment when the Berlin Wall was dismantled, marking the reunification of East and West Germany."
};

// Helper functions to generate hint content
const getRegionHint = (data: typeof mockImageData): string => {
  // In a real implementation, you might use a geo library to determine the region
  // For now, using a simplified mapping based on location name or coordinates
  if (data.location_name.includes("Berlin")) return "Central Europe";
  if (data.location_name.includes("Paris")) return "Western Europe";
  if (data.location_name.includes("Tokyo")) return "East Asia";
  // Default fallback
  return "Europe";
};

const getDecadeHint = (data: typeof mockImageData): string => {
  const decade = Math.floor(data.year / 10) * 10;
  return `${decade}s`;
};

const getDescriptionHint = (data: typeof mockImageData): string => {
  // Remove specific location and date references
  let description = data.description;
  
  // Remove location references (simple approach, could be more sophisticated)
  description = description.replace(/\b(in|at|near|from|to)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g, "in this location");
  description = description.replace(/\b[A-Z][a-z]+(,\s+[A-Z][a-z]+)*/g, "this location");
  
  // Remove year references
  description = description.replace(/\b(19|20)\d{2}\b/g, "during this time");
  
  return description;
};

// HINT SYSTEM CONSTANTS
export const HINTS_PER_ROUND = 2;
export const HINTS_PER_GAME = 10;
export const HINT_PENALTY = 30; // 30 XP or 30% accuracy

export const useHint = (imageData = mockImageData) => {
  const [hintsUsedThisRound, setHintsUsedThisRound] = useState(0);
  const [hintsUsedTotal, setHintsUsedTotal] = useState(0);
  const [hintState, setHintState] = useState<HintState>(() => {
    const savedHint = localStorage.getItem('currentHint');
    return savedHint ? JSON.parse(savedHint) : {
      selectedHintType: null,
      hintContent: null,
      canSelectHintType: true
    };
  });

  useEffect(() => {
    if (hintState.selectedHintType) {
      localStorage.setItem('currentHint', JSON.stringify(hintState));
    }
  }, [hintState]);

  const canSelectHint = hintsUsedThisRound < HINTS_PER_ROUND && hintsUsedTotal < HINTS_PER_GAME && !hintState.selectedHintType;
  const canSelectHintType = (hintType: HintType): boolean => canSelectHint && hintType !== null;

  const selectHint = useCallback((hintType: HintType) => {
    if (!canSelectHint) return;
    let content: string | null = null;
    switch (hintType) {
      case 'where':
        content = getRegionHint(imageData);
        break;
      case 'when':
        content = getDecadeHint(imageData);
        break;
      default:
        content = null;
    }
    setHintState({
      selectedHintType: hintType,
      hintContent: content,
      canSelectHintType: false
    });
    setHintsUsedThisRound(h => h + 1);
    setHintsUsedTotal(t => t + 1);
  }, [canSelectHint, imageData]);

  // Function to reset hint for next round
  const resetHint = useCallback(() => {
    localStorage.removeItem('currentHint');
    setHintState({
      selectedHintType: null,
      hintContent: null,
      canSelectHintType: true
    });
    setHintsUsedThisRound(0);
  }, []);

  const resetHintsForRound = useCallback(() => {
    setHintsUsedThisRound(0);
  }, []);

  const incrementHints = useCallback(() => {
    setHintsUsedTotal(t => t + 1);
  }, []);

  return {
    selectedHintType: hintState.selectedHintType,
    hintContent: hintState.hintContent,
    canSelectHintType: canSelectHint && hintState.canSelectHintType,
    hintsUsedThisRound,
    hintsUsedTotal,
    canSelectHint,
    selectHint,
    resetHint,
    resetHintsForRound,
    incrementHints,
    HINTS_PER_ROUND,
    HINTS_PER_GAME,
    HINT_PENALTY
  };
};

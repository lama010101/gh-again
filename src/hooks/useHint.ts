
import { useState, useEffect, useCallback } from 'react'; // Added useCallback

export type HintType = 'where' | 'when' | 'what' | null;

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

export const useHint = (imageData = mockImageData) => {
  const [hintsAllowed] = useState(1); // Max hints per round
  const [hintsUsed, setHintsUsed] = useState(0);
  
  // Initialize with values from localStorage if they exist
  const [hintState, setHintState] = useState<HintState>(() => {
    const savedHint = localStorage.getItem('currentHint');
    return savedHint ? JSON.parse(savedHint) : {
      selectedHintType: null,
      hintContent: null,
      canSelectHintType: true
    };
  });

  // Save to localStorage whenever the hint state changes
  useEffect(() => {
    if (hintState.selectedHintType) {
      localStorage.setItem('currentHint', JSON.stringify(hintState));
    }
  }, [hintState]);

  const canSelectHint = hintsUsed < hintsAllowed && !hintState.selectedHintType;
  
  // Function to check if a specific hint type can be selected
  // This doesn't need useCallback as it's not returned directly,
  // but its result 'canSelectHint' is used in selectHint's useCallback.
  const canSelectHintType = (hintType: HintType): boolean => {
    return canSelectHint && hintType !== null;
  };

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
      case 'what':
        content = getDescriptionHint(imageData);
        break;
      default:
        content = null;
    }

    setHintState({
      selectedHintType: hintType,
      hintContent: content,
      canSelectHintType: false
    });
    
    setHintsUsed(prevHintsUsed => prevHintsUsed + 1); // Use functional update
  }, [canSelectHint, imageData, setHintState, setHintsUsed]); // Added dependencies

  const resetHint = useCallback(() => {
    localStorage.removeItem('currentHint');
    setHintState({
      selectedHintType: null,
      hintContent: null,
      canSelectHintType: true
    });
    setHintsUsed(0);
  }, [setHintState, setHintsUsed]); // Added dependencies

  return {
    selectedHintType: hintState.selectedHintType,
    hintContent: hintState.hintContent,
    canSelectHintType: canSelectHint && hintState.canSelectHintType, // Clarified returned boolean
    hintsAllowed,
    hintsUsed,
    canSelectHint, // This is the computed boolean
    selectHint,  // Memoized function
    resetHint    // Memoized function
  };
};

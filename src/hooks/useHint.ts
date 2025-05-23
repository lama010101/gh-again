
import { useState, useEffect, useCallback } from 'react';
import { GameImage } from '@/contexts/GameContext';

export type HintType = 'where' | 'when' | 'what' | null;

interface HintState {
  selectedHintType: HintType;
  hintContent: string | null;
  canSelectHintType: boolean;
}

// Helper functions to generate hint content
const getRegionHint = (data: { location_name: string; latitude: number; longitude: number }): string => {
  // In a real implementation, you might use a geo library to determine the region
  // For now, using a simplified mapping based on location name or coordinates
  const location = data.location_name.toLowerCase();
  if (location.includes("berlin")) return "Central Europe";
  if (location.includes("paris")) return "Western Europe";
  if (location.includes("tokyo")) return "East Asia";
  // Default fallback
  return "Europe";
};

const getDecadeHint = (year: number): string => {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
};

const getDescriptionHint = (description: string): string => {
  if (!description || typeof description !== 'string') {
    return 'No description available';
  }
  
  // Remove specific location and date references
  let cleanDescription = description;
  
  // Remove location references (simple approach, could be more sophisticated)
  cleanDescription = cleanDescription
    // Remove location names (words that start with a capital letter and are followed by lowercase letters)
    .replace(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g, (match) => {
      // Skip words that are at the start of a sentence or proper nouns
      return match.endsWith('.') || match.endsWith('!') || match.endsWith('?') ? match : '...';
    })
    // Remove location prepositions
    .replace(/\b(in|at|near|from|to|by|on|upon|along|across|through|into|onto|towards|between|among|around|before|after|behind|below|beneath|beside|beyond|inside|outside|under|underneath|within|without)\s+[A-Za-z]+(?:\s+[A-Za-z]+)*/gi, '...')
    // Remove specific addresses or coordinates
    .replace(/\b\d+\s+[A-Za-z]+(?:\s+[A-Za-z\.]+)*/g, '...')
    // Remove years
    .replace(/\b(19|20)\d{2}\b/g, '...')
    // Remove any remaining numbers
    .replace(/\b\d+\b/g, '...')
    // Clean up multiple dots
    .replace(/\.{2,}/g, '...')
    // Clean up spaces around dots
    .replace(/\s*\.\.\.\s*/g, '... ')
    .trim();
  
  // If we've removed too much, provide a generic hint
  if (cleanDescription.split(/\s+/).length < 5) {
    return 'This image shows a significant historical event or location.';
  }
  
  return cleanDescription;
};

// HINT SYSTEM CONSTANTS
export const HINTS_PER_ROUND = 2;
export const HINTS_PER_GAME = 10;
export const HINT_PENALTY = 30; // 30 XP or 30% accuracy

export const useHint = (imageData: GameImage | null = null) => {
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
    if (!canSelectHint) {
      console.warn('Cannot select hint: no hints available or already selected');
      return;
    }
    
    if (!imageData) {
      console.error('Cannot select hint: no image data available');
      return;
    }
    
    let content: string | null = null;
    try {
      switch (hintType) {
        case 'where':
          content = getRegionHint({
            location_name: imageData.location_name || 'unknown location',
            latitude: imageData.latitude || 0,
            longitude: imageData.longitude || 0
          });
          break;
        case 'when':
          content = getDecadeHint(imageData.year || new Date().getFullYear());
          break;
        case 'what':
          // For 'what' hint, use the description with sensitive information removed
          content = getDescriptionHint(imageData.description || '');
          break;
        default:
          content = 'No hint available';
      }
    } catch (error) {
      console.error('Error generating hint content:', error);
      content = 'Error generating hint. Please try again.';
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
    hintsUsed: hintsUsedThisRound, // For backward compatibility
    hintsAllowed: HINTS_PER_ROUND, // The maximum hints allowed per round
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

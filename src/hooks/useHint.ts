
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameImage } from '@/types/game';

export type HintType = 'where' | 'when' | null;

interface HintState {
  selectedHintTypes: HintType[];
  hintContents: Map<HintType, string>;
  loading: boolean;
  error: string | null;
}

interface HintData {
  where: string;
  when: string;
  image_id: string;
}

// HINT SYSTEM CONSTANTS
export const HINTS_PER_ROUND = 2; // Maximum hints allowed per round
export const HINTS_PER_GAME = 10; // Maximum hints allowed per game
export const HINT_PENALTY = 30; // 30 XP or 30% accuracy penalty per hint used

export const useHint = (imageData: GameImage | null = null) => {
  const [hintsUsedThisRound, setHintsUsedThisRound] = useState(() => {
    const savedHints = localStorage.getItem('hintsUsedThisRound');
    return savedHints ? parseInt(savedHints, 10) : 0;
  });
  
  const [hintsUsedTotal, setHintsUsedTotal] = useState(() => {
    const savedTotalHints = localStorage.getItem('hintsUsedTotal');
    return savedTotalHints ? parseInt(savedTotalHints, 10) : 0;
  });

  const [hintState, setHintState] = useState<HintState>(() => {
    const savedHint = localStorage.getItem('currentHint');
    if (savedHint) {
      try {
        const parsed = JSON.parse(savedHint);
        // Convert the array back to a Map
        if (parsed.hintContents && Array.isArray(parsed.hintContents)) {
          return {
            ...parsed,
            hintContents: new Map(parsed.hintContents)
          };
        }
        return parsed;
      } catch (e) {
        // If parsing fails, return default state
        return {
          selectedHintTypes: [],
          hintContents: new Map(),
          loading: false,
          error: null
        };
      }
    }
    return {
      selectedHintTypes: [],
      hintContents: new Map(),
      loading: false,
      error: null
    };
  });

  // Generate hint data from image data when it changes
  useEffect(() => {
    const generateHintData = async () => {
      if (!imageData) return;
      
      try {
        setHintState(prev => ({ ...prev, loading: true, error: null }));
        
        // In a production environment, this would fetch from Supabase
        // For now, we'll generate hints from the imageData we have
        
        // Generate region (where) hint
        const whereHint = generateRegionHint(imageData);
        
        // Generate decade (when) hint
        const whenHint = generateDecadeHint(imageData);
        
        if (!whereHint && !whenHint) {
          setHintState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'No hint data available for this image' 
          }));
          return;
        }
        
        // Store the hint data in state
        const hintContents = new Map<HintType, string>();
        if (whereHint) hintContents.set('where', whereHint);
        if (whenHint) hintContents.set('when', whenHint);
        
        setHintState(prev => ({
          ...prev,
          hintContents,
          loading: false,
          error: null
        }));
        
      } catch (error) {
        console.error('Unexpected error fetching hint data:', error);
        setHintState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'An unexpected error occurred loading hint data' 
        }));
      }
    };
    
    generateHintData();
  }, [imageData]);
  
  // Helper function to generate region hint from image data
  const generateRegionHint = (image: GameImage): string => {
    const location = image.location_name.toLowerCase();
    
    if (location.includes("berlin")) return "Central Europe";
    if (location.includes("paris")) return "Western Europe";
    if (location.includes("london")) return "United Kingdom";
    if (location.includes("new york")) return "Eastern United States";
    if (location.includes("tokyo")) return "East Asia";
    if (location.includes("sydney")) return "Australia";
    
    // Default regional hint based on coordinates
    const lat = image.latitude;
    const lng = image.longitude;
    
    if (lat > 35 && lng < 0 && lng > -20) return "Southern Europe";
    if (lat > 45 && lng > 0 && lng < 30) return "Central Europe";
    if (lat > 45 && lng > 30) return "Eastern Europe";
    if (lat < 0) return "Southern Hemisphere";
    
    return "Unknown Region";
  };
  
  // Helper function to generate decade hint from image data
  const generateDecadeHint = (image: GameImage): string => {
    if (!image.year) return "Unknown Period";
    
    const decade = Math.floor(image.year / 10) * 10;
    return `${decade}s`;
  };
  
  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('hintsUsedThisRound', hintsUsedThisRound.toString());
    localStorage.setItem('hintsUsedTotal', hintsUsedTotal.toString());
    
    const serializedHintState = {
      ...hintState,
      hintContents: Array.from(hintState.hintContents.entries())
    };
    localStorage.setItem('currentHint', JSON.stringify(serializedHintState));
  }, [hintsUsedThisRound, hintsUsedTotal, hintState]);

  // Check if the user can select more hints
  const canSelectAnotherHint = hintsUsedThisRound < HINTS_PER_ROUND && hintsUsedTotal < HINTS_PER_GAME;
  
  // Select a hint
  const selectHint = useCallback((hintType: HintType) => {
    if (!canSelectAnotherHint) {
      console.warn('Cannot select hint: hint limit reached');
      return;
    }
    
    if (!hintType || !hintState.hintContents.has(hintType)) {
      console.error('Cannot select hint: hint type is invalid or not available');
      return;
    }
    
    setHintState(prev => ({
      ...prev,
      selectedHintTypes: [...prev.selectedHintTypes, hintType]
    }));
    
    setHintsUsedThisRound(h => h + 1);
    setHintsUsedTotal(t => t + 1);
  }, [canSelectAnotherHint, hintState.hintContents]);
  
  // Get hint content by type
  const getHintContent = useCallback((hintType: HintType): string | null => {
    if (!hintType) return null;
    return hintState.hintContents.get(hintType) || null;
  }, [hintState.hintContents]);

  // Reset hint state for next round
  const resetHint = useCallback(() => {
    localStorage.removeItem('currentHint');
    setHintState({
      selectedHintTypes: [],
      hintContents: new Map(),
      loading: false,
      error: null
    });
    setHintsUsedThisRound(0);
    localStorage.setItem('hintsUsedThisRound', '0');
  }, []);

  // Reset hints for the round only
  const resetHintsForRound = useCallback(() => {
    setHintsUsedThisRound(0);
    localStorage.setItem('hintsUsedThisRound', '0');
    setHintState(prev => ({
      ...prev,
      selectedHintTypes: []
    }));
  }, []);

  // Increment total hints (used for game history tracking)
  const incrementHints = useCallback(() => {
    setHintsUsedTotal(t => {
      const newTotal = t + 1;
      localStorage.setItem('hintsUsedTotal', newTotal.toString());
      return newTotal;
    });
  }, []);

  return {
    // New API
    selectedHintTypes: hintState.selectedHintTypes,
    hintContents: hintState.hintContents,
    isLoading: hintState.loading,
    error: hintState.error,
    
    // For backward compatibility
    selectedHintType: hintState.selectedHintTypes.length > 0 ? hintState.selectedHintTypes[0] : null,
    hintContent: hintState.selectedHintTypes.length > 0 ? 
                hintState.hintContents.get(hintState.selectedHintTypes[0]) || null : null,
    
    hintsUsedThisRound,
    hintsUsedTotal,
    hintsUsed: hintsUsedThisRound,
    hintsAllowed: HINTS_PER_ROUND,
    canSelectAnotherHint,
    selectHint,
    resetHint,
    resetHintsForRound,
    incrementHints,
    HINTS_PER_ROUND,
    HINTS_PER_GAME,
    HINT_PENALTY
  };
};

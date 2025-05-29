import React, { useState } from 'react';
import Popup from '@/components/ui/Popup';
import { Button } from "@/components/ui/button";
import { MapPin, Clock } from "lucide-react";
import { HintType } from "@/hooks/useHint";

interface HintModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHintTypes: HintType[];
  hintContents: Map<HintType, string>;
  isLoading: boolean;
  error: string | null;
  onSelectHint: (type: HintType) => void;
  hintsUsedThisRound: number;
  hintsUsedTotal: number;
  HINTS_PER_ROUND: number;
  HINTS_PER_GAME: number;
  image: { url: string; title: string; };
}

const HintModal = ({ 
  isOpen, 
  onOpenChange, 
  selectedHintTypes, 
  hintContents, 
  isLoading,
  error,
  onSelectHint,
  hintsUsedThisRound,
  hintsUsedTotal,
  HINTS_PER_ROUND,
  HINTS_PER_GAME,
  image
}: HintModalProps) => {
  const [loadingHint, setLoadingHint] = useState<HintType | null>(null);

  const handleHintSelection = (hintType: HintType) => {
    setLoadingHint(hintType);
    try {
      onSelectHint(hintType);
    } catch (error) {
      console.error('Error selecting hint:', error);
    } finally {
      setLoadingHint(null);
    }
  };
  
  // Check if user can select another hint
  const canSelectAnotherHint = hintsUsedThisRound < HINTS_PER_ROUND && hintsUsedTotal < HINTS_PER_GAME;

  return (
    <Popup isOpen={isOpen} onClose={() => onOpenChange(false)} ariaLabelledBy="hint-modal-title">
      <div className="text-center">
        <h2 id="hint-modal-title" className="text-xl font-bold text-white mb-4">
          {selectedHintTypes.length > 0 ? "Your Hint" : "Choose Your Hint"}
          {selectedHintTypes.length > 1 ? "s" : ""}
        </h2>
      </div>

      <div className="mt-4">
        {/* Remaining hints info */}
        <div className="mb-4 grid grid-cols-2 gap-3 text-center">
          <div className="bg-white/5 p-2 rounded-lg">
            <div className="text-xs text-gray-300 mb-1">This Round</div>
            <div className="text-xl font-bold text-white">
              {hintsUsedThisRound}
              <span className="text-xs font-normal text-gray-400"> / {HINTS_PER_ROUND}</span>
            </div>
          </div>
          <div className="bg-white/5 p-2 rounded-lg">
            <div className="text-xs text-gray-300 mb-1">This Game (max 10 hints)</div>
            <div className="text-xl font-bold text-white">
              {hintsUsedTotal}
              <span className="text-xs font-normal text-gray-400"> / {HINTS_PER_GAME}</span>
            </div>
          </div>
        </div>

        {/* Show selected hints if any */}
        {selectedHintTypes.length > 0 && (
          <div className="mb-6 grid gap-4">
            {selectedHintTypes.includes('where') && (
              <div className="text-center p-5 glass rounded-xl">
                <div className="mb-3">
                  <MapPin className="mx-auto h-7 w-7 text-history-secondary mb-2" />
                  <h3 className="text-lg font-medium">Where</h3>
                </div>
                <p className="text-xl font-medium">
                  {hintContents.get('where') || 'No location information available'}
                </p>
              </div>
            )}
            {selectedHintTypes.includes('when') && (
              <div className="text-center p-5 glass rounded-xl">
                <div className="mb-3">
                  <Clock className="mx-auto h-7 w-7 text-history-secondary mb-2" />
                  <h3 className="text-lg font-medium">When</h3>
                </div>
                <p className="text-xl font-medium">
                  {hintContents.get('when') || 'No time period information available'}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Show error message if there's an error loading hints */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-center">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Show hint buttons if user can select another hint */}
        {canSelectAnotherHint && (
          <div className="grid gap-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleHintSelection('where')}
                className={`hint-button p-4 rounded-xl glass flex items-center transition-colors ${
                  (selectedHintTypes.includes('where') || isLoading || loadingHint) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/10'}`}
                disabled={selectedHintTypes.includes('where') || isLoading || loadingHint !== null}
              >
                <div className={`bg-gradient-to-br from-indigo-500 to-purple-600 h-12 w-12 rounded-full flex items-center justify-center ${
                  loadingHint === 'where' ? 'animate-pulse' : ''
                }`}>
                  {loadingHint === 'where' ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <MapPin className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="ml-3 text-left">
                  <h3 className="text-base font-medium">Where</h3>
                  <p className="text-xs text-gray-300">Reveals the region</p>
                </div>
              </button>
              
              <button 
                onClick={() => handleHintSelection('when')}
                className={`hint-button p-4 rounded-xl glass flex items-center transition-colors ${
                  (selectedHintTypes.includes('when') || isLoading || loadingHint) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/10'}`}
                disabled={selectedHintTypes.includes('when') || isLoading || loadingHint !== null}
              >
                <div className={`bg-gradient-to-br from-pink-500 to-red-600 h-12 w-12 rounded-full flex items-center justify-center ${
                  loadingHint === 'when' ? 'animate-pulse' : ''
                }`}>
                  {loadingHint === 'when' ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Clock className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="ml-3 text-left">
                  <h3 className="text-base font-medium">When</h3>
                  <p className="text-xs text-gray-300">Reveals the decade</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Show message if no more hints available */}
        {!canSelectAnotherHint && hintsUsedThisRound > 0 && (
          <div className="text-center py-4">
            <p className="text-gray-300">
              {hintsUsedThisRound >= HINTS_PER_ROUND 
                ? "You've used all hints for this round."
                : "You've used all your hints for this game."}
            </p>
          </div>
        )}
        
        {/* Hint cost information at the bottom */}
        <div className="mt-6 text-center text-sm text-gray-300">
          Each hint costs 30 XP or 30% accuracy. Best used if you're less than 50% sure.
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Button
          onClick={() => onOpenChange(false)}
          className="px-6 bg-gradient-to-r from-history-secondary to-history-secondary/80 border-none hover:opacity-90"
        >
          {selectedHintTypes.length > 0 ? "Continue Guessing" : "Cancel"}
        </Button>
      </div>
    </Popup>
  );
};

export default HintModal;

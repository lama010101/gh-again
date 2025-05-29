import React, { useState } from 'react';
import Popup from '@/components/ui/Popup';
import { Button } from "@/components/ui/button";
import { MapPin, Clock } from "lucide-react";
import { HintType } from "@/hooks/useHint";

interface HintModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHintType: HintType;
  hintContent: string | null;
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
  selectedHintType, 
  hintContent, 
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
  const canSelectAnotherHint = hintsUsedThisRound < HINTS_PER_ROUND && 
                              hintsUsedTotal < HINTS_PER_GAME && 
                              (!selectedHintType || hintsUsedThisRound < HINTS_PER_ROUND - 1);

  // Handle back to hints
  const handleBackToHints = () => {
    // Don't clear the selected hint, just go back to the hint selection
    // The hint will still be visible in the HUD
    onSelectHint(null);
  };

  return (
    <Popup isOpen={isOpen} onClose={() => onOpenChange(false)} ariaLabelledBy="hint-modal-title">
      <div className="text-center">
        <h2 id="hint-modal-title" className="text-xl font-bold text-white mb-4">
          {selectedHintType ? (canSelectAnotherHint ? "Your Hint" : "Your Hints") : "Choose Your Hint"}
        </h2>
      </div>

      <div className="mt-4">
        {/* Show hint cost info */}
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 text-sm mt-0.5">⚠️</span>
            <div>
              <p className="text-yellow-300 text-sm font-medium">Hint Cost</p>
              <p className="text-yellow-200 text-xs mt-1">
                Each hint costs 30 XP or 30% accuracy. Best used if you're less than 50% sure.
              </p>
            </div>
          </div>
        </div>
        
        {/* Remaining hints info */}
        <div className="mb-4 grid grid-cols-2 gap-3 text-center">
          <div className="bg-white/5 p-2 rounded-lg">
            <div className="text-xs text-gray-300 mb-1">This Round</div>
            <div className="text-xl font-bold text-white">
              {HINTS_PER_ROUND - hintsUsedThisRound}
              <span className="text-xs font-normal text-gray-400"> / {HINTS_PER_ROUND}</span>
            </div>
          </div>
          <div className="bg-white/5 p-2 rounded-lg">
            <div className="text-xs text-gray-300 mb-1">Total Remaining</div>
            <div className="text-xl font-bold text-white">
              {HINTS_PER_GAME - hintsUsedTotal}
              <span className="text-xs font-normal text-gray-400"> / {HINTS_PER_GAME}</span>
            </div>
          </div>
        </div>

        {/* Show selected hint if any */}
        {selectedHintType && (
          <div className="mb-6 text-center p-6 glass rounded-xl">
            <div className="mb-4">
              {selectedHintType === 'where' && <MapPin className="mx-auto h-8 w-8 text-history-secondary mb-2" />}
              {selectedHintType === 'when' && <Clock className="mx-auto h-8 w-8 text-history-secondary mb-2" />}
              <h3 className="text-lg font-medium capitalize">{selectedHintType}</h3>
            </div>
            <p className="text-xl font-medium">
              {hintContent || 'No hint content available'}
            </p>
          </div>
        )}

        {/* Show hint buttons if can select another hint */}
        {canSelectAnotherHint && (
          <div className="grid gap-4 mt-6">
            <h3 className="text-center text-lg font-medium">
              {selectedHintType ? 'Get Another Hint' : 'Get a Hint'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleHintSelection('where')}
                className={`hint-button p-4 rounded-xl glass flex items-center transition-colors ${
                  (hintsUsedThisRound >= HINTS_PER_ROUND || loadingHint) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/10'}`}
                disabled={hintsUsedThisRound >= HINTS_PER_ROUND || loadingHint !== null}
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
                  (hintsUsedThisRound >= HINTS_PER_ROUND || loadingHint) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/10'}`}
                disabled={hintsUsedThisRound >= HINTS_PER_ROUND || loadingHint !== null}
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
      </div>

      <div className="mt-6 flex justify-center gap-3">
        {selectedHintType && canSelectAnotherHint && (
          <Button
            onClick={handleBackToHints}
            variant="outline"
            className="px-6 border-gray-600 hover:bg-gray-800/50"
          >
            Back to Hints
          </Button>
        )}
        <Button
          onClick={() => onOpenChange(false)}
          className="px-6 bg-gradient-to-r from-history-secondary to-history-secondary/80 border-none hover:opacity-90"
        >
          {selectedHintType ? "Continue Guessing" : "Cancel"}
        </Button>
      </div>
    </Popup>
  );
};

export default HintModal;

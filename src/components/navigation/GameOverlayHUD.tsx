import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, HelpCircle, Target, Zap, Home, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { formatInteger } from '@/utils/format';

interface GameOverlayHUDProps {
  remainingTime?: string;
  rawRemainingTime?: number;
  onHintClick?: () => void;
  hintsUsed?: number;
  hintsAllowed?: number;
  selectedHintType?: string | null;
  currentAccuracy?: number;
  currentScore?: number;
}

const GameOverlayHUD: React.FC<GameOverlayHUDProps> = ({
  remainingTime,
  rawRemainingTime = 0,
  onHintClick,
  hintsUsed = 0,
  hintsAllowed = 0,
  selectedHintType,
  currentAccuracy = 0,
  currentScore = 0
}) => {
  const navigate = useNavigate();
  const hintsRemaining = hintsAllowed - hintsUsed;
  const isHintDisabled = hintsRemaining <= 0;
  
  const isTimeRunningOut = rawRemainingTime <= 10;
  const timerBadgeClass = isTimeRunningOut ? "bg-red-600 hover:bg-red-700" : "bg-primary";

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-4 pointer-events-none">
      {/* Top bar - Score in center, Settings and Home buttons on right */}
      <div className="flex justify-between items-start w-full">
        {/* Left Spacer to balance Settings/Home buttons */}
        <div className="invisible flex bg-black/30 backdrop-blur-sm p-2 rounded-lg space-x-2 pointer-events-none">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 p-1"
            aria-label="Settings Placeholder"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 p-1"
            aria-label="Home Placeholder"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Center - Score and accuracy */}
        <div className="flex bg-black/30 backdrop-blur-sm p-2 rounded-lg space-x-2 pointer-events-auto">
          <Badge variant="accuracy" className="flex items-center gap-1" aria-label={`Accuracy: ${Math.round(currentAccuracy)}%`}>
            <Target className="h-3 w-3" />
            <span>{formatInteger(currentAccuracy)}%</span>
          </Badge>
          <Badge variant="xp" className="flex items-center gap-1" aria-label={`Score: ${Math.round(currentScore)}`}>
            <Zap className="h-3 w-3" />
            <span>{formatInteger(currentScore)}</span>
          </Badge>
        </div>
        
        {/* Right side - Settings and Home buttons */}
        <div className="flex bg-black/30 backdrop-blur-sm p-2 rounded-lg space-x-2 pointer-events-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/settings')}
            className="h-8 w-8 p-1 text-white hover:text-gray-200 hover:bg-black/20 rounded-full"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')}
            className="h-8 w-8 p-1 text-white hover:text-gray-200 hover:bg-black/20 rounded-full"
            aria-label="Home"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Bottom bar with Hint on left and Timer on right */}
      <div className="flex justify-between items-end w-full">
        {/* Left - Hint button */}
        {onHintClick && (
          <Button 
            size="sm" 
            variant="outline" 
            className="bg-white/70 hover:bg-white text-black pointer-events-auto"
            onClick={onHintClick}
            disabled={isHintDisabled}
          >
            <HelpCircle className="h-4 w-4 mr-1" />
            <span className="mr-1">Hint</span>
            <Badge variant="default" className="text-xs">
              {selectedHintType ? selectedHintType : `${hintsRemaining}/${hintsAllowed}`}
            </Badge>
          </Button>
        )}

        {/* Right - Timer */}
        {remainingTime && (
          <Button size="sm" variant="outline" className="bg-white/70 hover:bg-white text-black pointer-events-auto">
            <Clock className="h-4 w-4 mr-1" />
            <Badge 
              variant="default" 
              className={`text-xs ${timerBadgeClass}`}
            >
              {remainingTime}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
};

export default GameOverlayHUD;

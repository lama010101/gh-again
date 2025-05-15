import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, HelpCircle, Target, Zap, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GameOverlayHUDProps {
  remainingTime?: string;
  rawRemainingTime?: number;
  onHintClick?: () => void;
  hintsUsed?: number;
  hintsAllowed?: number;
  selectedHintType?: string | null;
  currentAccuracy?: number;
  currentScore?: number;
  onMenuClick?: () => void;
}

const GameOverlayHUD: React.FC<GameOverlayHUDProps> = ({
  remainingTime,
  rawRemainingTime = 0,
  onHintClick,
  hintsUsed = 0,
  hintsAllowed = 0,
  selectedHintType,
  currentAccuracy = 0,
  currentScore = 0,
  onMenuClick
}) => {
  const hintsRemaining = hintsAllowed - hintsUsed;
  const isHintDisabled = hintsRemaining <= 0;
  
  const isTimeRunningOut = rawRemainingTime <= 10;
  const timerBadgeClass = isTimeRunningOut ? "bg-red-600 hover:bg-red-700" : "bg-primary";

  return (
    <div className="absolute top-4 z-40 flex justify-between w-full px-4">
      {/* Left side - Score and accuracy */}
      <div className="flex bg-black/30 backdrop-blur-sm p-2 rounded-lg space-x-2">
        <Badge variant="accuracy" className="flex items-center gap-1" aria-label={`Accuracy: ${Math.round(currentAccuracy)}%`}>
          <Target className="h-3 w-3" />
          <span>{Math.round(currentAccuracy)}%</span>
        </Badge>
        <Badge variant="xp" className="flex items-center gap-1" aria-label={`Score: ${Math.round(currentScore)}`}>
          <Zap className="h-3 w-3" />
          <span>{Math.round(currentScore)}</span>
        </Badge>
      </div>
      
      {/* Right side - Avatar/menu button */}
      <div className="flex bg-black/30 backdrop-blur-sm p-2 rounded-lg">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onMenuClick}
          className="h-6 w-6 p-0 text-white hover:text-gray-200 hover:bg-black/20 rounded-full"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src="/placeholder.svg" alt="Profile" />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </div>

      {/* Hint button */}
      {onHintClick && (
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/70 hover:bg-white"
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

      {/* Timer */}
      {remainingTime && (
        <Button size="sm" variant="outline" className="bg-white/70 hover:bg-white">
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
  );
};

export default GameOverlayHUD;

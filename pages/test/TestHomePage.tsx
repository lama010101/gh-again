
import { Clock, Award, User } from "lucide-react";
import { GameModeCard } from "@/components/GameModeCard";

const TestHomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-history-primary to-history-secondary text-white">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Guess <span className="text-history-light">History</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
            Test your knowledge of historical places and times in this immersive guessing game
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <GameModeCard
            title="Classic"
            description="Test your historical knowledge at your own pace. Perfect for learning and exploring."
            mode="classic"
            icon={User}
          />
          <GameModeCard
            title="Time Attack"
            description="Race against the clock! Make quick decisions about historical events."
            mode="time-attack"
            icon={Clock}
          />
          <GameModeCard
            title="Challenge"
            description="Compete with others in daily challenges and earn achievements."
            mode="challenge"
            icon={Award}
          />
        </div>
      </div>
    </div>
  );
};

export default TestHomePage;

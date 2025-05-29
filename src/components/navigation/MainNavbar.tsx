import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, Award } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { Badge } from "@/components/ui/badge";

export function MainNavbar() {
  const navigate = useNavigate();
  
  // Set up a periodic refresh every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('MainNavbar: Refreshing global metrics');
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/test')}>
          <Logo className="h-8 w-auto" />
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Global Score in center/right */}
            <div className="flex items-center">
              <Badge>
                <Award className="h-4 w-4" />
              </Badge>
            </div>
          </div>
          <nav className="flex items-center">
            {/* Menu button on the right */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              onClick={() => {}}
            >
              <span className="sr-only">Toggle menu</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};
export default MainNavbar;

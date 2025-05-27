import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

const SettingsPage = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(undefined);
  const [useSystemTheme, setUseSystemTheme] = useState(false);

  // When the component mounts, set mounted to true to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    // Check if the current theme is set to system
    if (theme === 'system') {
      setUseSystemTheme(true);
    } else {
      setCurrentTheme(theme);
    }
  }, [theme]);

  // Update theme when currentTheme changes
  useEffect(() => {
    if (currentTheme && !useSystemTheme && mounted) {
      setTheme(currentTheme);
      // Notify user of theme change
      toast({
        title: `${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)} theme applied`,
        description: `Your preference has been saved.`,
        duration: 2000,
      });
    }
  }, [currentTheme, useSystemTheme, setTheme, mounted]);

  // Handle system theme toggle
  const handleSystemThemeToggle = (checked: boolean) => {
    setUseSystemTheme(checked);
    if (checked) {
      setTheme('system');
      toast({
        title: 'System theme enabled',
        description: 'Using your device preferences',
        duration: 2000,
      });
    } else {
      // When disabling system theme, use the current resolved theme as default
      const newTheme = resolvedTheme || 'light';
      setCurrentTheme(newTheme);
      setTheme(newTheme);
    }
  };

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-8 text-history-primary">Settings</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Theme Settings</CardTitle>
          <CardDescription>
            Customize the appearance of the application
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* System Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center">
                <MonitorIcon className="mr-2 h-5 w-5" />
                <Label htmlFor="system-theme">Use System Theme</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Follow your device's theme settings
              </p>
            </div>
            <Switch
              id="system-theme"
              checked={useSystemTheme}
              onCheckedChange={handleSystemThemeToggle}
            />
          </div>
          
          {/* Manual Theme Selection (disabled when system theme is on) */}
          {!useSystemTheme && (
            <div>
              <h3 className="text-sm font-medium mb-3">Select Theme</h3>
              <RadioGroup 
                value={currentTheme} 
                onValueChange={setCurrentTheme} 
                className="grid grid-cols-2 gap-4"
              >
                {/* Light Theme Option */}
                <div>
                  <RadioGroupItem value="light" id="theme-light" className="peer sr-only" />
                  <Label 
                    htmlFor="theme-light" 
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-background p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <SunIcon className="h-8 w-8 mb-2 text-history-primary" />
                    Light
                  </Label>
                </div>
                
                {/* Dark Theme Option */}
                <div>
                  <RadioGroupItem value="dark" id="theme-dark" className="peer sr-only" />
                  <Label 
                    htmlFor="theme-dark" 
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-background p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <MoonIcon className="h-8 w-8 mb-2 text-history-primary" />
                    Dark
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
          
          {/* Current Theme Information */}
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Currently using: <span className="font-medium">{useSystemTheme ? 'System' : currentTheme?.charAt(0).toUpperCase() + currentTheme?.slice(1)}</span> theme
              {useSystemTheme && (
                <span> (detected as {resolvedTheme?.charAt(0).toUpperCase() + resolvedTheme?.slice(1)})</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage; // Export with new name 
/**
 * Profile Page
 * 
 * User profile and settings
 */

import { User, LogOut, Settings, Shield, Database, ExternalLink, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, SignOutButton, UserProfile } from '@clerk/clerk-react';
import { useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';

interface ProfilePageProps {
  totalGames: number;
  totalValue: number;
}

export const ProfilePage = ({ totalGames, totalValue }: ProfilePageProps) => {
  const { isSignedIn, userId } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Profile
          </h1>
        </header>

        {/* User Info */}
        <div className="card-premium p-4 mb-6">
          {isSignedIn ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Signed In</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {userId?.slice(0, 20)}...
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProfile(!showProfile)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              {showProfile && (
                <div className="pt-4 border-t border-border">
                  <UserProfile />
                </div>
              )}

              <SignOutButton>
                <Button variant="outline" className="w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          ) : (
            <div className="text-center py-4">
              <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">Sign in to sync your collection</p>
              <Button asChild className="bg-gradient-to-r from-violet-500 to-purple-600">
                <a href="/auth">Sign In</a>
              </Button>
            </div>
          )}
        </div>

        {/* Collection Stats */}
        <div className="card-premium p-4 mb-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Collection Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <p className="text-3xl font-display font-bold text-foreground">{totalGames}</p>
              <p className="text-xs text-muted-foreground">Total Games</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <p className="text-3xl font-display font-bold text-foreground">
                ${totalValue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Value</p>
            </div>
          </div>
        </div>

        {/* Data Status */}
        <div className="card-premium p-4 mb-6">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Storage
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cloud Sync (Supabase)</span>
              <span className={`text-xs px-2 py-1 rounded ${
                isSupabaseConfigured() 
                  ? 'bg-success/20 text-success' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isSupabaseConfigured() ? 'Connected' : 'Not Configured'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Local Storage</span>
              <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">Active</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card-premium p-4">
          <h3 className="font-display font-semibold text-foreground mb-4">About gil0</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Track your video game collection and watch its value grow over time. 
            Powered by real market data from PriceCharting.
          </p>
          <div className="flex items-center gap-4">
            <a 
              href="https://www.pricecharting.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              PriceCharting <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

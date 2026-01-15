/**
 * Alerts Page
 * 
 * Shows price change notifications for user's games
 */

import { useState, useEffect } from 'react';
import { Bell, TrendingUp, TrendingDown, RefreshCw, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Asset } from '@/types/asset';
import { lookupPrice } from '@/services/priceLookup';

interface PriceAlert {
  id: string;
  gameId: string;
  gameName: string;
  platform: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  timestamp: Date;
  read: boolean;
}

interface AlertsPageProps {
  games: Asset[];
  onUpdateGame: (game: Asset) => void;
}

export const AlertsPage = ({ games, onUpdateGame }: AlertsPageProps) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [alertSettings, setAlertSettings] = useState({
    notifyIncrease: true,
    notifyDecrease: true,
    threshold: 5, // Minimum % change to alert
  });

  // Load alerts from localStorage
  useEffect(() => {
    const savedAlerts = localStorage.getItem('gil0-alerts');
    if (savedAlerts) {
      const parsed = JSON.parse(savedAlerts);
      setAlerts(parsed.map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) })));
    }
    
    const lastCheck = localStorage.getItem('gil0-last-price-check');
    if (lastCheck) {
      setLastChecked(new Date(lastCheck));
    }
  }, []);

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem('gil0-alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Check prices for all games
  const checkPrices = async () => {
    if (games.length === 0) return;

    setIsChecking(true);
    const newAlerts: PriceAlert[] = [];

    for (const game of games) {
      try {
        const priceData = await lookupPrice({
          category: 'video-games',
          name: game.name,
          details: {
            platform: game.videoGameDetails?.platform || '',
            conditionType: game.videoGameDetails?.conditionType || 'cib',
          },
        });

        const newValue = priceData.estimatedValue;
        const oldValue = game.currentValue;
        const changePercent = ((newValue - oldValue) / oldValue) * 100;

        // Only alert if change exceeds threshold
        if (Math.abs(changePercent) >= alertSettings.threshold) {
          const isIncrease = changePercent > 0;
          
          if ((isIncrease && alertSettings.notifyIncrease) || 
              (!isIncrease && alertSettings.notifyDecrease)) {
            newAlerts.push({
              id: `alert-${Date.now()}-${game.id}`,
              gameId: game.id,
              gameName: game.name,
              platform: game.videoGameDetails?.platform || '',
              previousValue: oldValue,
              currentValue: newValue,
              changePercent,
              timestamp: new Date(),
              read: false,
            });
          }
        }

        // Update game's current value
        if (Math.abs(newValue - oldValue) > 0.5) {
          onUpdateGame({
            ...game,
            currentValue: newValue,
            lastUpdated: new Date().toISOString().split('T')[0],
          });
        }

        // Add small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Failed to check price for ${game.name}:`, error);
      }
    }

    setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Keep last 50 alerts
    setLastChecked(new Date());
    localStorage.setItem('gil0-last-price-check', new Date().toISOString());
    setIsChecking(false);
  };

  // Mark alert as read
  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, read: true } : a
    ));
  };

  // Clear all alerts
  const clearAlerts = () => {
    setAlerts([]);
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Price Alerts
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track value changes in your collection
            </p>
          </div>
        </header>

        {/* Check Prices Button */}
        <div className="card-premium p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-foreground">Price Check</p>
              {lastChecked && (
                <p className="text-xs text-muted-foreground">
                  Last checked: {lastChecked.toLocaleDateString()} at{' '}
                  {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <Button
              onClick={checkPrices}
              disabled={isChecking || games.length === 0}
              className="bg-gradient-to-r from-violet-500 to-purple-600"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Now
                </>
              )}
            </Button>
          </div>

          {/* Settings */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Alert on price increase</span>
              <Switch
                checked={alertSettings.notifyIncrease}
                onCheckedChange={(checked) => 
                  setAlertSettings(prev => ({ ...prev, notifyIncrease: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Alert on price decrease</span>
              <Switch
                checked={alertSettings.notifyDecrease}
                onCheckedChange={(checked) => 
                  setAlertSettings(prev => ({ ...prev, notifyDecrease: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Minimum change threshold</span>
              <select
                value={alertSettings.threshold}
                onChange={(e) => 
                  setAlertSettings(prev => ({ ...prev, threshold: Number(e.target.value) }))
                }
                className="bg-secondary text-foreground text-sm rounded-lg px-2 py-1 border border-border"
              >
                <option value={1}>1%</option>
                <option value={5}>5%</option>
                <option value={10}>10%</option>
                <option value={20}>20%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        {alerts.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-foreground">Recent Alerts</h3>
              <button
                onClick={clearAlerts}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {alerts.map(alert => {
                const isIncrease = alert.changePercent > 0;
                return (
                  <div
                    key={alert.id}
                    onClick={() => markAsRead(alert.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      alert.read 
                        ? 'bg-secondary/30' 
                        : 'bg-secondary/70 border border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isIncrease ? 'bg-success/20' : 'bg-destructive/20'
                        }`}>
                          {isIncrease ? (
                            <TrendingUp className="w-4 h-4 text-success" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${
                            alert.read ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {alert.gameName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {alert.platform}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          isIncrease ? 'text-success' : 'text-destructive'
                        }`}>
                          {isIncrease ? '+' : ''}{alert.changePercent.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${alert.previousValue} → ${alert.currentValue}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {alert.timestamp.toLocaleDateString()} at{' '}
                      {alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No alerts yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Check Now" to scan for price changes
            </p>
          </div>
        )}

        {games.length === 0 && (
          <div className="card-premium p-4 text-center">
            <p className="text-muted-foreground">Add games to your collection to receive price alerts</p>
          </div>
        )}
      </div>
    </div>
  );
};

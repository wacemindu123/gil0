import { LayoutGrid, TrendingUp, Bell, User } from 'lucide-react';

type NavItem = 'portfolio' | 'market' | 'alerts' | 'profile';

interface BottomNavProps {
  activeItem: NavItem;
  onItemChange: (item: NavItem) => void;
}

const navItems: { id: NavItem; icon: typeof LayoutGrid; label: string }[] = [
  { id: 'portfolio', icon: LayoutGrid, label: 'Portfolio' },
  { id: 'market', icon: TrendingUp, label: 'Market' },
  { id: 'alerts', icon: Bell, label: 'Alerts' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export const BottomNav = ({ activeItem, onItemChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-effect border-t border-border z-40 pb-safe">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onItemChange(item.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute -bottom-0.5 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

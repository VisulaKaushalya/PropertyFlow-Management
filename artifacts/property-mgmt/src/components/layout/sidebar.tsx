import { Building2, Home, Users, CreditCard, FileText, LayoutDashboard, Search, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/properties', label: 'Properties', icon: Building2 },
  { path: '/tenants', label: 'Tenants', icon: Users },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/documents', label: 'Documents', icon: FileText },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <aside className="w-[280px] h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center transition-all duration-300 ease-in-out group-hover:scale-110">
            <Building2 size={20} className="text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-foreground font-serif tracking-tight">
            PropManager
          </span>
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 pt-4">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search properties, tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 rounded-full bg-muted/20 border-sidebar-border text-sidebar-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary transition-all duration-300 ease-in-out"
              data-testid="input-global-search"
            />
          </div>
        </form>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ease-in-out
                ${isActive 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/10 hover:text-sidebar-accent'
                }
              `}
              data-testid={`link-nav-${item.label.toLowerCase()}`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Upgrade Card */}
      <div className="m-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground mb-1">Upgrade to Pro</p>
            <p className="text-xs text-muted-foreground mb-3">Unlock unlimited properties and advanced analytics</p>
            <button className="w-full px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all duration-300 ease-in-out">
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 rounded-2xl">
            <AvatarFallback className="rounded-2xl bg-secondary text-secondary-foreground font-semibold">
              AD
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">Admin</p>
            <p className="text-xs text-muted-foreground truncate">admin@propmanager.io</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

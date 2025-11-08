import { Outlet, Link, useLocation } from 'react-router-dom';
import { Activity, BarChart3, Network, Package, Shield } from 'lucide-react';

export function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/traces', label: 'Trace Explorer', icon: Activity },
    { path: '/sequence', label: 'Sequence Diagram', icon: Network },
    { path: '/catalog', label: 'Catalog', icon: Package },
    { path: '/policies', label: 'Policies', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">AgentOS</h1>
              <span className="text-sm text-muted-foreground">Mock Platform</span>
            </div>
            <nav className="flex gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

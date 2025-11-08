import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  Workflow,
  Flame,
  Shield,
  Library,
  FileJson,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { useUIStore } from '../store/ui';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Trace Explorer', href: '/traces', icon: Network },
  { name: 'Sequence Diagram', href: '/sequence', icon: Workflow },
  { name: 'Flamegraph', href: '/flamegraph', icon: Flame },
  { name: 'Policies & Audit', href: '/policies', icon: Shield },
  { name: 'Catalog', href: '/catalog', icon: Library },
  { name: 'OTel Preview', href: '/otel/preview', icon: FileJson },
  { name: 'Demo Mode', href: '/demo', icon: Sparkles },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, alerts, verifiedPct, setSidebarCollapsed } = useUIStore();

  return (
    <div
      className={cn(
        'fixed left-0 top-16 bottom-0 bg-gray-900 border-r border-gray-800 transition-all duration-300 z-10',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-4 bg-gray-800 border border-gray-700 rounded-full p-1 hover:bg-gray-700"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', sidebarCollapsed ? '' : 'mr-3')} />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Alerts
              </span>
              <Badge className="bg-red-600 text-white text-xs px-2">{alerts.open}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Verified %</span>
              <Badge className="bg-green-600 text-white text-xs px-2">{verifiedPct}%</Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useUIStore } from '../store/ui';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarCollapsed, incidentActive, setIncidentActive } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-20">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold text-white">AgentOS Mock</h1>
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">YC Demo</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
            Demo Tour
          </button>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
            Simulate Incident
          </button>
        </div>
      </header>

      {incidentActive && (
        <div className="fixed top-16 left-0 right-0 bg-red-600 text-white px-4 py-3 flex items-center justify-between z-30">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error% spiking in agent_writer</span>
            <button className="ml-4 underline hover:no-underline">Click to investigate</button>
          </div>
          <button
            onClick={() => setIncidentActive(false)}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}

      <Sidebar />

      <main
        className={cn(
          'pt-16 transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64',
          incidentActive ? 'mt-12' : ''
        )}
      >
        <div className="container mx-auto px-4 py-6">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}

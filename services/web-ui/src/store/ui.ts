import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  alerts: {
    open: number;
  };
  verifiedPct: number;
  activeTraceId: string | null;
  incidentActive: boolean;
  
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAlerts: (alerts: { open: number }) => void;
  setVerifiedPct: (pct: number) => void;
  setActiveTraceId: (id: string | null) => void;
  setIncidentActive: (active: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  alerts: { open: 0 },
  verifiedPct: 97,
  activeTraceId: null,
  incidentActive: false,
  
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setAlerts: (alerts) => set({ alerts }),
  setVerifiedPct: (pct) => set({ verifiedPct: pct }),
  setActiveTraceId: (id) => set({ activeTraceId: id }),
  setIncidentActive: (active) => set({ incidentActive: active }),
}));

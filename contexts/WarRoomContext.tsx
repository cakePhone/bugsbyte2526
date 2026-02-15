"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";

/**
 * GEISHA GAINS — WAR ROOM STATE MANAGEMENT
 * 
 * Manages superpositioned graph layers + tactical state.
 * Think military radar with multiple data transparencies.
 */

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface GraphLayer {
  id: string;
  symbol: string;
  color: string;
  lineStyle: "solid" | "dashed";
  lineWidth: number;
  isPrimary: boolean;
  visible: boolean;
  zIndex: number;
}

export interface TacticalPortal {
  x: number;
  y: number;
  symbol: string;
  currentPrice: number;
  aiPrediction: "BULLISH" | "BEARISH" | "NEUTRAL";
  trendConfidence: number;
}

export interface PurchaseMarker {
  id: string;
  symbol: string;
  entryPrice: number;
  timestamp: number;
  quantity: number;
}

export type TimeWindow = "1H" | "1D" | "1W" | "1M";
export type ChartType = "LINE" | "CANDLESTICK";

export interface WarRoomState {
  // Superpositioned Layers
  layers: GraphLayer[];
  activeLayerId: string | null;
  
  // Tactical Portal (hover info)
  portal: TacticalPortal | null;
  
  // Purchase Markers
  purchaseMarkers: PurchaseMarker[];
  
  // Chart Configuration
  chartType: ChartType;
  
  // Buy Mode
  buyMode: { active: boolean; symbol: string | null };
  
  // Time Controls
  timeWindow: TimeWindow;
  
  // Search
  searchQuery: string;
  
  // Overlay Menu
  overlayMenuOpen: boolean;
  
  // System Status
  nimLatency: number;
  upholdApiStatus: "ACTIVE" | "DEGRADED" | "OFFLINE";
}

// ─────────────────────────────────────────────────────────────────
// COLOR PALETTE FOR LAYERS
// ─────────────────────────────────────────────────────────────────

// HIGH-CONTRAST LAYER COLORS — V4 Palette
const LAYER_COLORS = [
  "#FFFFFF", // Primary - White
  "#FF3B3B", // Signal Red
  "#00FF88", // Emerald Green
  "#00D4FF", // Electric Cyan
  "#FFD93D", // Tactical Yellow
  "#FF6B00", // Combat Orange
  "#A855F7", // Ultraviolet
];

// ─────────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────────

type WarRoomAction =
  | { type: "ADD_LAYER"; payload: { symbol: string } }
  | { type: "REMOVE_LAYER"; payload: { id: string } }
  | { type: "SET_PRIMARY_LAYER"; payload: { id: string } }
  | { type: "TOGGLE_LAYER_VISIBILITY"; payload: { id: string } }
  | { type: "SET_ACTIVE_LAYER"; payload: { id: string | null } }
  | { type: "REORDER_LAYERS"; payload: { layers: GraphLayer[] } }
  | { type: "SOLO_ASSET"; payload: { symbol: string } }
  | { type: "SUPERIMPOSE_ASSET"; payload: { symbol: string } }
  | { type: "INIT_LAYERS"; payload: { symbols: string[] } }
  | { type: "SET_TIME_WINDOW"; payload: { window: TimeWindow } }
  | { type: "SET_PORTAL"; payload: TacticalPortal | null }
  | { type: "SET_SEARCH_QUERY"; payload: { query: string } }
  | { type: "TOGGLE_OVERLAY_MENU" }
  | { type: "CLOSE_OVERLAY_MENU" }
  | { type: "UPDATE_SYSTEM_STATUS"; payload: { nimLatency?: number; upholdApiStatus?: "ACTIVE" | "DEGRADED" | "OFFLINE" } }
  | { type: "SET_CHART_TYPE"; payload: { chartType: ChartType } }
  | { type: "SET_BUY_MODE"; payload: { active: boolean; symbol: string | null } }
  | { type: "ADD_PURCHASE_MARKER"; payload: PurchaseMarker }
  | { type: "REMOVE_PURCHASE_MARKER"; payload: { id: string } };

// ─────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────

const initialState: WarRoomState = {
  layers: [],
  activeLayerId: null,
  portal: null,
  purchaseMarkers: [],
  chartType: "LINE",
  buyMode: { active: false, symbol: null },
  timeWindow: "1D",
  searchQuery: "",
  overlayMenuOpen: false,
  nimLatency: 12,
  upholdApiStatus: "ACTIVE",
};

// ─────────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────────

function warRoomReducer(state: WarRoomState, action: WarRoomAction): WarRoomState {
  switch (action.type) {
    case "ADD_LAYER": {
      const { symbol } = action.payload;
      
      // Check if layer already exists
      if (state.layers.some((l) => l.symbol === symbol)) {
        return state;
      }
      
      const colorIndex = state.layers.length % LAYER_COLORS.length;
      const newLayer: GraphLayer = {
        id: `layer-${symbol.toLowerCase()}-${Date.now()}`,
        symbol,
        color: LAYER_COLORS[colorIndex],
        lineStyle: state.layers.length === 0 ? "solid" : "dashed",
        lineWidth: state.layers.length === 0 ? 3 : 1.5,
        isPrimary: state.layers.length === 0,
        visible: true,
        zIndex: 99 - state.layers.length,
      };
      
      return {
        ...state,
        layers: [...state.layers, newLayer],
        overlayMenuOpen: false,
      };
    }

    case "REMOVE_LAYER": {
      const { id } = action.payload;
      const filtered = state.layers.filter((l) => l.id !== id);
      
      // If removing primary, promote the first remaining layer
      if (filtered.length > 0 && !filtered.some((l) => l.isPrimary)) {
        filtered[0].isPrimary = true;
        filtered[0].lineStyle = "solid";
        filtered[0].lineWidth = 3;
        filtered[0].color = "#FFFFFF";
      }
      
      return {
        ...state,
        layers: filtered,
        activeLayerId: state.activeLayerId === id ? (filtered[0]?.id || null) : state.activeLayerId,
      };
    }

    case "SET_PRIMARY_LAYER": {
      const { id } = action.payload;
      return {
        ...state,
        layers: state.layers.map((layer, index) => ({
          ...layer,
          isPrimary: layer.id === id,
          lineStyle: layer.id === id ? "solid" : "dashed",
          lineWidth: layer.id === id ? 3 : 1.5,
          color: layer.id === id ? "#FFFFFF" : LAYER_COLORS[(index + 1) % LAYER_COLORS.length],
        })),
      };
    }

    case "TOGGLE_LAYER_VISIBILITY": {
      return {
        ...state,
        layers: state.layers.map((layer) =>
          layer.id === action.payload.id
            ? { ...layer, visible: !layer.visible }
            : layer
        ),
      };
    }

    case "SET_ACTIVE_LAYER": {
      return { ...state, activeLayerId: action.payload.id };
    }

    case "REORDER_LAYERS": {
      return { ...state, layers: action.payload.layers };
    }

    case "SOLO_ASSET": {
      const { symbol } = action.payload;
      const soloLayer: GraphLayer = {
        id: `layer-${symbol.toLowerCase()}-${Date.now()}`,
        symbol,
        color: "#FFFFFF",
        lineStyle: "solid",
        lineWidth: 3,
        isPrimary: true,
        visible: true,
        zIndex: 100,
      };
      return {
        ...state,
        layers: [soloLayer],
        activeLayerId: soloLayer.id,
      };
    }

    case "SUPERIMPOSE_ASSET": {
      const { symbol } = action.payload;
      // If already exists, just toggle it visible
      const existing = state.layers.find((l) => l.symbol === symbol);
      if (existing) {
        return {
          ...state,
          layers: state.layers.map((l) =>
            l.id === existing.id ? { ...l, visible: true } : l
          ),
        };
      }
      const colorIndex = state.layers.length % LAYER_COLORS.length;
      const superLayer: GraphLayer = {
        id: `layer-${symbol.toLowerCase()}-${Date.now()}`,
        symbol,
        color: LAYER_COLORS[colorIndex === 0 ? 1 : colorIndex], // skip white for non-primary
        lineStyle: "dashed",
        lineWidth: 1.5,
        isPrimary: false,
        visible: true,
        zIndex: 99 - state.layers.length,
      };
      return {
        ...state,
        layers: [...state.layers, superLayer],
      };
    }

    case "INIT_LAYERS": {
      const { symbols } = action.payload;
      if (symbols.length === 0 || state.layers.length > 0) return state;
      const firstSymbol = symbols[0];
      const initLayer: GraphLayer = {
        id: `layer-${firstSymbol.toLowerCase()}-init`,
        symbol: firstSymbol,
        color: "#FFFFFF",
        lineStyle: "solid",
        lineWidth: 3,
        isPrimary: true,
        visible: true,
        zIndex: 100,
      };
      return {
        ...state,
        layers: [initLayer],
        activeLayerId: initLayer.id,
      };
    }

    case "SET_TIME_WINDOW": {
      return { ...state, timeWindow: action.payload.window };
    }

    case "SET_PORTAL": {
      return { ...state, portal: action.payload };
    }

    case "SET_SEARCH_QUERY": {
      return { ...state, searchQuery: action.payload.query };
    }

    case "TOGGLE_OVERLAY_MENU": {
      return { ...state, overlayMenuOpen: !state.overlayMenuOpen };
    }

    case "CLOSE_OVERLAY_MENU": {
      return { ...state, overlayMenuOpen: false };
    }

    case "UPDATE_SYSTEM_STATUS": {
      return {
        ...state,
        nimLatency: action.payload.nimLatency ?? state.nimLatency,
        upholdApiStatus: action.payload.upholdApiStatus ?? state.upholdApiStatus,
      };
    }

    case "SET_CHART_TYPE": {
      return { ...state, chartType: action.payload.chartType };
    }

    case "SET_BUY_MODE": {
      return { ...state, buyMode: action.payload };
    }

    case "ADD_PURCHASE_MARKER": {
      return {
        ...state,
        purchaseMarkers: [...state.purchaseMarkers, action.payload],
      };
    }

    case "REMOVE_PURCHASE_MARKER": {
      return {
        ...state,
        purchaseMarkers: state.purchaseMarkers.filter((m) => m.id !== action.payload.id),
      };
    }

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────

interface WarRoomContextValue {
  state: WarRoomState;
  
  // Layer actions
  addLayer: (symbol: string) => void;
  removeLayer: (id: string) => void;
  setPrimaryLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  setActiveLayer: (id: string | null) => void;
  reorderLayers: (layers: GraphLayer[]) => void;
  soloAsset: (symbol: string) => void;
  superimposeAsset: (symbol: string) => void;
  initLayers: (symbols: string[]) => void;
  
  // Time controls
  setTimeWindow: (window: TimeWindow) => void;
  
  // Chart type
  setChartType: (chartType: ChartType) => void;
  
  // Portal
  setPortal: (portal: TacticalPortal | null) => void;
  
  // Search
  setSearchQuery: (query: string) => void;
  
  // Buy mode
  setBuyMode: (active: boolean, symbol: string | null) => void;
  
  // Purchase markers
  addPurchaseMarker: (marker: PurchaseMarker) => void;
  removePurchaseMarker: (id: string) => void;
  
  // Overlay menu
  toggleOverlayMenu: () => void;
  closeOverlayMenu: () => void;
  
  // System status
  updateSystemStatus: (status: { nimLatency?: number; upholdApiStatus?: "ACTIVE" | "DEGRADED" | "OFFLINE" }) => void;
}

const WarRoomContext = createContext<WarRoomContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────

export function WarRoomProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(warRoomReducer, initialState);

  const addLayer = useCallback((symbol: string) => {
    dispatch({ type: "ADD_LAYER", payload: { symbol } });
  }, []);

  const removeLayer = useCallback((id: string) => {
    dispatch({ type: "REMOVE_LAYER", payload: { id } });
  }, []);

  const setPrimaryLayer = useCallback((id: string) => {
    dispatch({ type: "SET_PRIMARY_LAYER", payload: { id } });
  }, []);

  const toggleLayerVisibility = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_LAYER_VISIBILITY", payload: { id } });
  }, []);

  const setActiveLayer = useCallback((id: string | null) => {
    dispatch({ type: "SET_ACTIVE_LAYER", payload: { id } });
  }, []);

  const reorderLayers = useCallback((layers: GraphLayer[]) => {
    dispatch({ type: "REORDER_LAYERS", payload: { layers } });
  }, []);

  const soloAsset = useCallback((symbol: string) => {
    dispatch({ type: "SOLO_ASSET", payload: { symbol } });
  }, []);

  const superimposeAsset = useCallback((symbol: string) => {
    dispatch({ type: "SUPERIMPOSE_ASSET", payload: { symbol } });
  }, []);

  const initLayers = useCallback((symbols: string[]) => {
    dispatch({ type: "INIT_LAYERS", payload: { symbols } });
  }, []);

  const setTimeWindow = useCallback((window: TimeWindow) => {
    dispatch({ type: "SET_TIME_WINDOW", payload: { window } });
  }, []);

  const setPortal = useCallback((portal: TacticalPortal | null) => {
    dispatch({ type: "SET_PORTAL", payload: portal });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: "SET_SEARCH_QUERY", payload: { query } });
  }, []);

  const toggleOverlayMenu = useCallback(() => {
    dispatch({ type: "TOGGLE_OVERLAY_MENU" });
  }, []);

  const closeOverlayMenu = useCallback(() => {
    dispatch({ type: "CLOSE_OVERLAY_MENU" });
  }, []);

  const updateSystemStatus = useCallback(
    (status: { nimLatency?: number; upholdApiStatus?: "ACTIVE" | "DEGRADED" | "OFFLINE" }) => {
      dispatch({ type: "UPDATE_SYSTEM_STATUS", payload: status });
    },
    []
  );

  const setChartType = useCallback((chartType: ChartType) => {
    dispatch({ type: "SET_CHART_TYPE", payload: { chartType } });
  }, []);

  const setBuyMode = useCallback((active: boolean, symbol: string | null) => {
    dispatch({ type: "SET_BUY_MODE", payload: { active, symbol } });
  }, []);

  const addPurchaseMarker = useCallback((marker: PurchaseMarker) => {
    dispatch({ type: "ADD_PURCHASE_MARKER", payload: marker });
  }, []);

  const removePurchaseMarker = useCallback((id: string) => {
    dispatch({ type: "REMOVE_PURCHASE_MARKER", payload: { id } });
  }, []);

  const value: WarRoomContextValue = {
    state,
    addLayer,
    removeLayer,
    setPrimaryLayer,
    toggleLayerVisibility,
    setActiveLayer,
    reorderLayers,
    soloAsset,
    superimposeAsset,
    initLayers,
    setTimeWindow,
    setChartType,
    setPortal,
    setSearchQuery,
    setBuyMode,
    addPurchaseMarker,
    removePurchaseMarker,
    toggleOverlayMenu,
    closeOverlayMenu,
    updateSystemStatus,
  };

  return (
    <WarRoomContext.Provider value={value}>
      {children}
    </WarRoomContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

export function useWarRoom() {
  const context = useContext(WarRoomContext);
  if (!context) {
    throw new Error("useWarRoom must be used within a WarRoomProvider");
  }
  return context;
}

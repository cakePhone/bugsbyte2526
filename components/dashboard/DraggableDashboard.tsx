"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Responsive } from "react-grid-layout";
import { ReactNode } from "react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Drag Handle Component
function DragHandle() {
  return (
    <div className="drag-handle" title="Arrastar">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="4" cy="4" r="1.5" fill="currentColor" opacity="0.5" />
        <circle cx="4" cy="8" r="1.5" fill="currentColor" opacity="0.5" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" opacity="0.5" />
        <circle cx="12" cy="4" r="1.5" fill="currentColor" opacity="0.5" />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" opacity="0.5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.5" />
      </svg>
    </div>
  );
}

export interface DashboardLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface DashboardPanelConfig {
  id: string;
  title?: string;
  component: ReactNode;
  defaultLayout: {
    lg: DashboardLayoutItem;
    md: DashboardLayoutItem;
    sm: DashboardLayoutItem;
    xs: DashboardLayoutItem;
  };
  resizable?: boolean;
  draggable?: boolean;
}

interface DraggableDashboardProps {
  panels: DashboardPanelConfig[];
  onLayoutChange?: (layouts: any) => void;
  className?: string;
}

const defaultBreakpoints = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
};

const defaultCols = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
};

export default function DraggableDashboard({
  panels,
  onLayoutChange,
  className = "",
}: DraggableDashboardProps) {
  const [layouts, setLayouts] = useState<any>({});
  const [mounted, setMounted] = useState(false);
  const [width, setWidth] = useState(1200);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutsRef = useRef<any>(null);

  // Debounced save to localStorage
  const saveToLocalStorage = useMemo(
    () =>
      debounce((layouts: any) => {
        localStorage.setItem("dashboard-layouts", JSON.stringify(layouts));
      }, 500),
    []
  );

  useEffect(() => {
    setMounted(true);
    
    // Load saved layout from localStorage
    const savedLayouts = localStorage.getItem("dashboard-layouts");
    if (savedLayouts) {
      try {
        setLayouts(JSON.parse(savedLayouts));
      } catch (error) {
        console.error("Error loading saved layouts:", error);
      }
    }

    // Handle window resize with debounce
    const handleResize = debounce(() => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    }, 150);

    // Set initial width
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const defaultLayouts = useMemo(() => {
    const result: any = {};
    Object.keys(defaultBreakpoints).forEach(breakpoint => {
      result[breakpoint] = panels.map(panel => ({
        ...panel.defaultLayout[breakpoint as keyof typeof panel.defaultLayout],
        // Enable dragging and resizing by default
        static: false,
        isDraggable: true,
        isResizable: true,
      }));
    });
    return result;
  }, [panels]);

  const currentLayouts = useMemo(() => {
    if (Object.keys(layouts).length === 0) {
      return defaultLayouts;
    }
    return layouts;
  }, [layouts, defaultLayouts]);

  const handleLayoutChange = useCallback((layout: any, allLayouts: any) => {
    layoutsRef.current = allLayouts;
    setLayouts(allLayouts);
    
    // Save to localStorage with debounce
    saveToLocalStorage(allLayouts);
    
    onLayoutChange?.(allLayouts);
  }, [onLayoutChange, saveToLocalStorage]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback(() => {
    setIsDragging(false);
    // Force save on drag stop
    if (layoutsRef.current) {
      localStorage.setItem("dashboard-layouts", JSON.stringify(layoutsRef.current));
    }
  }, []);

  const handleResizeStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleResizeStop = useCallback(() => {
    setIsDragging(false);
    // Force save on resize stop
    if (layoutsRef.current) {
      localStorage.setItem("dashboard-layouts", JSON.stringify(layoutsRef.current));
    }
  }, []);

  const resetLayout = useCallback(() => {
    setLayouts({});
    localStorage.removeItem("dashboard-layouts");
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm">LOADING DASHBOARD...</div>
      </div>
    );
  }

  return (
    <div className={`dashboard-grid ${className} ${isDragging ? 'is-dragging' : ''}`} ref={containerRef}>
      <div className="mb-4 text-right relative z-50">
        <button
          onClick={resetLayout}
          className="border-2 border-gray-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:border-white hover:text-white transition-colors relative z-50"
        >
          RESET LAYOUT
        </button>
      </div>
      
      <Responsive
        className="layout"
        layouts={currentLayouts}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResizeStop={handleResizeStop}
        breakpoints={defaultBreakpoints}
        cols={defaultCols}
        rowHeight={60}
        width={width}
        resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
        draggableHandle=".drag-handle"
        useCSSTransforms={true}
      >
        {panels.map((panel) => (
          <div key={panel.id} className="dashboard-panel-wrapper">
            <DragHandle />
            <div className="panel-content">
              {panel.component}
            </div>
          </div>
        ))}
      </Responsive>

      <style jsx global>{`
        .react-grid-layout {
          position: relative;
        }

        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }

        /* Disable transitions during drag for better performance */
        .is-dragging .react-grid-item {
          transition: none !important;
        }

        .is-dragging .react-grid-item.react-draggable-dragging {
          transition: none !important;
          z-index: 100;
        }

        .react-grid-item:not(.react-grid-placeholder) {
          border: 2px solid transparent;
        }

        .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }

        .is-dragging .react-grid-item.cssTransforms {
          transition: none !important;
        }

        .react-grid-item.react-draggable-dragging {
          transition: none !important;
          will-change: transform;
        }

        .react-grid-item.resizing {
          transition: none !important;
          will-change: width, height;
        }

        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 100;
          right: 100;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA2IDYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgb3BhY2l0eT0iLjMiPjxwYXRoIGQ9Im02IDBjMCAxLjEtLjkgMi0yIDJzLTItLjktMi0yIC45LTIgMi0yIDIgLjkgMiAyeiIgZmlsbD0iIzQ0NCIvPjwvZz48L3N2Zz4=') no-repeat;
          background-position: bottom right;
          padding: 0 3px 3px 0;
          background-repeat: no-repeat;
          background-origin: content-box;
          box-sizing: border-box;
          cursor: se-resize;
          z-index: 20;
        }

        .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 5px;
          height: 5px;
          border-right: 2px solid rgba(255,255,255,0.4);
          border-bottom: 2px solid rgba(255,255,255,0.4);
        }

        .react-grid-item:hover > .react-resizable-handle::after {
          border-right: 2px solid rgba(255,255,255,0.8);
          border-bottom: 2px solid rgba(255,255,255,0.8);
        }

        .react-grid-placeholder {
          background: rgba(255, 255, 255, 0.1) !important;
          border: 2px dashed rgba(255, 255, 255, 0.3) !important;
          opacity: 0.8;
          transition: none !important;
          z-index: 2;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -o-user-select: none;
          user-select: none;
        }

        .react-grid-item.react-grid-drag-highlight {
          border-color: rgba(255, 255, 255, 0.5);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
        }

        .dashboard-panel-wrapper {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          will-change: auto;
          position: relative;
          overflow: hidden;
        }

        .is-dragging .dashboard-panel-wrapper {
          will-change: transform;
        }

        /* Drag Handle Styles */
        .drag-handle {
          position: absolute;
          top: 0;
          left: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          color: rgba(255, 255, 255, 0.3);
          z-index: 10;
          transition: color 0.2s ease, background-color 0.2s ease;
          border-radius: 0 0 4px 0;
        }

        .drag-handle:hover {
          color: rgba(255, 255, 255, 0.7);
          background-color: rgba(255, 255, 255, 0.05);
        }

        .drag-handle:active {
          cursor: grabbing;
          color: rgba(255, 255, 255, 0.9);
          background-color: rgba(255, 255, 255, 0.1);
        }

        .is-dragging .drag-handle {
          cursor: grabbing;
        }

        .panel-content {
          flex: 1 1 auto;
          min-height: 0;
          min-width: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .panel-content > * {
          flex: 1 1 auto;
          min-height: 0;
          min-width: 0;
          width: 100%;
          height: 100%;
        }

        .react-grid-layout .dashboard-panel-wrapper {
          cursor: default;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .is-dragging .react-grid-layout .dashboard-panel-wrapper {
          transition: none;
        }

        .react-grid-item:hover {
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
        }

        /* Optimize rendering */
        .react-grid-item {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}
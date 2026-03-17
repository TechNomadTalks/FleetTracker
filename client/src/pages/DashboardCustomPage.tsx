/**
 * Dashboard Customization Page
 * 
 * Purpose:
 * - Allow users to customize dashboard widgets
 * - Save widget layouts and preferences
 * - Toggle widgets on/off
 * 
 * Overview:
 * Drag-and-drop widget arrangement with toggle controls.
 * Widgets persist to local storage for now.
 * 
 * Features:
 * - Toggle widgets on/off
 * - Reorder widgets (drag & drop)
 * - Save/load configurations
 * - Reset to default
 */

import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

interface Widget {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

const defaultWidgets: Widget[] = [
  { id: 'fleet-overview', name: 'Fleet Overview', enabled: true, order: 0 },
  { id: 'vehicle-status', name: 'Vehicle Status', enabled: true, order: 1 },
  { id: 'recent-trips', name: 'Recent Trips', enabled: true, order: 2 },
  { id: 'upcoming-services', name: 'Upcoming Services', enabled: true, order: 3 },
  { id: 'fuel-costs', name: 'Fuel Costs', enabled: true, order: 4 },
  { id: 'mileage-trend', name: 'Mileage Trend', enabled: true, order: 5 },
  { id: 'driver-activity', name: 'Driver Activity', enabled: false, order: 6 },
  { id: 'maintenance-costs', name: 'Maintenance Costs', enabled: false, order: 7 },
];

const STORAGE_KEY = 'dashboard-widgets';

export const DashboardCustomPage: React.FC = () => {
  const { theme } = useTheme();
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load widget configuration');
      }
    }
  }, []);

  const saveWidgets = (newWidgets: Widget[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
    setWidgets(newWidgets);
  };

  const toggleWidget = (id: string) => {
    const newWidgets = widgets.map((w) =>
      w.id === id ? { ...w, enabled: !w.enabled } : w
    );
    saveWidgets(newWidgets);
  };

  const handleDragStart = (id: string) => {
    setDraggedWidget(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;

    const draggedIndex = widgets.findIndex((w) => w.id === draggedWidget);
    const targetIndex = widgets.findIndex((w) => w.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newWidgets = [...widgets];
    const [dragged] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, dragged);

    newWidgets.forEach((w, i) => (w.order = i));
    saveWidgets(newWidgets);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  const resetToDefault = () => {
    saveWidgets(defaultWidgets);
  };

  const enabledWidgets = widgets.filter((w) => w.enabled);
  const disabledWidgets = widgets.filter((w) => !w.enabled);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Dashboard Customization
            </h1>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Customize which widgets appear on your dashboard
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={resetToDefault}
              className={`px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Reset to Default
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Active Widgets ({enabledWidgets.length})
            </h2>
            <div className="space-y-2">
              {enabledWidgets
                .sort((a, b) => a.order - b.order)
                .map((widget) => (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={() => handleDragStart(widget.id)}
                    onDragOver={(e) => handleDragOver(e, widget.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 rounded-lg border-2 cursor-move transition ${
                      draggedWidget === widget.id
                        ? 'border-blue-500 opacity-50'
                        : theme === 'dark'
                        ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8h16M4 16h16"
                          />
                        </svg>
                        <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          {widget.name}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleWidget(widget.id)}
                        className="w-12 h-6 bg-red-600 rounded-full relative transition-colors"
                      >
                        <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Inactive Widgets ({disabledWidgets.length})
            </h2>
            <div className="space-y-2">
              {disabledWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-gray-700 bg-gray-800 opacity-60'
                      : 'border-gray-200 bg-white opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                      {widget.name}
                    </span>
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className="w-12 h-6 bg-gray-600 rounded-full relative transition-colors"
                    >
                      <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`mt-8 p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Preview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {enabledWidgets.slice(0, 6).map((widget) => (
              <div
                key={widget.id}
                className={`p-4 rounded-lg h-32 flex items-center justify-center ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              >
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                  {widget.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCustomPage;

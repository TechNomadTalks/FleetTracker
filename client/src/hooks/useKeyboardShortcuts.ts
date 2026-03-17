import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme } = useTheme();

  const shortcuts: KeyboardShortcut[] = [
    { key: 'd', action: () => navigate('/dashboard'), description: 'Go to Dashboard' },
    { key: 'v', action: () => navigate('/vehicles'), description: 'Go to Vehicles' },
    { key: 't', action: () => navigate('/trips'), description: 'Go to Trips' },
    { key: 's', action: () => navigate('/services'), description: 'Go to Services' },
    { key: 'p', action: () => navigate('/profile'), description: 'Go to Profile' },
    { key: 'r', action: () => navigate('/reports'), description: 'Go to Reports' },
    { key: 'l', ctrl: true, action: toggleTheme, description: 'Toggle dark/light mode' },
    { key: 'Escape', action: () => document.activeElement && (document.activeElement as HTMLElement).blur(), description: 'Clear focus' },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      
      if (event.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && shiftMatch) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts, navigate, toggleTheme]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
};

export const KeyboardShortcutsHelp: React.FC = () => {
  const shortcuts = [
    { keys: ['D'], description: 'Dashboard' },
    { keys: ['V'], description: 'Vehicles' },
    { keys: ['T'], description: 'Trips' },
    { keys: ['S'], description: 'Services' },
    { keys: ['P'], description: 'Profile' },
    { keys: ['Ctrl+L'], description: 'Toggle theme' },
    { keys: ['Esc'], description: 'Clear focus' },
  ];

  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
      <p className="font-medium mb-2">Keyboard shortcuts:</p>
      {shortcuts.map((s, i) => (
        <div key={i} className="flex justify-between gap-4">
          <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">{s.keys.join('+')}</kbd>
          <span>{s.description}</span>
        </div>
      ))}
    </div>
  );
};

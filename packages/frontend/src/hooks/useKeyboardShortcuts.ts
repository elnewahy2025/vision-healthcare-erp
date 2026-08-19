import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api/client';

interface Shortcut {
  label: string;
  key: string;
  path: string;
  category: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { label: 'Dashboard', key: 'Alt+d', path: '/', category: 'navigation' },
  { label: 'Patients', key: 'Alt+p', path: '/patients', category: 'navigation' },
  { label: 'Appointments', key: 'Alt+a', path: '/appointments', category: 'navigation' },
  { label: 'Search', key: 'Ctrl+k', path: '', category: 'navigation' },
];

function parseKeyCombo(key: string): { ctrl: boolean; alt: boolean; shift: boolean; key: string } {
  const parts = key.toLowerCase().split('+');
  return {
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    key: parts[parts.length - 1],
  };
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    let shortcuts: Shortcut[] = DEFAULT_SHORTCUTS;

    // Load user shortcuts from API
    apiClient.get('/user/shortcuts').then((r) => {
      const userShortcuts = r.data?.data;
      if (Array.isArray(userShortcuts) && userShortcuts.length > 0) {
        shortcuts = userShortcuts.map((s: Record<string, unknown>) => ({
          label: String(s.label || ''),
          key: String(s.key || ''),
          path: String(s.path || ''),
          category: String(s.category || ''),
        }));
      }
    }).catch(() => { /* use defaults */ });

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;

      for (const shortcut of shortcuts) {
        const combo = parseKeyCombo(shortcut.key);
        if (!shortcut.key || !shortcut.path) continue;

        const ctrlMatch = combo.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const altMatch = combo.alt ? e.altKey : !e.altKey;
        const shiftMatch = combo.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === combo.key;

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          navigate(shortcut.path);
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}

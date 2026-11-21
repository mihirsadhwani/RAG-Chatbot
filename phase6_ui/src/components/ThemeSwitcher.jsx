import { Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const THEMES = [
  { id: 'purple', label: 'Indigo', swatch: 'bg-[#6258d9]' },
  { id: 'blue', label: 'Blue', swatch: 'bg-[#087cff]' },
  { id: 'teal', label: 'Teal', swatch: 'bg-[#15a38c]' },
];

export default function ThemeSwitcher({ isDarkMode, onToggleDarkMode, theme, onThemeChange }) {
  return (
    <div className="flex items-center gap-2">
      <div className="glass-control hidden sm:flex items-center gap-1.5 rounded-full p-1.5">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => onThemeChange(t.id)}
            title={`${t.label} accent`}
            aria-label={`${t.label} theme`}
            className={cn(
              'w-4 h-4 rounded-full transition-all cursor-pointer flex items-center justify-center',
              t.swatch,
              theme === t.id
                ? 'ring-2 ring-white ring-offset-2 ring-offset-primary/20 scale-110 shadow-sm'
                : 'opacity-55 hover:opacity-100 hover:scale-110'
            )}
          />
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={onToggleDarkMode}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle color mode"
      >
        {isDarkMode ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-slate-600" />
        )}
      </Button>
    </div>
  );
}

export default function ThemeSwitcher({ isDarkMode, onToggleDarkMode, theme, onThemeChange }) {
    const themes = [
        { id: 'purple', bg: 'bg-indigo-500' },
        { id: 'blue', bg: 'bg-blue-600' },
        { id: 'teal', bg: 'bg-teal-500' },
    ];

    return (
        <div className="flex items-center gap-4">
            {/* Theme Options */}
            <div className="flex bg-surface-alt p-1 rounded-full border border-border">
                {themes.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onThemeChange(t.id)}
                        className={`w-6 h-6 rounded-full mx-1 transition-transform hover:scale-110 cursor-pointer border-2 ${theme === t.id ? 'border-text scale-110 shadow-md' : 'border-transparent opacity-70'
                            } ${t.bg}`}
                        title={`Switch to ${t.id} theme`}
                    />
                ))}
            </div>

            {/* Dark Mode Toggle */}
            <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-xl bg-surface-alt border border-border text-text-secondary hover:text-text transition-colors cursor-pointer"
                title="Toggle Dark Mode"
            >
                {isDarkMode ? '☀️' : '🌙'}
            </button>
        </div>
    );
}

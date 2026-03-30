import { useTheme } from "@/context/ThemeContext";
import "./DarkModeToggle.css";

export default function DarkModeToggle() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
        >
            {isDark ? "☀️" : "🌙"}
        </button>
    );
}
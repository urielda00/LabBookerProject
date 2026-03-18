import { createContext, useState, useLayoutEffect, useMemo, useCallback } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
	// Lazy initialization: Check localStorage first, then fallback to system preference
	const [isDark, setIsDark] = useState(() => {
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			return savedTheme === 'dark';
		}
		// Check system preference if no user preference is saved
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	// Use useLayoutEffect to update the DOM before the browser paints to prevent flickering
	useLayoutEffect(() => {
		localStorage.setItem('theme', isDark ? 'dark' : 'light');

		// Direct DOM manipulation to toggle the class on the html element
		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, [isDark]);

	// Wrap the toggle function in useCallback to maintain a stable reference
	const toggleTheme = useCallback(() => {
		setIsDark((prev) => !prev);
	}, []);

	// Memoize the context value to prevent unnecessary re-renders of consuming components
	const contextValue = useMemo(
		() => ({
			isDark,
			toggleTheme,
		}),
		[isDark, toggleTheme]
	);

	return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

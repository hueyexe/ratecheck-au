import { createContext, useContext } from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextType {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  resolved: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}


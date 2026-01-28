import { create } from "zustand";

interface ThemeStore {
  theme: "light" | "dark";
  toggle: () => void;
}
export const useTheme = create<ThemeStore>((set) => ({
  theme: "dark",
  toggle: () =>
    set((s) => ({
      theme: s.theme === "light" ? "dark" : "light",
    })),
}));

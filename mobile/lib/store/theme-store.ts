import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ThemePreference } from "@/lib/theme/tokens";

type ThemeState = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

/**
 * Preferência de tema escolhida pela pessoa usuária ("system" segue o
 * celular). Persistida localmente e, futuramente, também sincronizada com
 * a coluna theme_preference em profiles no Supabase.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: "system",
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: "prumo-theme-preference",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

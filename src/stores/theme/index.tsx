import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  primaryOptions,
  secondaryOptions,
  tertiaryOptions,
} from "@themes/custom";

export interface ThemeStore {
  theme: string | null;
  customTheme: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  setTheme(v: string | null): void;
  setCustomTheme(v: {
    primary: string;
    secondary: string;
    tertiary: string;
  }): void;
}

const currentDate = new Date();
const is420 = currentDate.getMonth() + 1 === 4 && currentDate.getDate() === 20;
const isHalloween =
  currentDate.getMonth() + 1 === 10 && currentDate.getDate() === 31;
// Make default theme green if its 4/20 (bc the marijauna plant is green :3)
// Make default theme autumn if its Halloween (spooky autumn vibes 🎃)
export const useThemeStore = create(
  persist(
    immer<ThemeStore>((set) => ({
      theme: is420 ? "green" : isHalloween ? "autumn" : null,
      customTheme: {
        primary: "classic",
        secondary: "classic",
        tertiary: "classic",
      },
      setTheme(v) {
        set((s) => {
          s.theme = v;
        });
      },
      setCustomTheme(v) {
        set((s) => {
          s.customTheme = v;
        });
      },
    })),
    {
      name: "__MW::theme",
    },
  ),
);

export interface PreviewThemeStore {
  previewTheme: string | null;
  setPreviewTheme(v: string | null): void;
}

export const usePreviewThemeStore = create(
  immer<PreviewThemeStore>((set) => ({
    previewTheme: null,
    setPreviewTheme(v) {
      set((s) => {
        s.previewTheme = v;
      });
    },
  })),
);

export function ThemeProvider(props: {
  children?: ReactNode;
  applyGlobal?: boolean;
}) {
  const previewTheme = usePreviewThemeStore((s) => s.previewTheme);
  const theme = useThemeStore((s) => s.theme);
  const customTheme = useThemeStore((s) => s.customTheme);

  const themeToDisplay = previewTheme ?? theme;
  const themeSelector = themeToDisplay ? `theme-${themeToDisplay}` : undefined;

  let styleContent = "";
  if (themeToDisplay === "custom" && customTheme) {
    const primary =
      primaryOptions.find((o) => o.id === customTheme.primary)?.colors || {};
    const secondary =
      secondaryOptions.find((o) => o.id === customTheme.secondary)?.colors ||
      {};
    const tertiary =
      tertiaryOptions.find((o) => o.id === customTheme.tertiary)?.colors || {};

    const vars = { ...primary, ...secondary, ...tertiary };
    const cssVars = Object.entries(vars)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");

    styleContent = `.theme-custom { ${cssVars} }`;
  }

  return (
    <div className={themeSelector}>
      {styleContent ? (
        <Helmet>
          <style>{styleContent}</style>
        </Helmet>
      ) : null}
      {props.applyGlobal ? (
        <Helmet>
          <body className={themeSelector} />
        </Helmet>
      ) : null}
      {props.children}
    </div>
  );
}

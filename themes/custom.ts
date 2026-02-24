import merge from "lodash.merge";
import { createTheme } from "./types";
import { defaultTheme } from "./default";
import { colorToRgbString } from "../src/utils/color";
import { allThemes } from "./all";

const availableThemes = [
  { id: "default", theme: defaultTheme },
  ...allThemes.map((t) => ({
    id: t.name,
    theme: { extend: t.extend },
  })),
];

function cssVarName(path: string) {
  return `--colors-${path}`;
}

// Generate the custom theme structure with CSS variables
function generateCustomThemeStructure(theme: any, prefix = ""): any {
  const result: any = {};
  for (const key in theme) {
    if (typeof theme[key] === "object" && theme[key] !== null) {
      result[key] = generateCustomThemeStructure(
        theme[key],
        `${prefix}${key}-`,
      );
    } else {
      result[key] =
        `rgb(var(${cssVarName(`${prefix}${key}`)}) / <alpha-value>)`;
    }
  }
  return result;
}

export const customTheme = createTheme({
  name: "custom",
  extend: {
    colors: generateCustomThemeStructure(defaultTheme.extend.colors),
  },
});

// Define parts
const parts = {
  primary: [
    "lightBar.light",
    "type.logo",
    "buttons.primary",
    "buttons.primaryText",
    "buttons.primaryHover",
    "buttons.toggle",
    "buttons.toggleDisabled",
    "buttons.purple",
    "buttons.purpleHover",
    "global.accentA",
    "global.accentB",
    "pill.highlight",
    "progress.filled",
    "video.audio.set",
    "video.context.type.accent",
    "video.context.sliderFilled",
    "video.scraping.loading",
    "onboarding.good",
    "onboarding.best",
    "onboarding.link",
    "onboarding.barFilled",
    "settings.sidebar.type.iconActivated",
    "settings.sidebar.type.activated",
    "type.link",
    "type.linkHover",
    "largeCard.icon",
    "mediaCard.barFillColor",
  ],
  secondary: [
    "type.text",
    "type.dimmed",
    "type.secondary",
    "type.emphasis",
    "type.divider",
    "type.danger",
    "type.success",
    "buttons.secondary",
    "buttons.secondaryText",
    "buttons.secondaryHover",
    "buttons.danger",
    "buttons.dangerHover",
    "buttons.cancel",
    "buttons.cancelHover",
    "utils.divider",
    "search.text",
    "search.placeholder",
    "search.icon",
    "dropdown.text",
    "dropdown.secondary",
    "dropdown.border",
    "authentication.border",
    "authentication.inputBg",
    "authentication.inputBgHover",
    "authentication.wordBackground",
    "authentication.copyText",
    "authentication.copyTextHover",
    "authentication.errorText",
    "settings.sidebar.activeLink",
    "settings.sidebar.badge",
    "settings.sidebar.type.secondary",
    "settings.sidebar.type.inactive",
    "settings.sidebar.type.icon",
    "settings.card.border",
    "onboarding.bar",
    "onboarding.divider",
    "onboarding.border",
    "errors.border",
    "errors.type.secondary",
    "about.circle",
    "about.circleText",
    "editBadge.bg",
    "editBadge.bgHover",
    "editBadge.text",
    "progress.background",
    "progress.preloaded",
    "pill.background",
    "pill.backgroundHover",
    "pill.activeBackground",
    "video.buttonBackground",
    "video.autoPlay.background",
    "video.autoPlay.hover",
    "video.scraping.error",
    "video.scraping.success",
    "video.scraping.noresult",
    "video.context.light",
    "video.context.border",
    "video.context.hoverColor",
    "video.context.buttonFocus",
    "video.context.inputBg",
    "video.context.buttonOverInputHover",
    "video.context.inputPlaceholder",
    "video.context.cardBorder",
    "video.context.slider",
    "video.context.error",
    "video.context.buttons.list",
    "video.context.buttons.active",
    "video.context.closeHover",
    "video.context.type.main",
    "video.context.type.secondary",
    "mediaCard.barColor",
    "mediaCard.badge",
    "mediaCard.badgeText",
  ],
  tertiary: [
    "background.main",
    "background.secondary",
    "background.secondaryHover",
    "background.accentA",
    "background.accentB",
    "modal.background",
    "mediaCard.shadow",
    "mediaCard.hoverBackground",
    "mediaCard.hoverAccent",
    "mediaCard.hoverShadow",
    "search.background",
    "search.hoverBackground",
    "search.focused",
    "dropdown.background",
    "dropdown.altBackground",
    "dropdown.hoverBackground",
    "dropdown.contentBackground",
    "dropdown.highlight",
    "dropdown.highlightHover",
    "largeCard.background",
    "settings.card.background",
    "settings.card.altBackground",
    "settings.saveBar.background",
    "onboarding.card",
    "onboarding.cardHover",
    "errors.card",
    "themePreview.primary",
    "themePreview.secondary",
    "themePreview.ghost",
    "video.scraping.card",
    "video.context.background",
    "video.context.flagBg",
  ],
};

function getNestedValue(obj: any, path: string) {
  return path.split(".").reduce((o, i) => (o ? o[i] : undefined), obj);
}

function extractColors(theme: any, keys: string[]) {
  const colors: Record<string, string> = {};
  // We need to flatten the structure to css vars
  keys.forEach((key) => {
    const value = getNestedValue(theme.extend.colors, key);
    if (value) {
      colors[cssVarName(key.replace(/\./g, "-"))] = colorToRgbString(value);
    }
  });
  return colors;
}

// Generate options for each part
export const primaryOptions = availableThemes.map((t) => {
  const merged = merge({}, defaultTheme, t.theme);
  return {
    id: t.id,
    colors: extractColors(merged, parts.primary),
  };
});

export const secondaryOptions = availableThemes.map((t) => {
  const merged = merge({}, defaultTheme, t.theme);
  return {
    id: t.id,
    colors: extractColors(merged, parts.secondary),
  };
});

export const tertiaryOptions = availableThemes.map((t) => {
  const merged = merge({}, defaultTheme, t.theme);
  return {
    id: t.id,
    colors: extractColors(merged, parts.tertiary),
  };
});

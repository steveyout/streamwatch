import { allThemes } from "./all";
import { customTheme } from "./custom";

export { defaultTheme } from "./default";
export { allThemes } from "./all";

export const safeThemeList = [customTheme, ...allThemes]
  .flatMap((v) => v.selectors)
  .filter((v) => v.startsWith("."))
  .map((v) => v.slice(1)); // remove dot from selector

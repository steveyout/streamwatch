import { defaultTheme } from "./default";

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface Theme {
  name: string;
  extend: DeepPartial<(typeof defaultTheme)["extend"]>;
}

export function createTheme(theme: Theme) {
  return {
    name: theme.name,
    selectors: [`.theme-${theme.name}`],
    extend: theme.extend,
  };
}

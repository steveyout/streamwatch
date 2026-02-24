import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useEffectOnce } from "react-use";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface HistoryRoute {
  path: string;
}

interface HistoryStore {
  routes: HistoryRoute[];
  registerRoute(route: HistoryRoute): void;
}

export const useHistoryStore = create(
  immer<HistoryStore>((set) => ({
    routes: [],
    registerRoute(route) {
      set((s) => {
        s.routes.push(route);
        if (s.routes.length > 50) {
          s.routes.shift();
        }
      });
    },
  })),
);

export function useHistoryListener() {
  const location = useLocation();
  const registerRoute = useHistoryStore((s) => s.registerRoute);
  useEffect(() => {
    registerRoute({ path: location.pathname });
  }, [location.pathname, registerRoute]);

  useEffectOnce(() => {
    registerRoute({ path: location.pathname });
  });
}

export function useLastNonPlayerLink() {
  const routes = useHistoryStore((s) => s.routes);
  const location = useLocation();
  const lastNonPlayerLink = useMemo(() => {
    for (let i = routes.length - 1; i >= 0; i -= 1) {
      const v = routes[i];
      if (
        !v.path.startsWith("/media") && // cannot be a player link
        location.pathname !== v.path && // cannot be current link
        !v.path.startsWith("/s/") && // cannot be a quick search link
        !v.path.startsWith("/onboarding") // cannot be an onboarding link
      ) {
        return v.path;
      }
    }
    return "/";
  }, [routes, location]);
  return lastNonPlayerLink;
}

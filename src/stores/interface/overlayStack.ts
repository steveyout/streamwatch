import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type OverlayType =
  | "volume"
  | "subtitle"
  | "speed"
  | "tidb-submission-success"
  | null;

interface ModalData {
  id: number;
  type: "movie" | "show";
  [key: string]: any;
}

interface OverlayStackStore {
  currentOverlay: OverlayType;
  modalStack: string[];
  modalData: Record<string, ModalData | undefined>;
  setCurrentOverlay: (overlay: OverlayType) => void;
  showModal: (id: string, data?: ModalData) => void;
  hideModal: (id: string) => void;
  isModalVisible: (id: string) => boolean;
  getTopModal: () => string | null;
  getModalData: (id: string) => ModalData | undefined;
  clearAllModals: () => void;
}

export const useOverlayStack = create<OverlayStackStore>()(
  immer((set, get) => ({
    currentOverlay: null,
    modalStack: [],
    modalData: {},
    setCurrentOverlay: (overlay) =>
      set((state) => {
        state.currentOverlay = overlay;
      }),
    showModal: (id: string, data?: ModalData) =>
      set((state) => {
        if (!state.modalStack.includes(id)) {
          state.modalStack.push(id);
        }
        if (data) {
          state.modalData[id] = data;
        }
      }),
    hideModal: (id: string) =>
      set((state) => {
        state.modalStack = state.modalStack.filter((modalId) => modalId !== id);
        delete state.modalData[id];
      }),
    isModalVisible: (id: string) => {
      return get().modalStack.includes(id);
    },
    getTopModal: () => {
      const stack = get().modalStack;
      return stack.length > 0 ? stack[stack.length - 1] : null;
    },
    getModalData: (id: string) => {
      return get().modalData[id];
    },
    clearAllModals: () =>
      set((state) => {
        state.modalStack = [];
        state.modalData = {};
        state.currentOverlay = null;
      }),
  })),
);

// Hook to clear modals on navigation
export function useClearModalsOnNavigation() {
  const location = useLocation();
  const clearAllModals = useOverlayStack((state) => state.clearAllModals);

  useEffect(() => {
    clearAllModals();
  }, [location.pathname, clearAllModals]);
}

import { StateCreator } from "zustand";

import { CastingSlice } from "@/stores/player/slices/casting";
import { DisplaySlice } from "@/stores/player/slices/display";
import { InterfaceSlice } from "@/stores/player/slices/interface";
import { PlayingSlice } from "@/stores/player/slices/playing";
import { ProgressSlice } from "@/stores/player/slices/progress";
import { SkipSegmentsSlice } from "@/stores/player/slices/skipSegments";
import { SourceSlice } from "@/stores/player/slices/source";
import { ThumbnailSlice } from "@/stores/player/slices/thumbnails";

export type AllSlices = InterfaceSlice &
  PlayingSlice &
  ProgressSlice &
  SourceSlice &
  DisplaySlice &
  CastingSlice &
  ThumbnailSlice &
  SkipSegmentsSlice;
export type MakeSlice<Slice> = StateCreator<
  AllSlices,
  [["zustand/immer", never]],
  [],
  Slice
>;

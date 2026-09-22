"use client";

import { createContext, useContext } from "react";
import type { RoleId } from "@/lib/design/model";
import type { ImageRef } from "@/lib/design/image-target";

/** Cakupan bubble yang sedang diedit: bubble utama (viewer) atau bubble khusus satu peran. */
export type BubbleScope = "default" | RoleId;

export interface CanvasApi {
  scope: BubbleScope;
  setScope: (scope: BubbleScope) => void;
  /** Gambar yang sedang diatur langsung di canvas, atau null. */
  imageEdit: ImageRef | null;
  startImageEdit: (ref: ImageRef) => void;
  stopImageEdit: () => void;
}

/** Null bila komponen dirender di luar Editor (misalnya di uji), dan komponen tetap bekerja tanpa canvas. */
export const CanvasContext = createContext<CanvasApi | null>(null);
export const useCanvas = () => useContext(CanvasContext);

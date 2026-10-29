"use client";

import { useEffect } from "react";
import { recordRecent } from "./use-saved";

/** Anota la ficha abierta en «Vistos recientemente». */
export function TrackRecent({ id }: { id: string }) {
  useEffect(() => recordRecent(id), [id]);
  return null;
}

"use client";
import { useEffect, useRef } from "react";
import {
  loadVillageArt,
  drawSprite,
  drawClansman,
  BUILDING_ART,
  type VillageArt,
} from "../../lib/medieval/sprites";
import type { BuildingKind, ClanUnit } from "@clan-world/shared";

export function SpritePortrait({
  unit,
  building,
  object,
  large = false,
}: {
  unit?: ClanUnit;
  building?: BuildingKind;
  object?: number;
  large?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    art = useRef<VillageArt | null>(null),
    latest = useRef({ unit, building, object, large });
  latest.current = { unit, building, object, large };
  useEffect(() => {
    let dead = false;
    const paint = (a: VillageArt) => {
      if (dead || !ref.current) return;
      const c = ref.current.getContext("2d")!;
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, 96, 96);
      const p = latest.current;
      if (p.building || p.object !== undefined) {
        const atlas = p.building ? a.buildings : a.props,
          index = p.building ? BUILDING_ART[p.building] : p.object!,
          f = atlas.frames[index]!;
        const width = Math.min(84, (78 * f.sw) / f.sh);
        drawSprite(c, atlas, index, 48, 87, width);
      } else if (p.unit) {
        drawClansman(
          c,
          a,
          { ...p.unit, facing: "se", status: "idle", carrying: null },
          48,
          p.large ? 132 : 100,
          0,
          p.large ? 4.4 : 3.5,
        );
      }
    };
    loadVillageArt()
      .then((a) => {
        art.current = a;
        paint(a);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [unit?.role, building, object, large]);
  return (
    <canvas
      ref={ref}
      width={96}
      height={96}
      className="sprite-portrait"
      aria-hidden="true"
    />
  );
}

"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useViewport,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import {
  PARTNERSHIP_STRINGS,
  partnershipStatusLabel,
  partnershipSymbol,
} from "@/lib/partnership-status";
import { useRootedLang } from "@/lib/use-rooted-lang";

export interface PartnershipEdgeData extends Record<string, unknown> {
  partnershipId: string;
  status: string | null;
  aName: string;
  bName: string;
  onOpen?: (partnershipId: string) => void;
}

export type PartnershipEdgeType = Edge<PartnershipEdgeData, "partnership">;

/**
 * A partner line whose symbol is a real button.
 *
 * The symbol used to be plain text in the middle of the line, which is
 * unusable on a phone: about 16 screen pixels, and not tappable at all.
 *
 * The button is sized in *screen* pixels and then divided by the canvas zoom,
 * because everything inside the canvas is scaled by that zoom. That keeps the
 * tap target at 44 × 44 however far the tree is zoomed out — fitting a large
 * family on a phone can take the zoom down to about 0.18, where a fixed 44px
 * button would be only 8 physical pixels across.
 *
 * The visible circle is deliberately smaller than the hit area when zoomed
 * out, so the tree still looks like a tree rather than a field of buttons.
 */
export default function PartnershipEdge(props: EdgeProps<PartnershipEdgeType>) {
  const { id, sourceX, sourceY, targetX, targetY, data, style, markerEnd } = props;
  const { zoom } = useViewport();
  const [lang] = useRootedLang();
  const [path, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  if (!data) return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;

  const t = PARTNERSHIP_STRINGS[lang];
  const symbol = partnershipSymbol(data.status);
  const statusText = partnershipStatusLabel(data.status, lang);
  const color = !data.status
    ? "#475569"
    : data.status === "divorced"
      ? "#9f1239"
      : "#be123c";
  const safeZoom = Math.max(zoom, 0.05);
  // Sizes below are in canvas units; multiplying by the zoom gives the size
  // the finger actually meets.
  // Rounded up: fractional canvas zoom can shave a hundredth of a pixel off.
  const hitSize = Math.ceil(45 / safeZoom);
  const circleSize = Math.max(22, Math.min(36, 36 * safeZoom)) / safeZoom;
  const fontSize = 16 / safeZoom;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={30 / safeZoom} />
      <EdgeLabelRenderer>
        <button
          type="button"
          data-testid={`partner-symbol-${data.partnershipId}`}
          aria-label={`${t.statusTitle}: ${data.aName} — ${data.bName}. ${statusText}`}
          title={`${t.change}: ${statusText}`}
          onClick={(event) => {
            event.stopPropagation();
            data.onOpen?.(data.partnershipId);
          }}
          className="nodrag nopan absolute flex items-center justify-center rounded-full bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          style={{
            width: hitSize,
            height: hitSize,
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            zIndex: 6,
          }}
        >
          <span
            aria-hidden
            className="flex items-center justify-center rounded-full border bg-white font-semibold shadow-sm transition hover:bg-rose-50"
            style={{
              width: circleSize,
              height: circleSize,
              fontSize,
              lineHeight: 1,
              borderWidth: 1.5 / safeZoom,
              borderColor: data.status ? "#fecdd3" : "#cbd5e1",
              color,
            }}
          >
            {symbol}
          </span>
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

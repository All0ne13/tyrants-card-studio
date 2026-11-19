// All crop calculations use the same print-canvas coordinates as the renderer.
export function artworkRect(card) {
  return { x: 46, y: 162, w: 658, h: 762 - Number(card.rulesHeight || 260) };
}

export function artworkPlacement(image, rect, card) {
  const scale =
    Math.max(rect.w / image.width, rect.h / image.height) * card.artScale;
  const w = image.width * scale;
  const h = image.height * scale;
  return {
    w,
    h,
    x: rect.x + (rect.w - w) / 2 + (card.artX / 200) * (w - rect.w),
    y: rect.y + (rect.h - h) / 2 + (card.artY / 200) * (h - rect.h),
  };
}

export function dragArtwork(start, placement, rect, dx, dy) {
  const clamp = (v) => Math.min(100, Math.max(-100, v));
  // A freshly fitted image has no room to pan on at least one axis. Create
  // only the extra crop requested by the gesture, keeping the window filled.
  const zoom = Math.min(
    3 / start.artScale,
    Math.max(
      1,
      placement.w - rect.w < 0.01
        ? (rect.w + 2 * Math.abs(dx)) / placement.w
        : 1,
      placement.h - rect.h < 0.01
        ? (rect.h + 2 * Math.abs(dy)) / placement.h
        : 1,
    ),
  );
  const width = placement.w * zoom,
    height = placement.h * zoom;
  return {
    artScale: start.artScale * zoom,
    artX:
      width - rect.w > 0.01
        ? clamp(start.artX + (dx * 200) / (width - rect.w))
        : start.artX,
    artY:
      height - rect.h > 0.01
        ? clamp(start.artY + (dy * 200) / (height - rect.h))
        : start.artY,
  };
}

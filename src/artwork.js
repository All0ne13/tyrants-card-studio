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
  return {
    artX:
      placement.w - rect.w > 0.01
        ? clamp(start.artX + (dx * 200) / (placement.w - rect.w))
        : start.artX,
    artY:
      placement.h - rect.h > 0.01
        ? clamp(start.artY + (dy * 200) / (placement.h - rect.h))
        : start.artY,
  };
}

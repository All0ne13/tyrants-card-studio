import { localizeUI, t } from "./i18n.js";
import { safeName } from "./model.js";

// Print-sized boards need the native image, not the lightweight library cover.
export function showAsset(pack, asset, { icon, escape: e, onUseBack }) {
  const imageURL = asset.fullImage || asset.image;
  const wide = ["mat", "board", "token"].includes(asset.kind);
  const d = document.createElement("dialog");
  d.className = `asset-dialog${wide ? " wide-asset" : ""}`;
  d.setAttribute("aria-labelledby", "asset-viewer-title");
  const extension =
    asset.extension || imageURL.split(".").pop().split(/[?#]/)[0];
  d.innerHTML = `<button class="icon-button dialog-close" aria-label="Закрити">${icon("close")}</button>
    <div class="asset-large"><div class="asset-stage" tabindex="0" aria-label="Масштаб зображення"><img src="${e(imageURL)}" alt="${e(asset.name)}" draggable="false"></div>
    ${wide ? `<div class="asset-zoom"><button class="icon-button zoom-out" type="button" aria-label="Зменшити">−</button><input class="zoom-range" type="range" min="10" max="400" value="100" step="1" aria-label="Масштаб зображення"><output class="zoom-level">100%</output><button class="icon-button zoom-in" type="button" aria-label="Збільшити">+</button><button class="button ghost small zoom-fit" type="button">Вписати у вікно</button></div>` : ""}</div>
    <div class="asset-detail"><div><div class="eyebrow">${e(pack.title)}</div><h2 id="asset-viewer-title" data-source-text>${e(asset.name)}</h2><p class="muted">${e(pack.subtitle)}</p></div>
    <div class="asset-actions"><a class="button primary" href="${e(imageURL)}" download="${e(safeName(asset.name))}.${e(extension)}">${icon("download")} Зберегти зображення</a>
    ${wide ? `<a class="button ghost" href="${e(imageURL)}" target="_blank" rel="noopener noreferrer">Відкрити повний розмір</a>` : ""}
    ${asset.sourceFile ? `<a class="button ghost" href="${e(asset.sourceFile)}#page=${asset.page}" target="_blank" rel="noopener noreferrer">${t("Відкрити оригінал")} · ${asset.page}</a>` : ""}
    ${asset.kind === "back" ? '<button class="button ghost" id="use-back">Використати як сорочку</button>' : ""}</div></div>`;
  localizeUI(d);
  document.body.append(d);
  d.showModal();
  d.querySelector(".dialog-close").onclick = () => d.close();
  d.addEventListener("click", (ev) => {
    if (ev.target === d) d.close();
  });
  d.addEventListener("close", () => {
    observer?.disconnect();
    d.remove();
  });
  d.querySelector("#use-back")?.addEventListener("click", () => {
    d.close();
    onUseBack(asset);
  });
  let observer;
  if (wide) {
    const stage = d.querySelector(".asset-stage"),
      img = stage.querySelector("img");
    const range = d.querySelector(".zoom-range"),
      output = d.querySelector(".zoom-level");
    let scale = 1,
      fitScale = 1,
      fitted = true,
      drag,
      dragged = false;
    function zoom(value, fit = false) {
      if (!img.naturalWidth) return;
      const oldWidth = img.width || 1,
        oldHeight = img.height || 1;
      const cx =
        (stage.scrollLeft + stage.clientWidth / 2) /
        Math.max(oldWidth, stage.clientWidth);
      const cy =
        (stage.scrollTop + stage.clientHeight / 2) /
        Math.max(oldHeight, stage.clientHeight);
      scale = Math.min(4, Math.max(fitScale, value));
      fitted = fit;
      img.style.width = `${Math.round(img.naturalWidth * scale)}px`;
      img.style.height = `${Math.round(img.naturalHeight * scale)}px`;
      range.min = String(Math.max(1, Math.floor(fitScale * 100)));
      range.value = String(Math.round(scale * 100));
      output.value = `${Math.round(scale * 100)}%`;
      d.querySelector(".zoom-out").disabled = scale <= fitScale + 0.001;
      d.querySelector(".zoom-in").disabled = scale >= 4;
      stage.classList.toggle("zoomed", scale > fitScale + 0.001);
      stage.scrollLeft = fit
        ? 0
        : cx * Math.max(img.width, stage.clientWidth) - stage.clientWidth / 2;
      stage.scrollTop = fit
        ? 0
        : cy * Math.max(img.height, stage.clientHeight) -
          stage.clientHeight / 2;
    }
    function fit() {
      if (!img.naturalWidth) return;
      stage.style.setProperty(
        "--asset-ratio",
        `${img.naturalWidth} / ${img.naturalHeight}`,
      );
      fitScale = Math.min(
        stage.clientWidth / img.naturalWidth,
        stage.clientHeight / img.naturalHeight,
        1,
      );
      zoom(fitScale, true);
    }
    img.addEventListener("load", fit);
    if (img.complete) fit();
    observer = new ResizeObserver(() => {
      if (fitted) fit();
    });
    observer.observe(stage);
    range.oninput = () => zoom(Number(range.value) / 100);
    d.querySelector(".zoom-in").onclick = () => zoom(scale * 1.5);
    d.querySelector(".zoom-out").onclick = () => zoom(scale / 1.5);
    d.querySelector(".zoom-fit").onclick = fit;
    img.onclick = () => {
      if (!dragged) fitted ? zoom(Math.max(1, fitScale * 2)) : fit();
    };
    stage.addEventListener("pointerdown", (ev) => {
      dragged = false;
      if (ev.pointerType !== "mouse" || ev.button !== 0 || fitted) return;
      drag = {
        x: ev.clientX,
        y: ev.clientY,
        left: stage.scrollLeft,
        top: stage.scrollTop,
      };
      stage.setPointerCapture(ev.pointerId);
    });
    stage.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 4)
        dragged = true;
      stage.scrollLeft = drag.left - ev.clientX + drag.x;
      stage.scrollTop = drag.top - ev.clientY + drag.y;
    });
    stage.addEventListener("pointerup", () => {
      drag = null;
    });
    stage.addEventListener("pointercancel", () => {
      drag = null;
    });
    stage.addEventListener("keydown", (ev) => {
      if (ev.key === "+" || ev.key === "=") {
        ev.preventDefault();
        zoom(scale * 1.5);
      }
      if (ev.key === "-") {
        ev.preventDefault();
        zoom(scale / 1.5);
      }
      if (ev.key === "0") {
        ev.preventDefault();
        fit();
      }
    });
  }
  return d;
}

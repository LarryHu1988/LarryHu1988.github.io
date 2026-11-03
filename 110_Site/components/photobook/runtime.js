import * as THREE from "three";
import { FlipBook } from "quick_flipbook";
// Adapted from Haichao Li's MIT-licensed 3D Book 2. See /licenses/.
import { renderPhotoPage } from "./page-art.js";
import {
  chooseDragDirection,
  dragFraction,
  edgePreviewDirection,
  edgePreviewPose,
  isActivePointer,
  isPointerOverBook,
  shouldCompleteDrag,
} from "./drag.js";

export async function createPhotoBook(root, book, onStatus, onError) {
const books = [book];
let disposed = false;
const events = new AbortController();
const listen = (target, type, callback) => target.addEventListener(type, callback, { signal: events.signal });

const chinese = document.documentElement.lang.startsWith("zh");
const traditional = document.documentElement.lang === 'zh-Hant';
const readerText = chinese ? {
  loading: traditional ? '正在準備相冊' : "正在准备相册",
  preparing: (title) => traditional ? `正在準備《${title}》` : `正在准备《${title}》`,
  open: (title) => traditional ? `打開《${title}》` : `打开《${title}》`,
  cover: "封面",
  backCover: "封底",
  spread: (current, total) => traditional ? `第 ${current} 組跨頁，共 ${total} 組` : `第 ${current} 组跨页，共 ${total} 组`,
} : {
  loading: "Preparing edition",
  preparing: (title) => `Preparing ${title}`,
  open: (title) => `Open ${title}`,
  cover: "Cover",
  backCover: "Back cover",
  spread: (current, total) => `Spread ${current} of ${total}`,
};
const bookTitle = (book) => chinese ? book.titleZh ?? book.title : book.title;

const canvas = root.querySelector("canvas");
const library = root.querySelector("[data-library]");
const previousButton = root.querySelector("[data-previous]");
const nextButton = root.querySelector("[data-next]");
const pageState = root.querySelector("[data-page-state]");
const loadingCard = root.querySelector("[data-loading]");
const loadingCopy = root.querySelector("[data-loading-copy]");
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
const SHADOW_MAP_SIZE = 1024;
const PAGE_SUBDIVISIONS = 16;
const MAX_TEXTURE_ANISOTROPY = 16;
const CACHED_BOOK_LIMIT = 2;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#eeece4");

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
camera.position.set(0, 5, 0);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

scene.add(new THREE.HemisphereLight("#ffffff", "#e9e9e6", 0.9));

const keyLight = new THREE.DirectionalLight("#ffffff", 2.65);
keyLight.position.set(-2.8, 5.2, 2.7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 14;
keyLight.shadow.camera.left = -3;
keyLight.shadow.camera.right = 3;
keyLight.shadow.camera.top = 3;
keyLight.shadow.camera.bottom = -3;
keyLight.shadow.bias = -0.00025;
keyLight.shadow.normalBias = 0.012;
keyLight.shadow.radius = 3;
scene.add(keyLight);

const rimLight = new THREE.PointLight("#ffffff", 0.45, 8, 2);
rimLight.position.set(2.5, 1.8, -2.4);
scene.add(rimLight);

const table = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 18),
  new THREE.MeshStandardMaterial({ color: "#eeece4", roughness: 1, metalness: 0 }),
);
table.rotation.x = -Math.PI / 2;
table.position.y = -0.035;
table.receiveShadow = true;
scene.add(table);

const bookRig = new THREE.Group();
bookRig.rotation.set(0, 0, 0);
scene.add(bookRig);

const flipBook = new FlipBook({
  flipDuration: reducedMotion ? 0.001 : 0.78,
  yBetweenPages: 0.0012,
  pageSubdivisions: PAGE_SUBDIVISIONS,
});
flipBook.traverse((object) => {
  if (object.isMesh) {
    object.castShadow = true;
    object.receiveShadow = true;
  }
});
bookRig.add(flipBook);

let selectedBook = books[0];
let loading = false;
let loadToken = 0;
let pointerStart = null;
let lastStatusKey = "";
const EDGE_PREVIEW_AMOUNT = 0.055;
const EDGE_PREVIEW_ZONE = 28;
const EDGE_PREVIEW_EPSILON = 0.0005;
const edgePreview = {
  baseSheet: null,
  direction: 0,
  amount: 0,
  target: 0,
};
const materialCaches = new Map();
let pageMaterials = [];
const pendingPages = new Map();
let lastLoadedSpread = -1;
const recentBookIds = [];
const memoizedSheets = new WeakSet();
const dirtySheets = new Set();
let animationFrame = null;
let previousFrameTime = performance.now();

function makePaperMaterial(map = null) {
  const material = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map,
    roughness: 0.88,
    metalness: 0,
    toneMapped: true,
  });
  material.shadowSide = THREE.DoubleSide;
  return material;
}

const blankMaterial = makePaperMaterial();

function textureWidth() {
  const metrics = getBookScreenMetrics();
  const density = window.devicePixelRatio || 1;
  return Math.max(256, Math.min(Math.ceil(metrics.pageWidth * density), Math.floor(renderer.capabilities.maxTextureSize * selectedBook.ratio)));
}

function cacheForBook(bookId) {
  if (!materialCaches.has(bookId)) materialCaches.set(bookId, new Map());
  return materialCaches.get(bookId);
}

function pageMaterial(bookId, source, width) {
  const cache = cacheForBook(bookId);
  const key = selectedBook.pages.indexOf(source) + ':' + width;
  if (cache.has(key)) return cache.get(key);
  const request = renderPhotoPage(source, width, selectedBook.ratio, document.documentElement.lang === 'zh-Hant').then((art) => {
    const texture = new THREE.CanvasTexture(art);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(
      MAX_TEXTURE_ANISOTROPY,
      renderer.capabilities.getMaxAnisotropy(),
    );
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return makePaperMaterial(texture);
  });
  cache.set(key, request);
  return request;
}

async function loadNearbyPages(current) {
  const width = textureWidth();
  const selected = selectedBook;
  const indices = selected.pages.map((_, index) => index).filter(index => Math.abs(index - current) <= 4 || (current === 0 && index < 4));
  await Promise.all(indices.map(async index => {
    const material = pageMaterials[index];
    if (material.userData.pixelWidth >= width) return;
    const key = index + ':' + width;
    if (!pendingPages.has(key)) pendingPages.set(key, (async () => {
      const loaded = await pageMaterial(selected.id, selected.pages[index], width);
      if (disposed || selectedBook !== selected) { loaded.map?.dispose(); loaded.dispose(); return; }
      if (material.userData.pixelWidth >= width) {
        loaded.map?.dispose(); loaded.dispose(); cacheForBook(selected.id).delete(key); return;
      }
      material.map?.dispose();
      material.map = loaded.map;
      material.userData.pixelWidth = width;
      loaded.map = null;
      loaded.dispose();
      cacheForBook(selected.id).delete(key);
      material.needsUpdate = true;
      requestRender();
    })().finally(() => pendingPages.delete(key)));
    await pendingPages.get(key);
  }));
  for (let index = 0; index < pageMaterials.length; index++) if (Math.abs(index - current) > 8) {
    const material = pageMaterials[index];
    material.map?.dispose(); material.map = null; material.userData.pixelWidth = 0; material.needsUpdate = true;
  }
}

function disposeBookMaterials(bookId) {
  const cache = materialCaches.get(bookId);
  if (!cache) return;
  materialCaches.delete(bookId);
  for (const request of new Set(cache.values())) {
    request.then((material) => {
      if (material === blankMaterial) return;
      material.map?.dispose();
      material.dispose();
    }).catch(() => {});
  }
}

function rememberBook(bookId) {
  const previousIndex = recentBookIds.indexOf(bookId);
  if (previousIndex >= 0) recentBookIds.splice(previousIndex, 1);
  recentBookIds.push(bookId);

  const retained = new Set(recentBookIds.slice(-CACHED_BOOK_LIMIT));
  for (const cachedBookId of materialCaches.keys()) {
    if (!retained.has(cachedBookId)) disposeBookMaterials(cachedBookId);
  }
  while (recentBookIds.length > CACHED_BOOK_LIMIT) recentBookIds.shift();
}

function memoizeSheetDeformation() {
  for (const sheet of flipBook) {
    if (memoizedSheets.has(sheet)) continue;
    const flip = sheet.flip.bind(sheet);
    let previousPageProgress = Number.NaN;
    let previousDirection = Number.NaN;
    let previousCurveIntensity = Number.NaN;
    sheet.flip = (pageProgress, direction, curveIntensity = 1) => {
      if (
        pageProgress === previousPageProgress
        && direction === previousDirection
        && curveIntensity === previousCurveIntensity
      ) return;
      previousPageProgress = pageProgress;
      previousDirection = direction;
      previousCurveIntensity = curveIntensity;
      flip(pageProgress, direction, curveIntensity);
      dirtySheets.add(sheet);
    };
    memoizedSheets.add(sheet);
  }
}

function setLoading(value, copy = readerText.loading) {
  loading = value;
  loadingCard.classList.toggle("is-visible", value);
  loadingCard.hidden = !value;
  loadingCard.setAttribute("aria-hidden", String(!value));
  loadingCopy.textContent = value ? copy : "";
  previousButton.disabled = value;
  nextButton.disabled = value;
}

function renderLibrary() {
  library.innerHTML = books
    .map(
      (book) => `
        <button class="library-book ${book.id === selectedBook.id ? "is-active" : ""}"
          type="button" data-book="${book.id}" aria-label="${readerText.open(bookTitle(book))}" title="${bookTitle(book)}">
          <span aria-hidden="true">${book.mark}</span>
        </button>`,
    )
    .join("");
}

async function selectBook(book, immediate = false) {
  if (!book || (book.id === selectedBook.id && !immediate)) return;

  clearEdgePreview(true);
  selectedBook = book;
  const token = ++loadToken;
  renderLibrary();
  setLoading(true, readerText.preparing(bookTitle(book)));
  resize();

  pageMaterials = book.pages.map(() => makePaperMaterial());
  if (token !== loadToken) return;

  flipBook.scale.x = book.ratio;
  flipBook.setPages(pageMaterials);
  memoizeSheetDeformation();
  flipBook.progress = 0;
  refreshAllPageNormals();
  // Quick FlipBook assigns supplied materials through an internal promise
  // chain. Drain those microtasks before making the new edition interactive.
  for (let index = 0; index < pageMaterials.length; index += 1) await Promise.resolve();
  if (token !== loadToken) return;
  flipBook.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  rememberBook(book.id);
  await loadNearbyPages(0);
  if (disposed) return;
  setLoading(false);
  canvas.dataset.ready = 'true';
  updateStatus();
  requestRender();
}

function refreshAllPageNormals() {
  for (const sheet of flipBook) sheet.page.geometry.computeVertexNormals();
  dirtySheets.clear();
}

function refreshDirtyPageNormals() {
  for (const sheet of dirtySheets) sheet.page.geometry.computeVertexNormals();
  dirtySheets.clear();
}

function getBookScreenMetrics() {
  const bounds = canvas.getBoundingClientRect();
  const pixelsPerWorldUnit = bounds.width / Math.max(0.001, camera.right - camera.left);
  return {
    centerX: bounds.left + bounds.width / 2,
    centerY: bounds.top + bounds.height / 2,
    pageWidth: selectedBook.ratio * pixelsPerWorldUnit,
    pageHeight: pixelsPerWorldUnit,
  };
}

function clearEdgePreview(immediate = false) {
  if (edgePreview.baseSheet === null) return;
  edgePreview.target = 0;
  if (!immediate) {
    requestRender();
    return;
  }

  flipBook.progress = edgePreview.baseSheet;
  edgePreview.baseSheet = null;
  edgePreview.direction = 0;
  edgePreview.amount = 0;
  requestRender();
}

function updateEdgePreview(event) {
  if (reducedMotion || loading || pointerStart || event.pointerType === "touch") return;

  const previewActive = edgePreview.baseSheet !== null;
  const sheet = previewActive ? edgePreview.baseSheet : Math.round(flipBook.progress);
  if (!previewActive && Math.abs(flipBook.progress - sheet) >= 0.001) return;

  const metrics = getBookScreenMetrics();
  const maxSheet = Math.ceil(flipBook.totalPages / 2);
  const direction = edgePreviewDirection({
    sheet,
    maxSheet,
    pointerX: event.clientX,
    pointerY: event.clientY,
    edgeZone: EDGE_PREVIEW_ZONE,
    ...metrics,
  });

  if (direction === 0) {
    clearEdgePreview();
    return;
  }

  if (previewActive && edgePreview.direction !== direction) clearEdgePreview(true);
  edgePreview.baseSheet = sheet;
  edgePreview.direction = direction;
  edgePreview.target = EDGE_PREVIEW_AMOUNT;
  requestRender();
}

function animateEdgePreview(delta) {
  if (edgePreview.baseSheet === null) return false;

  const easing = edgePreview.target > edgePreview.amount ? 18 : 14;
  const blend = 1 - Math.exp(-easing * delta);
  edgePreview.amount += (edgePreview.target - edgePreview.amount) * blend;

  if (Math.abs(edgePreview.target - edgePreview.amount) < EDGE_PREVIEW_EPSILON) {
    edgePreview.amount = edgePreview.target;
  }

  if (edgePreview.target === 0 && edgePreview.amount === 0) {
    flipBook.progress = edgePreview.baseSheet;
    edgePreview.baseSheet = null;
    edgePreview.direction = 0;
    edgePreview.amount = 0;
    return false;
  }

  const maxSheet = Math.ceil(flipBook.totalPages / 2);
  const pose = edgePreviewPose(
    edgePreview.baseSheet,
    edgePreview.direction,
    edgePreview.amount,
    maxSheet,
  );
  if (!pose) {
    clearEdgePreview(true);
    return false;
  }


  // Once the lift reaches its target, keep the already-deformed geometry and
  // stop feeding the modifier stack identical poses on every animation frame.
  if (
    edgePreview.target > 0
    && edgePreview.amount === edgePreview.target
    && Math.abs(flipBook.progress - pose.progress) < EDGE_PREVIEW_EPSILON
  ) {
    if (flipBook.progress !== pose.progress) flipBook.progress = pose.progress;
    return false;
  }

  flipBook.progress = pose.progress;
  if (edgePreview.target === 0) {
    let sheetIndex = 0;
    for (const sheet of flipBook) {
      if (sheetIndex === pose.sheetIndex) {
        // The engine derives bend direction from progress velocity. During a
        // hover return that would invert the curl, so preserve the lift's bend.
        sheet.flip(pose.pageProgress, edgePreview.direction, pose.curveIntensity);
        break;
      }
      sheetIndex += 1;
    }
  }
  return edgePreview.amount !== edgePreview.target;
}

function takeEdgePreviewForDrag() {
  if (edgePreview.baseSheet === null || edgePreview.target === 0) return null;

  const preview = {
    sheet: edgePreview.baseSheet,
    direction: edgePreview.direction,
    fraction: edgePreview.amount,
  };
  // Keep flipBook.progress and the current curl exactly where the hover left
  // them; pointer movement will take ownership of that pose on the next frame.
  edgePreview.baseSheet = null;
  edgePreview.direction = 0;
  edgePreview.amount = 0;
  edgePreview.target = 0;
  return preview;
}

function nextPage() {
  if (!loading && flipBook.currentPage < flipBook.totalPages) {
    clearEdgePreview(true);
    flipBook.nextPage();
    requestRender();
  }
}

function previousPage() {
  if (!loading && flipBook.currentPage > 0) {
    clearEdgePreview(true);
    flipBook.previousPage();
    requestRender();
  }
}

function updateStatus() {
  const current = edgePreview.baseSheet === null
    ? Math.round(flipBook.currentPage || 0)
    : edgePreview.baseSheet * 2;
  const total = flipBook.totalPages || selectedBook.pages.length;
  const shown = Math.min(current, total);
  const statusKey = `${loading}:${shown}:${total}`;
  if (statusKey === lastStatusKey) return;
  lastStatusKey = statusKey;
  if (shown === 0) pageState.textContent = readerText.cover;
  else if (shown >= total) pageState.textContent = readerText.backCover;
  else pageState.textContent = readerText.spread(Math.ceil(shown / 2), Math.ceil(total / 2));
  previousButton.disabled = loading || shown <= 0;
  nextButton.disabled = loading || shown >= total;
  root.dataset.page = String(shown);
  onStatus?.({ current: shown, total });
  if (!loading && shown !== lastLoadedSpread) {
    lastLoadedSpread = shown;
    loadNearbyPages(shown).catch(onError);
  }
}

listen(library, "click", (event) => {
  const button = event.target.closest("[data-book]");
  if (button) selectBook(books.find((book) => book.id === button.dataset.book));
});

listen(previousButton, "click", previousPage);
listen(nextButton, "click", nextPage);

listen(canvas, "pointerdown", (event) => {
  if (!event.isPrimary || loading) return;

  const preview = takeEdgePreviewForDrag();
  if (!preview) clearEdgePreview(true);
  const metrics = getBookScreenMetrics();
  const sheet = preview?.sheet ?? Math.round(flipBook.progress);
  const maxSheet = Math.ceil(flipBook.totalPages / 2);
  const settled = preview !== null || Math.abs(flipBook.progress - sheet) < 0.001;
  const overBook = isPointerOverBook({
    sheet,
    maxSheet,
    pointerX: event.clientX,
    pointerY: event.clientY,
    ...metrics,
  });

  pointerStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
    sheet,
    maxSheet,
    pageWidth: metrics.pageWidth,
    direction: preview?.direction
      ?? chooseDragDirection(sheet, maxSheet, event.clientX, metrics.centerX),
    dragReady: settled && overBook,
    dragging: false,
    startFraction: preview?.fraction ?? 0,
    fraction: preview?.fraction ?? 0,
    pendingFraction: null,
  };
  canvas.setPointerCapture?.(event.pointerId);
});

listen(canvas, "pointermove", (event) => {
  const start = pointerStart;
  if (!start) {
    updateEdgePreview(event);
    return;
  }
  if (start.pointerId !== event.pointerId || !start.dragReady || loading) return;

  const deltaX = event.clientX - start.x;
  const deltaY = event.clientY - start.y;
  if (!start.dragging) {
    if (Math.abs(deltaX) < 6) return;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.15) {
      start.dragReady = false;
      return;
    }
  }

  const fraction = dragFraction(
    deltaX,
    start.direction,
    start.pageWidth,
    start.startFraction,
  );
  if (!start.dragging && fraction === 0) return;

  start.dragging = true;
  start.fraction = fraction;
  start.pendingFraction = fraction;
  event.preventDefault();
  requestRender();
});

listen(canvas, "pointerup", (event) => {
  const start = pointerStart;
  if (!isActivePointer(start, event.pointerId)) return;

  pointerStart = null;
  if (canvas.hasPointerCapture?.(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  if (loading) return;

  if (start.dragging) {
    start.fraction = dragFraction(
      event.clientX - start.x,
      start.direction,
      start.pageWidth,
      start.startFraction,
    );
    const elapsed = performance.now() - start.time;
    const complete = shouldCompleteDrag(start.fraction, elapsed);
    const targetSheet = start.sheet + (complete ? start.direction : 0);
    flipBook.currentPage = targetSheet * 2;
    requestRender();
    return;
  }

  const deltaX = event.clientX - start.x;
  const deltaY = event.clientY - start.y;
  const elapsed = performance.now() - start.time;

  if (Math.abs(deltaX) > 36 && Math.abs(deltaX) > Math.abs(deltaY)) {
    deltaX < 0 ? nextPage() : previousPage();
  } else if (elapsed < 500 && Math.abs(deltaY) < 20) {
    event.clientX < getBookScreenMetrics().centerX ? previousPage() : nextPage();
  } else if (start.startFraction > 0) {
    flipBook.currentPage = start.sheet * 2;
    requestRender();
  }
});

listen(canvas, "pointercancel", (event) => {
  if (!isActivePointer(pointerStart, event.pointerId)) return;

  // This also restores a consumed hover pose when the pointer is cancelled
  // before the drag threshold is crossed.
  flipBook.currentPage = pointerStart.sheet * 2;
  pointerStart = null;
  requestRender();
});

listen(canvas, "pointerleave", () => {
  if (!pointerStart) clearEdgePreview();
});

listen(root, "keydown", (event) => {
  if (event.target.closest('a, select, input, textarea, button')) return;
  if (event.key === "ArrowRight" || event.key === " ") {
    event.preventDefault();
    nextPage();
  }
  if (event.key === "ArrowLeft") { event.preventDefault(); previousPage(); }
  if (event.key === "Home") {
    event.preventDefault();
    clearEdgePreview(true);
    flipBook.currentPage = 0;
    requestRender();
  }
  if (event.key === "End") {
    event.preventDefault();
    clearEdgePreview(true);
    flipBook.currentPage = flipBook.totalPages;
    requestRender();
  }
});

function resize() {
  const bounds = canvas.parentElement.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const aspect = width / Math.max(1, height);
  const spreadWidth = selectedBook.ratio * 2;
  const padding = width < 620 ? 1.16 : 1.1;
  const halfHeight = Math.max(0.62, (spreadWidth * padding) / (2 * aspect));
  const maxBuffer = renderer.capabilities.maxTextureSize;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxBuffer / Math.max(width, height)));
  renderer.setSize(width, height, false);
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
  requestRender();
  if (!loading && pageMaterials.length) loadNearbyPages(Math.round(flipBook.currentPage)).catch(onError);
}

listen(window, "resize", resize);
let densityQuery;
function watchDensity() {
  densityQuery?.removeEventListener('change', densityChanged);
  densityQuery = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  densityQuery.addEventListener('change', densityChanged);
}
function densityChanged() { watchDensity(); resize(); }
watchDensity();
const observer = new ResizeObserver(resize);
observer.observe(canvas.parentElement);
listen(canvas, 'webglcontextlost', event => { event.preventDefault(); onError?.(new Error('WebGL context lost')); });
resize();
renderLibrary();

function applyDragFrame() {
  const start = pointerStart;
  if (!start?.dragging) return false;
  if (start.pendingFraction === null) return true;

  flipBook.progress = start.sheet + start.direction * start.pendingFraction;
  start.pendingFraction = null;
  return true;
}

function requestRender() {
  if (disposed || animationFrame !== null) return;
  previousFrameTime = performance.now();
  animationFrame = requestAnimationFrame(animate);
}

function continueRendering() {
  if (animationFrame === null) animationFrame = requestAnimationFrame(animate);
}

function animate(timestamp) {
  if (disposed) return;
  animationFrame = null;
  const delta = Math.max(0, Math.min((timestamp - previousFrameTime) / 1000, 0.04));
  previousFrameTime = timestamp;
  const previousProgress = flipBook.progress;
  const dragOwnsFrame = applyDragFrame();
  if (!dragOwnsFrame) flipBook.animate(delta);
  const previewNeedsFrame = animateEdgePreview(delta);
  refreshDirtyPageNormals();
  updateStatus();
  renderer.render(scene, camera);
  canvas.dataset.progress = String(flipBook.progress);
  const progressChanged = Math.abs(previousProgress - flipBook.progress) > 1e-7;
  const turnPending = edgePreview.baseSheet === null && Math.abs(Math.ceil(flipBook.currentPage / 2) - flipBook.progress) > 1e-7;
  if (previewNeedsFrame || (!dragOwnsFrame && (progressChanged || turnPending))) continueRendering();
}

requestRender();
try {
  await selectBook(books[0], true);
} catch (error) {
  dispose();
  throw error;
}

function dispose() {
  if (disposed) return;
  disposed = true;
  events.abort();
  observer.disconnect();
  densityQuery?.removeEventListener('change', densityChanged);
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  for (const material of pageMaterials) { material.map?.dispose(); material.dispose(); }
  for (const bookId of materialCaches.keys()) disposeBookMaterials(bookId);
  for (const sheet of flipBook) sheet.dispose(true);
  flipBook.dispose();
  blankMaterial.dispose();
  table.geometry.dispose(); table.material.dispose();
  keyLight.shadow.map?.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
}
return dispose;
}

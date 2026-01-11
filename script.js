const state = {
  drawerOpen: false,
  tocOpen: false,
};

function setDrawerOpen(open) {
  const drawer = document.getElementById("nav-drawer");
  const toggle = document.querySelector(".nav-toggle");

  if (!drawer || !toggle) return;

  state.drawerOpen = open;
  drawer.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
}

function setTocOpen(open) {
  const toc = document.getElementById("toc");
  const btn = document.querySelector(".toc-fab");
  if (!toc || !btn) return;

  state.tocOpen = open;
  toc.dataset.open = open ? "true" : "false";
  btn.setAttribute("aria-expanded", String(open));
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function setupNavDrawer() {
  const toggle = document.querySelector(".nav-toggle");
  const drawer = document.getElementById("nav-drawer");

  if (!toggle || !drawer) return;

  toggle.addEventListener("click", () => {
    setDrawerOpen(!state.drawerOpen);
  });

  drawer.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLAnchorElement)) return;
    setDrawerOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) setDrawerOpen(false);
  });
}

function setupToc() {
  const btn = document.querySelector(".toc-fab");
  const toc = document.getElementById("toc");
  if (!btn || !toc) return;

  btn.addEventListener("click", () => {
    setTocOpen(!state.tocOpen);
  });

  toc.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLAnchorElement)) return;
    setTocOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) setTocOpen(false);
  });
}

function setupTocScrollSpy() {
  return;
}

function setupClickRipple() {
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (e.pointerType !== "mouse") return;
      if (e.button !== 0) return;

      const target = e.target;
      if (target instanceof Element) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
      }

      const ripple = document.createElement("span");
      ripple.className = "click-ripple";
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;

      const hue = Math.floor(Math.random() * 20) - 10;
      ripple.style.setProperty("--hue", String(hue));

      document.body.appendChild(ripple);
      ripple.addEventListener(
        "animationend",
        () => {
          ripple.remove();
        },
        { once: true }
      );
    },
    { passive: true }
  );
}

function setupPager() {
  const main = document.querySelector("main.container");
  const toc = document.getElementById("toc");
  const nextBtn = document.getElementById("next-section");
  const tocProgress = document.getElementById("toc-progress");

  if (!main || !toc || !nextBtn || !tocProgress) return;

  const pages = Array.from(main.querySelectorAll(":scope > section"));
  const indexById = new Map();
  const links = Array.from(toc.querySelectorAll('.toc-links a[href^="#"]'));
  const linkById = new Map();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.body.classList.add("paged");

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    page.classList.add("page");
    if (page.id) indexById.set(page.id, i);
  }

  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href) continue;
    const id = decodeURIComponent(href.slice(1));
    linkById.set(id, link);
  }

  const total = pages.length;

  function updateToc(id) {
    for (const link of links) link.removeAttribute("aria-current");
    const active = linkById.get(id);
    if (active) active.setAttribute("aria-current", "true");
  }

  let currentIndex = 0;
  let transitionTimer = 0;
  let transitioning = false;

  function clearPageMotionClasses(page) {
    page.classList.remove("is-exit-up", "is-exit-down", "is-enter-up", "is-enter-down");
  }

  function setTocProgress(index) {
    tocProgress.textContent = `${index + 1}/${total}`;
  }

  function setPage(index, opts = {}) {
    const { updateHash = true, animate = true } = opts;

    const nextIndex = Math.min(Math.max(index, 0), total - 1);
    if (nextIndex === currentIndex && pages[currentIndex]?.classList.contains("is-active")) {
      const id = pages[currentIndex].id;
      if (updateHash && id) history.replaceState(null, "", `#${encodeURIComponent(id)}`);
      return;
    }

    if (transitioning) return;

    const prevIndex = currentIndex;
    currentIndex = nextIndex;

    window.clearTimeout(transitionTimer);
    transitioning = animate && !prefersReducedMotion && prevIndex !== currentIndex;

    const prevPage = pages[prevIndex];
    const nextPage = pages[currentIndex];

    for (const page of pages) {
      if (page !== prevPage && page !== nextPage) {
        page.classList.remove("is-active");
        clearPageMotionClasses(page);
      }
    }

    const dir = currentIndex > prevIndex ? 1 : -1;

    if (!transitioning || !prevPage) {
      for (const page of pages) {
        page.classList.toggle("is-active", page === nextPage);
        clearPageMotionClasses(page);
      }
    } else {
      prevPage.classList.add("is-active");
      nextPage.classList.add("is-active");

      clearPageMotionClasses(prevPage);
      clearPageMotionClasses(nextPage);

      nextPage.classList.add(dir > 0 ? "is-enter-down" : "is-enter-up");
      prevPage.classList.add(dir > 0 ? "is-exit-up" : "is-exit-down");

      nextPage.getBoundingClientRect();

      clearPageMotionClasses(nextPage);

      transitionTimer = window.setTimeout(() => {
        prevPage.classList.remove("is-active");
        clearPageMotionClasses(prevPage);
        transitioning = false;
      }, 300);
    }

    const id = nextPage.id;
    if (id) updateToc(id);
    setTocProgress(currentIndex);

    const isLast = currentIndex === total - 1;
    nextBtn.disabled = isLast;

    if (updateHash && id) {
      if (window.location.hash !== `#${encodeURIComponent(id)}`) {
        history.replaceState(null, "", `#${encodeURIComponent(id)}`);
      }
    }
  }

  function goNext() {
    if (currentIndex >= total - 1) return;
    setPage(currentIndex + 1);
  }

  function goPrev() {
    if (currentIndex <= 0) return;
    setPage(currentIndex - 1);
  }

  for (const link of links) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const href = link.getAttribute("href");
      if (!href) return;
      const id = decodeURIComponent(href.slice(1));
      const idx = indexById.get(id);
      if (typeof idx !== "number") return;
      setPage(idx);
      setTocOpen(false);
    });
  }

  nextBtn.addEventListener("click", goNext);

  window.addEventListener("keydown", (e) => {
    if (!(e instanceof KeyboardEvent)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      const tag = active.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (active.isContentEditable) return;
    }

    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      goNext();
      return;
    }

    if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      goPrev();
    }
  });

  let wheelCooldownUntil = 0;
  window.addEventListener(
    "wheel",
    (e) => {
      if (!(e instanceof WheelEvent)) return;
      if (!document.body.classList.contains("paged")) return;
      const node = e.target instanceof Node ? e.target : null;
      if (node && toc.contains(node)) return;
      if (Math.abs(e.deltaY) < 12) return;
      if (transitioning) {
        e.preventDefault();
        return;
      }

      const now = Date.now();
      if (now < wheelCooldownUntil) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      if (e.deltaY > 0) goNext();
      else goPrev();
      wheelCooldownUntil = now + 720;
    },
    { passive: false }
  );

  window.addEventListener("hashchange", () => {
    const id = decodeURIComponent((window.location.hash || "").replace(/^#/, ""));
    const idx = indexById.get(id);
    if (typeof idx !== "number") return;
    setPage(idx, { updateHash: false });
  });

  const initialId = decodeURIComponent((window.location.hash || "").replace(/^#/, ""));
  const initialIndex = typeof indexById.get(initialId) === "number" ? indexById.get(initialId) : 0;
  setPage(initialIndex, { updateHash: initialId.length === 0, animate: false });

  setupHoverTooltip();
}

function setupHoverTooltip() {
  const tooltip = document.createElement("div");
  tooltip.className = "hover-tooltip";
  tooltip.dataset.show = "false";
  document.body.appendChild(tooltip);

  let hoverTimer = 0;
  let activeTarget = null;
  let lastX = 0;
  let lastY = 0;

  function positionTooltip() {
    const offset = 14;
    const maxX = window.innerWidth - 16;
    const maxY = window.innerHeight - 16;

    const rect = tooltip.getBoundingClientRect();
    let x = lastX + offset;
    let y = lastY + offset;

    if (x + rect.width > maxX) x = Math.max(16, maxX - rect.width);
    if (y + rect.height > maxY) y = Math.max(16, maxY - rect.height);

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  function hideTooltip() {
    tooltip.dataset.show = "false";
    activeTarget = null;
  }

  function showTooltip(text) {
    tooltip.textContent = text;
    tooltip.dataset.show = "true";
    positionTooltip();
  }

  document.addEventListener(
    "mousemove",
    (e) => {
      if (!(e instanceof MouseEvent)) return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (tooltip.dataset.show === "true") positionTooltip();
    },
    { passive: true }
  );

  document.addEventListener(
    "mouseover",
    (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const el = target.closest(".card p, .list-v, .feature-desc, .timeline-desc, .table td");
      if (!(el instanceof HTMLElement)) return;
      if (el.closest("#flow") && el.classList.contains("timeline-desc")) return;

      const activePage = document.querySelector("main.container > section.page.is-active");
      if (activePage && !activePage.contains(el)) return;

      window.clearTimeout(hoverTimer);
      hideTooltip();

      const text = (el.textContent || "").trim();
      if (text.length < 24) return;

      const isOverflowing = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
      if (!isOverflowing) return;

      activeTarget = el;
      hoverTimer = window.setTimeout(() => {
        if (!activeTarget) return;
        showTooltip(text);
      }, 550);
    },
    { passive: true }
  );

  document.addEventListener(
    "mouseout",
    (e) => {
      const to = e.relatedTarget;
      if (!activeTarget) return;
      if (to instanceof Node && activeTarget.contains(to)) return;
      window.clearTimeout(hoverTimer);
      hideTooltip();
    },
    { passive: true }
  );
}

function setupFlowClickPopover() {
  const backdrop = document.createElement("div");
  backdrop.className = "click-popover-backdrop";
  backdrop.dataset.show = "false";

  const popover = document.createElement("div");
  popover.className = "click-popover";
  popover.dataset.show = "false";

  document.body.appendChild(backdrop);
  document.body.appendChild(popover);

  let lastX = 0;
  let lastY = 0;
  let centerPopover = false;

  function positionPopover() {
    const offset = 16;
    const maxX = window.innerWidth - 16;
    const maxY = window.innerHeight - 16;

    const rect = popover.getBoundingClientRect();
    let x = lastX + offset;
    let y = lastY + offset;

    if (centerPopover) {
      x = (window.innerWidth - rect.width) / 2;
      y = (window.innerHeight - rect.height) / 2;
    }

    if (x + rect.width > maxX) x = Math.max(16, maxX - rect.width);
    if (y + rect.height > maxY) y = Math.max(16, maxY - rect.height);
    if (x < 16) x = 16;
    if (y < 16) y = 16;

    popover.style.left = `${x}px`;
    popover.style.top = `${y}px`;
  }

  function hide() {
    backdrop.dataset.show = "false";
    popover.dataset.show = "false";
    popover.innerHTML = "";
    centerPopover = false;
  }

  function setContent(content) {
    popover.innerHTML = "";
    if (typeof content === "string") {
      popover.textContent = content;
      return;
    }
    if (content instanceof Node) {
      popover.appendChild(content);
    }
  }

  function show(content, opts = {}) {
    const { center = false } = opts;
    setContent(content);
    centerPopover = center;
    backdrop.dataset.show = "true";
    popover.dataset.show = "true";
    positionPopover();
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (!(e instanceof KeyboardEvent)) return;
      if (e.key !== "Escape") return;
      if (popover.dataset.show !== "true") return;
      hide();
    },
    { passive: true }
  );

  backdrop.addEventListener("click", hide);

  window.addEventListener(
    "resize",
    () => {
      if (popover.dataset.show === "true") positionPopover();
    },
    { passive: true }
  );

  document.addEventListener(
    "click",
    (e) => {
      if (!(e instanceof MouseEvent)) return;
      if (e.button !== 0) return;

      const target = e.target;
      if (!(target instanceof Element)) return;
      if (popover.contains(target) || backdrop.contains(target)) return;

      const imageTrigger = target.closest("[data-popover-image]");
      if (imageTrigger instanceof HTMLElement) {
        const activePage = document.querySelector("main.container > section.page.is-active");
        if (activePage && !activePage.contains(imageTrigger)) return;

        const src = imageTrigger.getAttribute("data-popover-image");
        if (!src) return;

        const img = document.createElement("img");
        img.src = src;
        img.alt = "手势指令速查";
        img.decoding = "async";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.display = "block";
        img.style.borderRadius = "12px";
        img.style.border = "1px solid rgba(255, 255, 255, 0.12)";

        lastX = e.clientX;
        lastY = e.clientY;
        show(img, { center: true });
        return;
      }

      const desc = target.closest("#flow .timeline-desc");
      if (!(desc instanceof HTMLElement)) {
        if (popover.dataset.show === "true") hide();
        return;
      }

      const activePage = document.querySelector("main.container > section.page.is-active");
      if (activePage && !activePage.contains(desc)) return;

      const text = (desc.textContent || "").trim();
      if (!text) return;

      lastX = e.clientX;
      lastY = e.clientY;
      show(text);
    },
    { passive: true }
  );
}

async function copyProjectLink() {
  const url = window.location.href;
  const btn = document.getElementById("copy-link");
  if (!(btn instanceof HTMLButtonElement)) return;

  const original = btn.textContent;
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = "已复制";
  } catch {
    btn.textContent = "复制失败";
  } finally {
    window.setTimeout(() => {
      btn.textContent = original || "复制项目链接";
    }, 1200);
  }
}

function setupCopyLink() {
  const btn = document.getElementById("copy-link");
  if (!(btn instanceof HTMLButtonElement)) return;
  btn.addEventListener("click", copyProjectLink);
}

function setupFooterYear() {
  const year = document.getElementById("year");
  if (!year) return;
  year.textContent = String(new Date().getFullYear());
}

function setupLastUpdated() {
  const el = document.getElementById("last-updated");
  if (!el) return;
  el.textContent = formatDate(new Date());
}

setupNavDrawer();
setupToc();
setupTocScrollSpy();
setupPager();
setupClickRipple();
setupCopyLink();
setupFooterYear();
setupLastUpdated();
setupFlowClickPopover();

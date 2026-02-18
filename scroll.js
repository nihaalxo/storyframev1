/**
 * Scroll-driven content strip: the scroll viewport scrolls, we translate the strip
 * so each "page" (100vh) moves into view. Wheel events are forwarded so scrolling
 * anywhere (including over the fixed layers) scrolls the viewport.
 */
var scrollViewport = null;
var contentStrip = null;

function getScrollY() {
  if (scrollViewport) return scrollViewport.scrollTop;
  return window.scrollY ?? document.documentElement.scrollTop ?? document.body.scrollTop ?? 0;
}

function updateStrip() {
  if (!contentStrip) return;
  var y = getScrollY();
  contentStrip.style.transform = "translate3d(0, " + (-y) + "px, 0)";
}

function updatePage6Active() {
  var y = getScrollY();
  var onPage6 = pageHeight > 0 && y >= pageHeight * 4.5;
  document.body.classList.toggle("page-6-active", onPage6);
}

function updatePastPage1() {
  var y = getScrollY();
  var pastPage1 = pageHeight > 0 && y >= pageHeight;
  document.body.classList.toggle("past-page-1", pastPage1);
}

function updatePastPage2() {
  var y = getScrollY();
  var pastPage2 = pageHeight > 0 && y >= pageHeight * 2;
  document.body.classList.toggle("past-page-2", pastPage2);
}

function updatePastPage3() {
  var y = getScrollY();
  var pastPage3 = pageHeight > 0 && y >= pageHeight * 3;
  document.body.classList.toggle("past-page-3", pastPage3);
}

function updatePageInView() {
  if (!contentStrip || pageHeight <= 0) return;
  var y = getScrollY();
  var pageIndex = Math.round(y / pageHeight);
  pageIndex = Math.max(0, Math.min(5, pageIndex));
  var pages = contentStrip.querySelectorAll(".page");
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.toggle("page-in-view", i === pageIndex);
  }
}

function updateVideo() {
  var video = document.getElementById("storyframeVideo");
  if (!video) return;
  var onPage6 = document.body.classList.contains("page-6-active");
  var onPage4Or5 = document.body.classList.contains("past-page-3") && !onPage6;
  if (onPage6) {
    video.pause();
    return;
  }
  if (!onPage4Or5) {
    video.pause();
    video.currentTime = 0;
    return;
  }
  if (onPage4Or5 && video.paused && video.currentTime < 0.5) {
    var p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () {});
    }
  }
}

function onScroll() {
  requestAnimationFrame(function () {
    updateStrip();
    updatePage6Active();
    updatePastPage1();
    updatePastPage2();
    updatePastPage3();
    updatePageInView();
    updateVideo();
  });
}

/** One scroll gesture = one page (Mac trackpad: only first event in a burst moves; unblock after gesture ends) */
var wheelBlocked = false;
var wheelUnblockTimer = null;
var wheelUnblockDelayMs = 700;

function onWheel(e) {
  if (!scrollViewport || !pageHeight) return;
  var el = e.target;
  while (el && el !== scrollViewport) el = el.parentNode;
  if (el === scrollViewport) return;
  e.preventDefault();

  if (wheelBlocked) {
    clearTimeout(wheelUnblockTimer);
    wheelUnblockTimer = setTimeout(function () {
      wheelBlocked = false;
    }, wheelUnblockDelayMs);
    return;
  }

  var y = scrollViewport.scrollTop;
  var currentPage = Math.round(y / pageHeight);
  currentPage = Math.max(0, Math.min(5, currentPage));
  var nextPage = e.deltaY > 0 ? currentPage + 1 : currentPage - 1;
  nextPage = Math.max(0, Math.min(5, nextPage));
  if (nextPage === currentPage) return;

  var targetScroll = nextPage * pageHeight;
  scrollViewport.scrollTo({ top: targetScroll, behavior: "smooth" });
  wheelBlocked = true;
  clearTimeout(wheelUnblockTimer);
  wheelUnblockTimer = setTimeout(function () {
    wheelBlocked = false;
  }, wheelUnblockDelayMs);
}

var snapTimeout = null;
var pageHeight = 0;

function snapToPage() {
  if (!scrollViewport || !pageHeight) return;
  var y = scrollViewport.scrollTop;
  var page = Math.round(y / pageHeight);
  page = Math.max(0, Math.min(5, page));
  var target = page * pageHeight;
  if (Math.abs(target - y) > 2) {
    scrollViewport.scrollTo({ top: target, behavior: "smooth" });
  }
}

function onScrollEnd() {
  if (snapTimeout) clearTimeout(snapTimeout);
  snapTimeout = setTimeout(snapToPage, 120);
}

function init() {
  scrollViewport = document.getElementById("scrollViewport");
  contentStrip = document.getElementById("contentStrip");
  pageHeight = window.innerHeight;
  if (scrollViewport) {
    scrollViewport.addEventListener("scroll", function () {
      onScroll();
      onScrollEnd();
    }, { passive: true });
  }
  if (contentStrip) {
    updateStrip();
    updatePage6Active();
    updatePastPage1();
    updatePastPage2();
    updatePastPage3();
    updatePageInView();
    updateVideo();
  }
  var video = document.getElementById("storyframeVideo");
  if (video) {
    video.addEventListener("ended", function () { video.pause(); });
  }
  document.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", function () { pageHeight = window.innerHeight; });

  /* Touch: forward touch scroll to viewport so mobile can scroll */
  var touchStartY = 0;
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length) touchStartY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchmove", function (e) {
    if (!scrollViewport || !e.touches.length) return;
    var y = e.touches[0].clientY;
    var delta = (touchStartY - y) * 2;
    touchStartY = y;
    scrollViewport.scrollTop += delta;
    e.preventDefault();
  }, { passive: false });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

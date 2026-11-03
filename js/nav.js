/**
 * Navigation extras, shared by every page (loaded after build.js).
 *
 * 1. Menu button + slide dots go dark over light photos. The page checks the
 *    actual part of the photo sitting behind them, so it follows each image.
 * 2. Inverted wipe (CSS): the menu panel sweeps across as an inverted view of
 *    the page, then fades to black; closing runs the other way.
 * 3. Page-to-page wipe: following a menu link, the new page opens under the
 *    black panel, which fades to the inverted page and sweeps back.
 */
(function () {
    var root = document.documentElement;
    var body = document.body;
    var nav = document.getElementById("js-nav");
    var btn = document.getElementById("js-toggle-nav");
    if (!nav || !btn) { return; }
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Button / dots tone ---------------------------------------------------
    var galleries = document.querySelector(".gallery__image");
    if (galleries && document.elementsFromPoint) {
        var cache = {};          // image url -> { ctx, w, h } once loaded
        var LIGHT = 135;         // average brightness that counts as light
        var DARK = 120;          // ...and as dark again (gap stops flicker)

        var getImage = function (url) {
            if (cache[url]) { return cache[url].ctx ? cache[url] : null; }
            cache[url] = {};
            var img = new Image();
            img.onload = function () {
                var s = Math.min(1, 320 / img.naturalWidth);
                var c = document.createElement("canvas");
                c.width = Math.max(1, Math.round(img.naturalWidth * s));
                c.height = Math.max(1, Math.round(img.naturalHeight * s));
                var ctx = c.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, c.width, c.height);
                cache[url] = { ctx: ctx, w: c.width, h: c.height };
            };
            img.src = url;
            return null;
        };

        // Brightness (0-255) of the screen area `box` showing through `el`,
        // or null when unknown. Dark backgrounds count as 0.
        var brightnessAt = function (box) {
            var cx = (box.left + box.right) / 2;
            var cy = (box.top + box.bottom) / 2;
            var stack = document.elementsFromPoint(cx, cy);
            for (var i = 0; i < stack.length; i++) {
                var el = stack[i];
                if (el === btn || btn.contains(el) || el.closest(".swiper-pagination")) { continue; }
                if (el.classList.contains("js-hero") || el.closest(".js-hero")) { return 255; }
                if (!el.classList.contains("gallery__image")) {
                    if (el.closest(".gallery__item")) { continue; }
                    if (el.closest(".gallery")) { return 0; }
                    continue;
                }
                var m = /url\(["']?([^"')]+)["']?\)/.exec(el.style.backgroundImage || "");
                if (!m) { return null; }
                var data = getImage(m[1]);
                if (!data) { return null; }
                // Map the screen box onto the image, honouring cover / contain.
                var r = el.getBoundingClientRect();
                var fit = window.getComputedStyle(el).backgroundSize === "contain" ? Math.min : Math.max;
                var s = fit(r.width / data.w, r.height / data.h);
                var ox = r.left + (r.width - data.w * s) / 2;
                var oy = r.top + (r.height - data.h * s) / 2;
                var x0 = Math.floor((box.left - ox) / s), x1 = Math.ceil((box.right - ox) / s);
                var y0 = Math.floor((box.top - oy) / s), y1 = Math.ceil((box.bottom - oy) / s);
                x0 = Math.max(0, x0); y0 = Math.max(0, y0);
                x1 = Math.min(data.w, x1); y1 = Math.min(data.h, y1);
                if (x1 <= x0 || y1 <= y0) { return 0; }   // outside the photo: black surround
                var px = data.ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
                var sum = 0;
                for (var p = 0; p < px.length; p += 4) {
                    sum += 0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2];
                }
                return sum / (px.length / 4);
            }
            return null;
        };

        var setTone = function (cls, value) {
            if (value === null) { return; }
            if (value > LIGHT) { body.classList.add(cls); }
            else if (value < DARK) { body.classList.remove(cls); }
        };

        var checkTone = function () {
            if (nav.classList.contains("is-nav-open")) { return; }
            var b = btn.getBoundingClientRect();
            setTone("is-btn-dark", brightnessAt({ left: b.left - 10, right: b.right + 10, top: b.top - 10, bottom: b.bottom + 10 }));
            var dots = document.querySelector(".swiper-pagination-vertical");
            if (dots && dots.offsetParent !== null) {
                var d = dots.getBoundingClientRect();
                setTone("is-dots-dark", brightnessAt({ left: d.left - 6, right: d.right + 6, top: d.top, bottom: d.bottom }));
            }
        };
        setInterval(checkTone, 250);
        window.addEventListener("load", checkTone);
    }

    // 2. Inverted wipe: handled in CSS (main.css, "Inverted menu wipe"). The
    //    panel is an inverted view of the page while it sweeps, then fades
    //    to black; closing runs backwards.

    // 3. Page-to-page wipe -------------------------------------------------------
    var KEY = "navWipe";
    var store = function (v) {
        try {
            if (v) { sessionStorage.setItem(KEY, "1"); } else { sessionStorage.removeItem(KEY); }
        } catch (e) {}
    };

    // Leaving: a menu link to another page on this site.
    Array.prototype.forEach.call(nav.querySelectorAll(".nav__list a"), function (a) {
        a.addEventListener("click", function (e) {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
            if (a.hasAttribute("download") || (a.target && a.target !== "_self")) { return; }
            if (a.origin !== window.location.origin) { return; }
            store(true);
        });
    });

    // Arriving: the <head> snippet has already shown the panel fully closed
    // over the page (html.is-arriving). Let the page settle, then wipe back.
    if (root.classList.contains("is-arriving")) {
        store(false);
        if (reduceMotion) {
            root.classList.remove("is-arriving");
        } else {
            // Black fades to an inverted view of the new page, then the
            // inverted panel sweeps back to the side.
            setTimeout(function () {
                void nav.offsetWidth;                      // lock in the covered state
                root.classList.add("is-uncovering");
                setTimeout(function () {
                    root.classList.remove("is-arriving", "is-uncovering");
                }, 520);
            }, 150);
        }
    }

    // Back/forward from the browser cache: don't come back to an open menu.
    window.addEventListener("pageshow", function (e) {
        if (!e.persisted) { return; }
        store(false);
        root.classList.remove("is-arriving", "is-uncovering");
        if (nav.classList.contains("is-nav-open")) { btn.click(); }
    });
})();

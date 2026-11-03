/**
 * Sun hero (home-v2.html)
 * - picks the small or large sun video and only plays it while the hero is in view
 * - eases the sun (and the yellow circle with it) gently away from the mouse
 * - optional ambient sound, off by default, toggled by the button in the corner
 * Respects prefers-reduced-motion: the poster frame shows and nothing moves.
 */
(function () {
    var hero = document.querySelector(".js-hero");
    if (!hero) { return; }

    var video = hero.querySelector(".hero__sun");
    var soundBtn = hero.querySelector(".hero__sound");
    var body = document.body;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Video ----------------------------------------------------------------
    var inView = true;

    if (!reduceMotion && video) {
        var small = window.innerWidth * (window.devicePixelRatio || 1) < 1200;
        video.src = video.getAttribute(small ? "data-src-small" : "data-src");
        video.load();
    }

    function updatePlayback() {
        if (!video || reduceMotion || !video.src) { return; }
        if (inView && !document.hidden) {
            var p = video.play();
            if (p && p.catch) { p.catch(function () {}); }
        } else {
            video.pause();
        }
    }

    function sliderOn() {
        var list = document.querySelector(".client-list");
        return !!(list && list.swiper);
    }

    // On desktop the hero is a slide; Swiper marks it swiper-slide-active.
    // On phones the page scrolls normally, so watch it with an observer.
    function syncActive() {
        if (sliderOn()) {
            inView = hero.classList.contains("swiper-slide-active");
        }
        body.classList.toggle("is-hero-active", inView);
        updatePlayback();
        updateSound();
    }

    if ("MutationObserver" in window) {
        new MutationObserver(syncActive).observe(hero, { attributes: true, attributeFilter: ["class"] });
    }
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
            // Only trust this when the page is scrolling (no vertical swiper).
            if (!sliderOn()) {
                inView = entries[0].isIntersecting;
                body.classList.toggle("is-hero-active", inView);
                updatePlayback();
                updateSound();
            }
        }, { threshold: 0.25 }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () {
        updatePlayback();
        updateSound();
    });
    window.addEventListener("load", syncActive);
    syncActive();

    // Mouse drift ------------------------------------------------------------
    var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!reduceMotion && canHover) {
        var MAX = 14;            // furthest the sun travels, in px
        var target = { x: 0, y: 0 };
        var current = { x: 0, y: 0 };
        var running = false;

        hero.addEventListener("mousemove", function (e) {
            var r = hero.getBoundingClientRect();
            // -1 .. 1 from the centre; the sun moves away from the cursor
            target.x = -((e.clientX - r.left) / r.width - 0.5) * 2 * MAX;
            target.y = -((e.clientY - r.top) / r.height - 0.5) * 2 * MAX;
            start();
        });
        hero.addEventListener("mouseleave", function () {
            target.x = 0;
            target.y = 0;
            start();
        });

        function start() {
            if (!running) {
                running = true;
                requestAnimationFrame(tick);
            }
        }
        function tick() {
            current.x += (target.x - current.x) * 0.04;
            current.y += (target.y - current.y) * 0.04;
            hero.style.setProperty("--hero-drift-x", current.x.toFixed(2) + "px");
            hero.style.setProperty("--hero-drift-y", current.y.toFixed(2) + "px");
            if (Math.abs(target.x - current.x) > 0.05 || Math.abs(target.y - current.y) > 0.05) {
                requestAnimationFrame(tick);
            } else {
                running = false;
            }
        }
    }

    // Ambient sound -------------------------------------------------------------
    // Shows only if the file exists. Browsers block sound until a click,
    // so it always starts off.
    var audio = null;
    var soundWanted = false;

    if (soundBtn && soundBtn.getAttribute("data-audio")) {
        audio = new Audio();
        audio.loop = true;
        audio.preload = "none";
        audio.volume = 0;
        audio.src = soundBtn.getAttribute("data-audio");

        fetch(audio.src, { method: "HEAD" }).then(function (res) {
            if (res.ok) { soundBtn.classList.add("is-available"); }
        }).catch(function () {});

        soundBtn.addEventListener("click", function () {
            soundWanted = !soundWanted;
            soundBtn.classList.toggle("is-on", soundWanted);
            soundBtn.setAttribute("aria-pressed", soundWanted ? "true" : "false");
            soundBtn.querySelector(".hero__sound-label").textContent = soundWanted ? "sound on" : "sound off";
            updateSound();
        });
    }

    var fadeTimer = null;
    function fadeTo(vol, done) {
        clearInterval(fadeTimer);
        fadeTimer = setInterval(function () {
            var v = audio.volume + (vol > audio.volume ? 0.04 : -0.04);
            if ((vol > audio.volume && v >= vol) || (vol <= audio.volume && v <= vol)) {
                audio.volume = vol;
                clearInterval(fadeTimer);
                if (done) { done(); }
            } else {
                audio.volume = Math.max(0, Math.min(1, v));
            }
        }, 50);
    }

    function updateSound() {
        if (!audio) { return; }
        if (soundWanted && inView && !document.hidden) {
            var p = audio.play();
            if (p && p.catch) { p.catch(function () {}); }
            fadeTo(0.6);
        } else if (!audio.paused) {
            fadeTo(0, function () { audio.pause(); });
        }
    }
})();

/**
 * Sun hero (home-v2.html)
 * - picks the small or large sun video and only plays it while the hero is in view
 * - gently grows the sun and circle as the mouse nears them, shrinks them as it moves away
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

    // Mouse zoom ------------------------------------------------------------
    // The sun and circle grow a little as the cursor nears the centre and
    // shrink a little as it moves out towards the edges.
    var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!reduceMotion && canHover) {
        var RANGE = 0.03;        // +/- 3% either side of normal size
        var target = 1;
        var current = 1;
        var running = false;

        hero.addEventListener("mousemove", function (e) {
            var r = hero.getBoundingClientRect();
            var dx = (e.clientX - r.left) / r.width - 0.5;
            var dy = (e.clientY - r.top) / r.height - 0.5;
            // 0 at the centre, 1 at the edges/corners
            var d = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 0.5);
            target = 1 + RANGE - d * 2 * RANGE;
            start();
        });
        hero.addEventListener("mouseleave", function () {
            target = 1;
            start();
        });

        function start() {
            if (!running) {
                running = true;
                requestAnimationFrame(tick);
            }
        }
        function tick() {
            current += (target - current) * 0.04;
            hero.style.setProperty("--hero-zoom", current.toFixed(4));
            if (Math.abs(target - current) > 0.0005) {
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

/**
 * Sun hero (home-v2.html)
 * - picks the small or large sun video and only plays it while the hero is in view
 * - breathes the yellow circle; while the mouse moves the breath pauses and the sun
 *   and circle slowly grow/shrink with the cursor, then the breath resumes seamlessly
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

    // Breathing and mouse zoom ------------------------------------------------
    // Mouse still: the yellow circle breathes in and out.
    // Mouse moving: the breath eases to a pause wherever it is, and the sun
    // and circle slowly grow as the cursor nears the centre / shrink as it
    // moves towards the edges.
    // Mouse stops: the zoom eases back to normal and the breath carries on
    // from exactly where it paused, so the hand-over is seamless.
    if (!reduceMotion) {
        var BREATH_SECONDS = 9;      // one full in-and-out
        var BREATH_GROW = 0.115;     // largest breath is 11.5% bigger
        var ZOOM_RANGE = 0.03;       // mouse zoom, +/- 3%
        var IDLE_MS = 450;           // how long still counts as "stopped"
        var EASE = 0.04;             // softness of every change (per 60fps frame)

        var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        var phase = 0;               // 0..2PI through the breath
        var breathRate = 1;          // 1 = breathing, 0 = paused (eased)
        var zoom = 1;
        var zoomTarget = 1;
        var lastMove = 0;
        var lastTime = 0;

        hero.classList.add("is-js-breath");

        if (canHover) {
            hero.addEventListener("mousemove", function (e) {
                var r = hero.getBoundingClientRect();
                var dx = (e.clientX - r.left) / r.width - 0.5;
                var dy = (e.clientY - r.top) / r.height - 0.5;
                // 0 at the centre, 1 at the edges/corners
                var d = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 0.5);
                zoomTarget = 1 + ZOOM_RANGE - d * 2 * ZOOM_RANGE;
                lastMove = performance.now();
            });
            hero.addEventListener("mouseleave", function () {
                lastMove = 0;
            });
        }

        var frame = function (now) {
            requestAnimationFrame(frame);
            var dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
            lastTime = now;
            if (!inView) { return; }

            var moving = lastMove && now - lastMove < IDLE_MS;
            var k = 1 - Math.pow(1 - EASE, dt * 60);

            breathRate += ((moving ? 0 : 1) - breathRate) * k;
            zoom += ((moving ? zoomTarget : 1) - zoom) * k;
            phase = (phase + dt * breathRate * 2 * Math.PI / BREATH_SECONDS) % (2 * Math.PI);

            var b = (1 - Math.cos(phase)) / 2;   // 0 = smallest, 1 = largest
            hero.style.setProperty("--hero-breath", (1 + b * BREATH_GROW).toFixed(4));
            hero.style.setProperty("--hero-breath-opacity", (0.94 + b * 0.06).toFixed(3));
            hero.style.setProperty("--hero-zoom", zoom.toFixed(4));
        };
        requestAnimationFrame(frame);
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

/* ==========================================================================
   MASCOTAS A TU MEZA · app.js
   - Loader de marca + arranque coordinado
   - Escena 3D persistente (Three.js): plato con ingredientes en órbita que
     se arma con el scroll
   - Coreografía de scroll (GSAP ScrollTrigger + Lenis): pins, zoom de imagen,
     carrusel horizontal, tarjetas apiladas, texto que se ilumina
   - Formulario → WhatsApp, acordeón, tema claro/oscuro, menú móvil
   Todo degrada con gracia: sin GSAP / sin WebGL / con movimiento reducido
   la página sigue siendo completa y usable.
   ========================================================================== */
(() => {
    'use strict';

    /* ------------------------------------------------------------------
       CONFIGURACIÓN  ← edita aquí
       ------------------------------------------------------------------ */
    const CONFIG = {
        // Número de WhatsApp con lada de país y solo dígitos. Ej: '5216621234567'
        // Vacío = WhatsApp abre con el mensaje listo y deja elegir el contacto.
        whatsappNumber: '',
        loaderMinMs: 2600,
        loaderMaxMs: 9000,
    };

    /* ------------------------------------------------------------------
       UTILIDADES
       ------------------------------------------------------------------ */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const root = document.documentElement;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = t => t * t * (3 - 2 * t);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const TAU = Math.PI * 2;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    const useMotion = hasGSAP && !reduceMotion;

    if (useMotion) root.classList.add('anim', 'motion');

    let lenis = null;
    let scene = null;
    let menuOpen = false;

    /* ------------------------------------------------------------------
       WHATSAPP
       ------------------------------------------------------------------ */
    const waUrl = text => {
        const num = String(CONFIG.whatsappNumber || '').replace(/\D/g, '');
        const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
        return `${base}?text=${encodeURIComponent(text)}`;
    };
    $$('[data-wa]').forEach(a => { a.href = waUrl(a.dataset.wa); });
    $$('[data-year]').forEach(n => { n.textContent = new Date().getFullYear(); });

    /* ------------------------------------------------------------------
       TEMA CLARO / OSCURO
       ------------------------------------------------------------------ */
    const themeBtn = $('[data-theme-toggle]');
    const themeMeta = $('meta[name="theme-color"]');
    function applyThemeUI(theme) {
        if (themeBtn) {
            const icon = $('i', themeBtn);
            icon.className = theme === 'dark' ? 'ph-bold ph-sun' : 'ph-bold ph-moon';
            themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
        }
        if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#0d0720' : '#fbf7ff');
        if (scene) scene.setTheme(theme === 'light');
    }
    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        try { localStorage.setItem('mtm-theme', theme); } catch (e) { /* almacenamiento bloqueado */ }
        applyThemeUI(theme);
    }
    if (themeBtn) themeBtn.addEventListener('click', () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

    /* ------------------------------------------------------------------
       SCROLL SUAVE (Lenis) + ANCLAS
       ------------------------------------------------------------------ */
    function initLenis() {
        if (!useMotion || !window.Lenis) return;
        lenis = new window.Lenis({
            duration: 1.25,
            easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
        });
        lenis.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add(time => lenis.raf(time * 1000));
        window.gsap.ticker.lagSmoothing(0);
    }

    function scrollToTarget(target) {
        let y = null;
        const st = hasGSAP && target.id ? window.ScrollTrigger.getById(target.id) : null;
        if (st) y = st.start;
        if (lenis) {
            lenis.scrollTo(y !== null ? y : target, { offset: y !== null ? 0 : -12, duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) });
        } else {
            const top = y !== null ? y : target.getBoundingClientRect().top + window.scrollY - 12;
            window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
    }

    document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        const wasOpen = menuOpen;
        if (wasOpen) closeMenu();
        setTimeout(() => scrollToTarget(target), wasOpen ? 450 : 0);
    });

    /* ------------------------------------------------------------------
       MENÚ MÓVIL
       ------------------------------------------------------------------ */
    const burger = $('[data-burger]');
    const mobileMenu = $('#mobile-menu');
    function openMenu() {
        menuOpen = true;
        mobileMenu.classList.add('is-open');
        mobileMenu.setAttribute('aria-hidden', 'false');
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Cerrar menú');
        $('i', burger).className = 'ph-bold ph-x';
        if (lenis) lenis.stop(); else root.classList.add('is-loading');
        if (hasGSAP) {
            window.gsap.fromTo($$('.mobile-menu-links a, .mobile-menu-foot .btn'),
                { y: 40, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: .8, ease: 'power3.out', stagger: .06, delay: .25, overwrite: true });
        }
    }
    function closeMenu() {
        menuOpen = false;
        mobileMenu.classList.remove('is-open');
        mobileMenu.setAttribute('aria-hidden', 'true');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Abrir menú');
        $('i', burger).className = 'ph-bold ph-list';
        if (lenis) lenis.start(); else root.classList.remove('is-loading');
    }
    if (burger) burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) closeMenu(); });
    matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches && menuOpen) closeMenu(); });

    /* ------------------------------------------------------------------
       LOADER
       ------------------------------------------------------------------ */
    function runLoader(extraReady) {
        return new Promise(resolve => {
            const loader = $('#loader');
            if (!loader) { resolve(); return; }
            const pctEl = $('[data-loader-pct]');
            const msgEl = $('[data-loader-msg]');
            const bar = $('.loader-bar');
            const msgs = ['Seleccionando ingredientes', 'Picando los vegetales', 'Preparando el plato', 'Sirviendo la mesa'];
            const minMs = reduceMotion ? 350 : CONFIG.loaderMinMs;
            let loaded = false;
            let shown = 0;
            let lastMsg = -1;
            let finished = false;
            const t0 = performance.now();

            root.classList.add('is-loading');
            if (lenis) lenis.stop();

            Promise.all([
                document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
                new Promise(r => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true }))),
                extraReady || Promise.resolve(),
            ]).then(() => { loaded = true; });
            setTimeout(() => { loaded = true; }, CONFIG.loaderMaxMs);

            const finish = () => {
                if (finished) return;
                finished = true;
                const g = window.gsap;
                if (!g || reduceMotion) {
                    loader.style.transition = 'opacity .5s ease';
                    loader.style.opacity = '0';
                    setTimeout(() => { loader.remove(); resolve(); }, 520);
                    return;
                }
                const tl = g.timeline({ onComplete: () => loader.remove() });
                tl.to('.loader-core', { scale: .84, autoAlpha: 0, duration: .55, ease: 'power2.in' })
                    .to('.loader-seam', { autoAlpha: 1, scaleX: 1, duration: .55, ease: 'power3.out' }, '<.05')
                    .to('.loader-panel--top', { yPercent: -101, duration: 1.15, ease: 'power4.inOut' }, '+=.05')
                    .to('.loader-panel--bottom', { yPercent: 101, duration: 1.15, ease: 'power4.inOut' }, '<')
                    .to('.loader-seam', { autoAlpha: 0, duration: .35 }, '<.25')
                    .add(resolve, '-=.75');
            };

            const tick = now => {
                const elapsed = now - t0;
                let target = clamp(elapsed / minMs, 0, 1) * 100;
                if (!loaded) target = Math.min(target, 91);
                shown += (target - shown) * .1;
                if (target - shown < .08) shown = target;
                const p = Math.round(shown);
                pctEl.textContent = p;
                bar.style.strokeDashoffset = String(100 - shown);
                const mi = p < 30 ? 0 : p < 60 ? 1 : p < 90 ? 2 : 3;
                if (mi !== lastMsg) { lastMsg = mi; msgEl.textContent = msgs[mi]; }
                if (loaded && elapsed >= minMs && shown >= 99.5) { pctEl.textContent = '100'; bar.style.strokeDashoffset = '0'; finish(); return; }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    /* ------------------------------------------------------------------
       DIVISIÓN DE PALABRAS (para reveals por máscara)
       ------------------------------------------------------------------ */
    function splitWords(el) {
        const out = [];
        const walk = node => {
            Array.from(node.childNodes).forEach(n => {
                if (n.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach(part => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const w = document.createElement('span');
                        w.className = 'w';
                        const i = document.createElement('span');
                        i.className = 'w-in';
                        i.textContent = part;
                        w.appendChild(i);
                        frag.appendChild(w);
                        out.push(w);
                    });
                    n.replaceWith(frag);
                } else if (n.nodeType === 1) {
                    if (n.classList.contains('inline-img')) { n.classList.add('w'); out.push(n); }
                    else if (n.tagName !== 'BR') walk(n);
                }
            });
        };
        walk(el);
        return out;
    }

    /* ==================================================================
       ESCENA 3D
       ================================================================== */
    function createStage(canvas) {
        const T = window.THREE;
        if (!T) return null;

        let renderer;
        try {
            renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        } catch (err) { return null; }
        if (!renderer.getContext()) return null;
        const mobile = matchMedia('(max-width: 767px)').matches;
        const animated = !reduceMotion;

        renderer.setClearColor(0x000000, 0);
        renderer.outputEncoding = T.sRGBEncoding;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = .88;

        const scn = new T.Scene();
        const camera = new T.PerspectiveCamera(30, 1, .1, 80);
        camera.position.set(0, 2.4, 9.5);
        const LOOK = new T.Vector3(0, .45, 0);
        camera.lookAt(LOOK);

        const col = hex => new T.Color(hex).convertSRGBToLinear();

        /* ---- entorno (reflejos de estudio con los colores de marca) ----
           Panorama equirectangular dibujado en canvas → PMREM. */
        (function buildEnv() {
            const c = document.createElement('canvas');
            c.width = 1024; c.height = 512;
            const g = c.getContext('2d');
            const sky = g.createLinearGradient(0, 0, 0, 512);
            sky.addColorStop(0, '#f4eeff');
            sky.addColorStop(.4, '#b9a4e6');
            sky.addColorStop(.58, '#6d4ab0');
            sky.addColorStop(1, '#170b38');
            g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
            const soft = (x, y, w, h, color, a) => {
                const r = g.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
                r.addColorStop(0, color); r.addColorStop(1, 'rgba(255,255,255,0)');
                g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(w / Math.max(w, h), h / Math.max(w, h)); g.translate(-x, -y);
                g.fillStyle = r; g.beginPath(); g.arc(x, y, Math.max(w, h), 0, TAU); g.fill(); g.restore();
            };
            soft(200, 90, 150, 70, '#ffffff', 1);      // luz principal arriba-izquierda
            soft(800, 250, 60, 110, '#ff8ccb', .75);    // borde rosa a la derecha
            soft(520, 430, 170, 50, '#a98aff', .8);     // relleno violeta abajo
            soft(940, 120, 80, 50, '#ffffff', .7);
            const tex = new T.CanvasTexture(c);
            tex.mapping = T.EquirectangularReflectionMapping;
            tex.encoding = T.sRGBEncoding;
            const pmrem = new T.PMREMGenerator(renderer);
            scn.environment = pmrem.fromEquirectangular(tex).texture;
            pmrem.dispose();
            tex.dispose();
        })();
        /* ---- luces ---- */
        scn.add(new T.HemisphereLight(0xe8defa, 0x2a0f5a, .6));
        const key = new T.DirectionalLight(0xfff4ea, 1.5);
        key.position.set(-3, 6, 5);
        scn.add(key);
        const rimPink = new T.PointLight(0xff4daa, 1.5, 16);
        rimPink.position.set(4.5, 2.4, -2.5);
        scn.add(rimPink);
        const rimViolet = new T.PointLight(0x7c3aed, 1.8, 14);
        rimViolet.position.set(-4.5, 1.2, -3);
        scn.add(rimViolet);

        /* ---- texturas procedurales ---- */
        const canvasTex = (w, h, draw) => {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            draw(c.getContext('2d'), w, h);
            const t = new T.CanvasTexture(c);
            t.encoding = T.sRGBEncoding;
            t.anisotropy = 4;
            return t;
        };

        const meatTex = (base, vein) => canvasTex(256, 256, (g, W, H) => {
            g.fillStyle = base; g.fillRect(0, 0, W, H);
            for (let i = 0; i < 240; i++) {
                g.globalAlpha = .05 + Math.random() * .12;
                g.fillStyle = Math.random() < .5 ? '#000' : vein;
                g.beginPath(); g.arc(Math.random() * W, Math.random() * H, 6 + Math.random() * 26, 0, TAU); g.fill();
            }
            g.globalAlpha = .6; g.strokeStyle = vein; g.lineCap = 'round';
            for (let i = 0; i < 16; i++) {
                g.lineWidth = 1 + Math.random() * 3.4;
                let x = Math.random() * W, y = Math.random() * H;
                g.beginPath(); g.moveTo(x, y);
                for (let k = 0; k < 4; k++) { x += (Math.random() - .5) * 90; y += (Math.random() - .5) * 90; g.lineTo(x, y); }
                g.stroke();
            }
        });

        const pawPath = (g, cx, cy, s) => {
            g.beginPath(); g.ellipse(cx, cy + s * .18, s * .52, s * .42, 0, 0, TAU);
            [[-.62, -.22], [-.22, -.56], [.22, -.56], [.62, -.22]].forEach(([dx, dy]) => {
                g.moveTo(cx + dx * s + s * .2, cy + dy * s);
                g.ellipse(cx + dx * s, cy + dy * s, s * .2, s * .26, dx * .5, 0, TAU);
            });
            g.fill();
        };
        const bonePath = (g, cx, cy, len, r) => {
            g.beginPath();
            g.roundRect ? g.roundRect(cx - len / 2, cy - r * .5, len, r, r * .4) : g.rect(cx - len / 2, cy - r * .5, len, r);
            [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sy]) => {
                g.moveTo(cx + sx * len / 2 + r * .6, cy + sy * r * .45);
                g.arc(cx + sx * len / 2, cy + sy * r * .45, r * .6, 0, TAU);
            });
            g.fill();
        };

        const bowlTex = canvasTex(2048, 1024, (g, W, H) => {
            const gr = g.createLinearGradient(0, 0, 0, H);
            gr.addColorStop(0, '#c4e857'); gr.addColorStop(.45, '#9ccb30'); gr.addColorStop(1, '#7fb024');
            g.fillStyle = gr; g.fillRect(0, 0, W, H);
            const wallY = H * (1 - .3);
            g.fillStyle = 'rgba(255,255,255,.88)';
            for (let k = 0; k < 6; k++) {
                const x = (k + .5) / 6 * W;
                if (k % 2 === 0) pawPath(g, x, wallY - 40, 62); else bonePath(g, x, wallY - 40, 120, 48);
            }
            g.fillStyle = 'rgba(255,255,255,.55)';
            for (let k = 0; k < 12; k++) { const x = (k + .25) / 12 * W; pawPath(g, x, wallY + 120, 26); }
            g.fillStyle = '#6d2bd1'; pawPath(g, W * .08, wallY - 10, 120);
            g.fillStyle = '#6d2bd1'; pawPath(g, W * .58, wallY - 10, 120);
        });

        const moundTex = canvasTex(512, 512, (g, W, H) => {
            g.fillStyle = '#6a3826'; g.fillRect(0, 0, W, H);
            const pal = ['#7d4430', '#573023', '#8f5a3f', '#b9703a', '#e0933f', '#6bbf3a', '#efe1b0', '#c9a36a', '#46251a', '#a24a30'];
            for (let i = 0; i < 2600; i++) {
                g.fillStyle = pal[(Math.random() * pal.length) | 0];
                g.globalAlpha = .55 + Math.random() * .45;
                g.beginPath(); g.arc(Math.random() * W, Math.random() * H, 1.5 + Math.random() * 4.5, 0, TAU); g.fill();
            }
            g.globalAlpha = 1;
        });
        moundTex.wrapS = moundTex.wrapT = T.RepeatWrapping;
        moundTex.repeat.set(3, 2);

        const glowTex = canvasTex(256, 256, (g, W, H) => {
            const r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
            r.addColorStop(0, 'rgba(255,60,160,.5)'); r.addColorStop(.4, 'rgba(150,70,255,.2)'); r.addColorStop(1, 'rgba(120,60,255,0)');
            g.fillStyle = r; g.fillRect(0, 0, W, H);
        });
        /* ---- grupo principal ---- */
        const group = new T.Group();
        scn.add(group);
        const bowlRoot = new T.Group();
        group.add(bowlRoot);

        /* plato (torno) */
        const profile = [[0, 0], [.62, 0], [.7, .04], [.78, .16], [.95, .36], [1.12, .56], [1.25, .74], [1.31, .82], [1.28, .87], [1.22, .86], [1.18, .8], [1.04, .62], [.88, .42], [.7, .26], [.5, .19], [0, .17]]
            .map(p => new T.Vector2(p[0], p[1]));
        const profilePts = new T.SplineCurve(profile).getPoints(96).map(p => new T.Vector2(Math.max(0, p.x), p.y));
        const bowl = new T.Mesh(
            new T.LatheGeometry(profilePts, mobile ? 64 : 112),
            new T.MeshPhysicalMaterial({ map: bowlTex, emissive: 0xffffff, emissiveMap: bowlTex, emissiveIntensity: .42, roughness: .26, metalness: 0, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: .75, side: T.DoubleSide })
        );
        bowlRoot.add(bowl);

        /* montículo de comida */
        const moundGeo = new T.IcosahedronGeometry(.86, mobile ? 4 : 6);
        {
            const p = moundGeo.attributes.position;
            const v = new T.Vector3();
            for (let i = 0; i < p.count; i++) {
                v.fromBufferAttribute(p, i);
                const n = Math.sin(v.x * 5.1 + 1.3) * Math.cos(v.z * 4.3) * .5 + Math.sin(v.y * 7 + v.x * 3) * .3 + Math.sin(v.z * 9 + v.x * 2) * .15;
                v.multiplyScalar(1 + n * .05);
                p.setXYZ(i, v.x, v.y, v.z);
            }
            moundGeo.computeVertexNormals();
        }
        const mound = new T.Mesh(moundGeo, new T.MeshStandardMaterial({ map: moundTex, bumpMap: moundTex, bumpScale: .5, roughness: .7, metalness: 0 }));
        mound.position.y = .5;
        mound.scale.set(1, .54, 1);
        bowlRoot.add(mound);
        const moundTop = rr => .5 + .46 * Math.sqrt(Math.max(0, 1 - (rr / .84) ** 2));

        /* aro de luz bajo el plato */
        const additive = T.AdditiveBlending;
        const ringMat = new T.MeshBasicMaterial({ color: 0xff4daa, transparent: true, opacity: .9, side: T.DoubleSide, blending: additive, depthWrite: false, toneMapped: false });
        const ring = new T.Mesh(new T.RingGeometry(1.64, 1.72, 128), ringMat);
        ring.rotation.x = -Math.PI / 2; ring.position.y = -.02;
        const ring2Mat = new T.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: .6, side: T.DoubleSide, blending: additive, depthWrite: false, toneMapped: false });
        const ring2 = new T.Mesh(new T.RingGeometry(2.05, 2.08, 128), ring2Mat);
        ring2.rotation.x = -Math.PI / 2; ring2.position.y = -.025;
        const glowMat = new T.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: .8, depthWrite: false, blending: additive, toneMapped: false });
        const glow = new T.Mesh(new T.PlaneGeometry(8.4, 8.4), glowMat);
        glow.rotation.x = -Math.PI / 2; glow.position.y = -.04;
        group.add(glow, ring, ring2);

        /* ---- ingredientes ---- */
        const roundedBox = (w, h, d, r, seg = 5) => {
            const g = new T.BoxGeometry(w, h, d, seg, seg, seg);
            const pos = g.attributes.position;
            const nor = g.attributes.normal;
            const half = new T.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
            const v = new T.Vector3(), inner = new T.Vector3(), dir = new T.Vector3();
            for (let i = 0; i < pos.count; i++) {
                v.fromBufferAttribute(pos, i);
                inner.set(clamp(v.x, -half.x, half.x), clamp(v.y, -half.y, half.y), clamp(v.z, -half.z, half.z));
                dir.copy(v).sub(inner);
                if (dir.lengthSq() > 1e-8) {
                    dir.normalize();
                    nor.setXYZ(i, dir.x, dir.y, dir.z);
                    v.copy(inner).addScaledVector(dir, r);
                    pos.setXYZ(i, v.x, v.y, v.z);
                }
            }
            return g;
        };

        const geo = {
            cube: roundedBox(.3, .3, .3, .06),
            coin: new T.LatheGeometry([[0, -.035], [.13, -.035], [.15, -.02], [.15, .02], [.13, .035], [0, .035]].map(p => new T.Vector2(p[0], p[1])), 20),
            pea: new T.SphereGeometry(.075, 14, 12),
            leaf: new T.SphereGeometry(.14, 16, 10),
            grain: new T.SphereGeometry(.055, 10, 8),
            boneShaft: new T.CylinderGeometry(.04, .04, .3, 10),
            boneEnd: new T.SphereGeometry(.07, 12, 10),
        };

        const std = (hex, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: col(hex), roughness: .38, metalness: 0, envMapIntensity: .8 }, o));
        const mat = {
            beef: std('#ffffff', { map: meatTex('#8f0f26', '#e8a8b0'), roughness: .3 }),
            salmon: std('#ffffff', { map: meatTex('#ff6a2e', '#ffc29a'), roughness: .32 }),
            chicken: std('#ffffff', { map: meatTex('#f1a58f', '#ffd9cc'), roughness: .4 }),
            carrot: std('#ff8a1f', { roughness: .4, emissive: col('#ff8a1f'), emissiveIntensity: .06 }),
            pea: std('#6bcb3a', { roughness: .26 }),
            leaf: std('#2e9145', { roughness: .5, emissive: col('#2e9145'), emissiveIntensity: .05 }),
            grainA: std('#f1dda6', { roughness: .6 }),
            grainB: std('#e0b861', { roughness: .6 }),
            bone: std('#f49a2a', { roughness: .5 }),
        };

        const ings = [];
        const addIng = (mesh, o) => {
            const tilt = [-.42, .12, .46][(Math.random() * 3) | 0] + rnd(-.08, .08);
            const rr = Math.sqrt(Math.random()) * o.spread;
            const ang = Math.random() * TAU;
            ings.push(Object.assign({
                mesh, g: -1, d: Math.random(), s: 1,
                r: rnd(1.9, 2.8), a0: Math.random() * TAU, w: rnd(.22, .46), ph: Math.random() * TAU, y0: rnd(-.2, .35), tilt,
                sx: rnd(-1.6, 1.6), sy: rnd(-1.6, 1.6), sz: rnd(-1.6, 1.6),
                tx: Math.cos(ang) * rr, tz: Math.sin(ang) * rr, ty: moundTop(rr) + (o.lift || .08) + rnd(0, .1),
            }, o, { tx: Math.cos(ang) * rr, tz: Math.sin(ang) * rr, ty: moundTop(rr) + (o.lift || .08) + rnd(0, .1) }));
            mesh.rotation.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU);
            bowlRoot.parent.add(mesh); // vive en el grupo (no gira con el plato)
        };

        const k = mobile ? .62 : 1; // menos piezas en móvil
        const n = c => Math.max(2, Math.round(c * k));
        // grupo 0: proteína
        [['beef', 5], ['salmon', 4], ['chicken', 4]].forEach(([m, c]) => {
            for (let i = 0; i < n(c); i++) addIng(new T.Mesh(geo.cube, mat[m]), { g: 0, spread: .6, lift: .12, s: rnd(.9, 1.3), r: rnd(2, 2.7) });
        });
        // grupo 1: vegetales
        for (let i = 0; i < n(10); i++) addIng(new T.Mesh(geo.coin, mat.carrot), { g: 1, spread: .85, lift: .05, s: rnd(.9, 1.25), r: rnd(1.9, 2.9) });
        for (let i = 0; i < n(24); i++) addIng(new T.Mesh(geo.pea, mat.pea), { g: 1, spread: .9, lift: .06, s: rnd(.8, 1.3), r: rnd(1.8, 3) });
        for (let i = 0; i < n(7); i++) { const m = new T.Mesh(geo.leaf, mat.leaf); m.scale.set(1, .12, 1.5); addIng(m, { g: 1, spread: .85, lift: .04, s: rnd(.9, 1.3), r: rnd(2, 2.9), keepScale: [1, .12, 1.5] }); }
        // grupo 2: cereales
        for (let i = 0; i < n(30); i++) { const m = new T.Mesh(geo.grain, i % 2 ? mat.grainA : mat.grainB); addIng(m, { g: 2, spread: .92, lift: .04, s: rnd(.8, 1.2), r: rnd(1.8, 3), keepScale: [1, .7, 2.2] }); }
        // premios en forma de hueso (solo órbita exterior)
        for (let i = 0; i < n(6); i++) {
            const b = new T.Group();
            const shaft = new T.Mesh(geo.boneShaft, mat.bone); shaft.rotation.z = Math.PI / 2; b.add(shaft);
            [[-.15, .045], [-.15, -.045], [.15, .045], [.15, -.045]].forEach(([x, z]) => { const e = new T.Mesh(geo.boneEnd, mat.bone); e.position.set(x, 0, z); b.add(e); });
            addIng(b, { g: -1, spread: 0, r: rnd(3.0, 3.5), s: rnd(1, 1.3), w: rnd(.14, .24) });
        }
        /* ---- partículas: estelas de luz (cintas helicoidales) ---- */
        const swirlCount = mobile ? 1100 : 3200;
        const swirlGeo = new T.BufferGeometry();
        swirlGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(swirlCount * 3), 3));
        const seeds = new Float32Array(swirlCount * 4);
        for (let i = 0; i < swirlCount; i++) {
            seeds[i * 4] = Math.random();
            seeds[i * 4 + 1] = i % 3;
            seeds[i * 4 + 2] = Math.random() * 2 - 1;
            seeds[i * 4 + 3] = rnd(.5, 1.6);
        }
        swirlGeo.setAttribute('aSeed', new T.BufferAttribute(seeds, 4));
        const swirlMat = new T.ShaderMaterial({
            transparent: true, depthWrite: false, blending: additive,
            uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uPx: { value: 1 }, uOpacity: { value: 1 }, uLight: { value: 0 } },
            vertexShader: `
                uniform float uTime, uScale, uPx;
                attribute vec4 aSeed;
                varying float vA; varying vec3 vC; varying float vL;
                void main(){
                    float u = fract(aSeed.x + uTime * .035);
                    float a = u * 6.2831853 * 1.35 + aSeed.y * 2.0943951 + uTime * .25;
                    float R = (1.25 + u * 2.0) * uScale;
                    float y = sin(u * 12.566 + aSeed.y * 2.0 + uTime * .6) * .45 + (u - .5) * .9 - .05;
                    vec3 p = vec3(cos(a) * R, y, sin(a) * R * .92);
                    p += vec3(cos(a + 1.5708), 0., sin(a + 1.5708)) * aSeed.z * .13 * (1. + u);
                    p.y += aSeed.z * .1;
                    vec4 mv = modelViewMatrix * vec4(p, 1.);
                    gl_Position = projectionMatrix * mv;
                    gl_PointSize = aSeed.w * uPx * (72. / -mv.z);
                    vA = smoothstep(0., .12, u) * smoothstep(1., .72, u);
                    vC = mix(vec3(1., .30, .67), vec3(.55, .36, 1.), clamp(u + aSeed.z * .15, 0., 1.));
                }`,
            fragmentShader: `
                uniform float uOpacity, uLight;
                varying float vA; varying vec3 vC;
                void main(){
                    vec2 c = gl_PointCoord - .5;
                    float d = length(c);
                    float a = smoothstep(.5, 0., d); a *= a;
                    vec3 col = mix(vC, vC * .72, uLight);
                    gl_FragColor = vec4(col, a * vA * uOpacity * mix(1., .75, uLight));
                }`,
        });
        const swirl = new T.Points(swirlGeo, swirlMat);
        swirl.frustumCulled = false;
        swirl.rotation.x = -.32;
        group.add(swirl);

        /* ---- chispas flotantes ---- */
        const sparkCount = mobile ? 60 : 160;
        const sparkGeo = new T.BufferGeometry();
        sparkGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(sparkCount * 3), 3));
        const sSeeds = new Float32Array(sparkCount * 4);
        for (let i = 0; i < sparkCount; i++) { sSeeds[i * 4] = Math.random() * TAU; sSeeds[i * 4 + 1] = rnd(1.6, 5); sSeeds[i * 4 + 2] = rnd(-1.5, 2.8); sSeeds[i * 4 + 3] = rnd(.4, 1.2); }
        sparkGeo.setAttribute('aSeed', new T.BufferAttribute(sSeeds, 4));
        const sparkMat = new T.ShaderMaterial({
            transparent: true, depthWrite: false, blending: additive,
            uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uScale: { value: 1 }, uLight: { value: 0 } },
            vertexShader: `
                uniform float uTime, uPx, uScale;
                attribute vec4 aSeed;
                varying float vT;
                void main(){
                    float a = aSeed.x + uTime * .08 * (1. + aSeed.w);
                    vec3 p = vec3(cos(a) * aSeed.y * uScale, aSeed.z + sin(uTime * .6 + aSeed.x * 5.) * .25, sin(a) * aSeed.y * uScale * .9);
                    vec4 mv = modelViewMatrix * vec4(p, 1.);
                    gl_Position = projectionMatrix * mv;
                    gl_PointSize = aSeed.w * uPx * (64. / -mv.z);
                    vT = .35 + .65 * (.5 + .5 * sin(uTime * 1.8 + aSeed.x * 9.));
                }`,
            fragmentShader: `
                uniform float uLight; varying float vT;
                void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); float a = smoothstep(.5, 0., d); a = a * a * a; vec3 col = mix(vec3(1., .85, .95), vec3(.8, .25, .6), uLight); gl_FragColor = vec4(col, a * vT * .9); }`,
        });
        const sparks = new T.Points(sparkGeo, sparkMat);
        sparks.frustumCulled = false;
        group.add(sparks);

        /* ---- estado ---- */
        const S = { x: .47, y: -.02, scale: 1, orbit: 1, opacity: 0, asm: 0 };      // estado actual (suavizado)
        const TG = { x: .47, y: -.02, scale: 1, orbit: 1, opacity: 1, asm: 0 };     // objetivo (lo dirige el scroll)
        let halfW = 4, halfH = 2.6, viewScale = 1;
        let introT0 = null, intro = 0;
        let running = false, active = true, orbitT = 0, time = 0, last = 0, lightTheme = false;
        const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
        const BASE = .82;

        function resize() {
            const w = innerWidth, h = innerHeight;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            const dist = camera.position.length();
            halfH = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * dist;
            halfW = halfH * camera.aspect;
            viewScale = w < 1024 ? Math.min(1, halfW / (w < 600 ? 1.95 : 2.7)) : clamp(camera.aspect / 1.6, .6, 1.25);
            const px = renderer.getPixelRatio() * (h / 900);
            swirlMat.uniforms.uPx.value = px;
            sparkMat.uniforms.uPx.value = px;
        }

        function applyTheme() {
            const l = lightTheme ? 1 : 0;
            const blend = lightTheme ? T.NormalBlending : additive;
            [swirlMat, sparkMat, ringMat, ring2Mat, glowMat].forEach(m => { m.blending = blend; m.needsUpdate = true; });
            swirlMat.uniforms.uLight.value = l;
            sparkMat.uniforms.uLight.value = l;
            ringMat.color.set(lightTheme ? 0xd91f83 : 0xff4daa);
            ring2Mat.color.set(lightTheme ? 0x5b21b6 : 0x8b5cf6);
            glowMat.opacity = lightTheme ? .5 : .8;
            renderer.toneMappingExposure = lightTheme ? .95 : .88;
        }

        const tmpA = new T.Vector3();
        function updateIngredients(dt) {
            orbitT += dt;
            const R0 = S.orbit * (.55 + .45 * intro);
            for (let i = 0; i < ings.length; i++) {
                const it = ings[i];
                const a = it.a0 + orbitT * it.w;
                const R = it.r * R0;
                const x = Math.cos(a) * R;
                const z = Math.sin(a) * R * .92;
                const y = Math.sin(a * 1.7 + it.ph) * .3 + it.y0;
                const ct = Math.cos(it.tilt), st = Math.sin(it.tilt);
                const y2 = y * ct - z * st, z2 = y * st + z * ct;
                let e = 0;
                if (it.g >= 0) {
                    e = clamp((S.asm - it.g - it.d * .45) / .55, 0, 1);
                    e = smooth(e);
                }
                const hop = Math.sin(e * Math.PI) * 1.05;
                it.mesh.position.set(lerp(x, it.tx, e), lerp(y2, it.ty, e) + hop, lerp(z2, it.tz, e));
                const spin = dt * (1 - e);
                it.mesh.rotation.x += it.sx * spin;
                it.mesh.rotation.y += it.sy * spin;
                it.mesh.rotation.z += it.sz * spin;
                const pop = it.s * (1 + .22 * Math.sin(e * Math.PI));
                if (it.keepScale) it.mesh.scale.set(it.keepScale[0] * pop, it.keepScale[1] * pop, it.keepScale[2] * pop);
                else it.mesh.scale.setScalar(pop);
            }
        }

        function frame(dt) {
            time += dt;
            if (introT0 !== null) intro = clamp((performance.now() - introT0) / 2400, 0, 1);
            const ie = 1 - Math.pow(1 - intro, 3);
            const f = 1 - Math.exp(-dt * 6);
            S.x += (TG.x - S.x) * f; S.y += (TG.y - S.y) * f; S.scale += (TG.scale - S.scale) * f;
            S.orbit += (TG.orbit - S.orbit) * f; S.opacity += (TG.opacity - S.opacity) * f; S.asm += (TG.asm - S.asm) * (1 - Math.exp(-dt * 9));

            ptr.x += (ptr.tx - ptr.x) * .06;
            ptr.y += (ptr.ty - ptr.y) * .06;

            const sc = BASE * viewScale * S.scale * (.3 + .7 * ie);
            group.position.set(S.x * halfW, S.y * halfH + Math.sin(time * .9) * .05, 0);
            group.scale.setScalar(sc);
            group.rotation.set(ptr.y * .08, ptr.x * .22, 0);
            bowlRoot.rotation.y = time * .28 + (1 - ie) * Math.PI * 2;

            const pulse = clamp(S.asm - 3, 0, 1);
            const pulseWave = pulse * (.5 + .5 * Math.sin(time * 4));
            ring.scale.setScalar(1 + pulseWave * .09);
            ringMat.opacity = (.8 + pulse * .2) * ie;
            ring2Mat.opacity = .6 * ie;
            ring2.rotation.z = time * .1;
            glowMat.opacity = (lightTheme ? .5 : .8) * (.7 + .3 * ie) * (1 + pulse * .25);

            swirlMat.uniforms.uTime.value = time;
            swirlMat.uniforms.uScale.value = S.orbit * (.5 + .5 * ie);
            swirlMat.uniforms.uOpacity.value = ie * (1 - clamp(S.asm - 1, 0, 2.5) * .24);
            sparkMat.uniforms.uTime.value = time;
            sparkMat.uniforms.uScale.value = S.orbit;

            camera.position.x = ptr.x * .35;
            camera.position.y = 2.4 - ptr.y * .25;
            camera.lookAt(LOOK);

            updateIngredients(dt);
            canvas.style.opacity = String(clamp(S.opacity, 0, 1));
            renderer.render(scn, camera);
        }

        function loop(now) {
            if (!running) return;
            requestAnimationFrame(loop);
            const dt = Math.min(.05, (now - last) / 1000 || .016);
            last = now;
            if (document.hidden || !active || (TG.opacity < .01 && S.opacity < .01)) { canvas.style.opacity = '0'; return; }
            frame(dt);
        }

        function renderStill() {
            intro = 1; introT0 = null;
            Object.assign(S, TG);
            frame(.016);
            canvas.style.opacity = String(S.opacity);
        }

        window.addEventListener('pointermove', e => {
            ptr.tx = (e.clientX / innerWidth - .5) * 2;
            ptr.ty = (e.clientY / innerHeight - .5) * 2;
        }, { passive: true });

        let rzT;
        let lastW = innerWidth, lastH = innerHeight;
        window.addEventListener('resize', () => {
            clearTimeout(rzT);
            rzT = setTimeout(() => {
                // en móvil ignoramos los cambios de alto por la barra del navegador
                if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 140) return;
                lastW = innerWidth; lastH = innerHeight;
                resize();
                if (!animated) renderStill();
            }, 120);
        });
        resize();
        applyTheme();

        // Compila los shaders por etapas (cediendo el hilo entre cada una) para no congelar el loader
        async function warmup() {
            const part = (arr) => arr.filter(Boolean);
            const parts = [
                [bowl], [mound],
                ings.filter(i => i.g === 0).map(i => i.mesh),
                ings.filter(i => i.g !== 0).map(i => i.mesh),
                [ring, ring2, glow], [swirl, sparks],
            ].map(part);
            const all = parts.flat();
            all.forEach(o => { o.visible = false; });
            for (const p of parts) {
                p.forEach(o => { o.visible = true; });
                renderer.render(scn, camera);
                p.forEach(o => { o.visible = false; });
                await new Promise(r => setTimeout(r, 24));
            }
            all.forEach(o => { o.visible = true; });
        }

        return {
            warmup,
            setTarget(p) { Object.assign(TG, p); },
            snap(p) { Object.assign(TG, p); Object.assign(S, p); },
            setTheme(light) { lightTheme = light; applyTheme(); if (!animated) renderStill(); },
            startIntro() { introT0 = performance.now(); },
            setActive(v) { active = v; },
            start() {
                if (!animated) { renderStill(); return; }
                if (running) return;
                running = true; last = performance.now(); requestAnimationFrame(loop);
            },
            renderStill,
            get mobile() { return mobile; },
        };
    }

    /* ------------------------------------------------------------------
       POSES DE LA ESCENA 3D (x,y como fracción del medio-ancho / medio-alto)
       ------------------------------------------------------------------ */
    const poses = () => {
        const compact = innerWidth < 1024;
        return compact ? {
            hero: { x: 0, y: .37, scale: .98, orbit: 1, opacity: 1 },
            manifesto: { x: 0, y: .1, scale: .8, orbit: 1.35, opacity: .34 },
            assembly: { x: 0, y: .4, scale: .98, orbit: 1.05, opacity: 1 },
            contact: { x: 0, y: -.56, scale: 1, orbit: 1.05, opacity: 1 },
        } : {
            hero: { x: .47, y: -.02, scale: 1, orbit: 1, opacity: 1 },
            manifesto: { x: 0, y: 0, scale: .8, orbit: 1.6, opacity: .36 },
            assembly: { x: .5, y: -.02, scale: 1.08, orbit: 1.15, opacity: 1 },
            contact: { x: 0, y: -.74, scale: 1.2, orbit: 1.05, opacity: 1 },
        };
    };

    /* ==================================================================
       COREOGRAFÍA DE SCROLL
       ================================================================== */
    function setupScroll() {
        const g = window.gsap;
        const ST = window.ScrollTrigger;
        g.registerPlugin(ST);
        ST.config({ ignoreMobileResize: true });

        g.set('.hero-line-in', { yPercent: 115 });
        g.set('[data-reveal]', { y: 44 });

        const navBar = $('.nav-bar');
        const progress = $('[data-progress]');
        let navHidden = false;

        /* barra de progreso + ocultar/mostrar nav según dirección */
        ST.create({
            start: 0, end: 'max',
            onUpdate: self => {
                progress.style.transform = `scaleX(${self.progress})`;
                const y = self.scroll();
                if (menuOpen) return;
                const hide = self.direction === 1 && y > 240;
                if (hide !== navHidden && (hide || self.direction === -1)) {
                    navHidden = hide;
                    g.to(navBar, { yPercent: hide ? -170 : 0, duration: .7, ease: 'power3.out', overwrite: true });
                }
            },
        });

        navBar.addEventListener('focusin', () => {
            if (navHidden) { navHidden = false; g.to(navBar, { yPercent: 0, duration: .5, ease: 'power3.out', overwrite: true }); }
        });

        /* ---- marquee: la velocidad del scroll lo acelera ---- */
        const track = $('.marquee-track');
        const mq = g.to(track, { xPercent: -50, ease: 'none', duration: 46, repeat: -1 });
        let mqDir = 1;
        ST.create({
            trigger: '.marquee', start: 'top bottom', end: 'bottom top',
            onUpdate: self => {
                mqDir = self.direction || 1;
                const v = Math.min(Math.abs(self.getVelocity()) / 260, 8);
                mq.timeScale(mqDir * (1 + v));
            },
        });
        g.ticker.add(() => { mq.timeScale(lerp(mq.timeScale(), mqDir, .05)); });

        /* ---- hero: salida suave del texto ---- */
        g.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } })
            .fromTo('.hero-copy', { y: 0, autoAlpha: 1 }, { y: -70, autoAlpha: 0, ease: 'none', immediateRender: false }, 0)
            .fromTo('.hero-seal', { y: 0 }, { y: -50, ease: 'none', immediateRender: false }, 0);

        /* ---- manifiesto: las palabras se iluminan al leer ---- */
        const mText = $('[data-manifesto]');
        const mWords = splitWords(mText);
        g.fromTo(mWords, { opacity: .16 }, {
            opacity: 1, ease: 'none', stagger: .12,
            scrollTrigger: { trigger: mText, start: 'top 80%', end: 'bottom 55%', scrub: .5 },
        });

        /* ---- títulos: entrada por palabras ---- */
        $$('[data-split]').forEach(h => {
            const words = splitWords(h).map(w => w.firstChild);
            g.fromTo(words, { yPercent: 112 }, {
                yPercent: 0, duration: 1.2, ease: 'power4.out', stagger: .07,
                scrollTrigger: { trigger: h, start: 'top 86%', once: true },
            });
        });

        /* ---- reveals genéricos ---- */
        ST.batch('[data-reveal]', {
            start: 'top 90%', once: true,
            onEnter: els => g.to(els, { opacity: 1, y: 0, duration: 1.15, ease: 'power3.out', stagger: .14 }),
        });

        /* ---- contadores ---- */
        $$('[data-count]').forEach(el => {
            const target = parseInt(el.dataset.count, 10);
            const o = { v: 0 };
            el.textContent = '0';
            g.to(o, {
                v: target, duration: 2.2, ease: 'power3.out',
                onUpdate: () => { el.textContent = Math.round(o.v); },
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            });
        });

        /* ---- armado del plato (escena fijada) ---- */
        const steps = $$('.a-step');
        const rail = $$('.assembly-rail li');
        const setRail = idx => rail.forEach((li, i) => li.classList.toggle('is-on', i <= idx));
        setRail(0);
        const asmTl = g.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
                id: 'proceso', trigger: '.assembly', start: 'top top', end: '+=420%',
                pin: true, scrub: .5, anticipatePin: 1,
                onUpdate: self => setRail(Math.min(3, Math.floor(self.progress * 4))),
            },
        });
        asmTl.to({}, { duration: 4 }, 0);
        steps.forEach((s, i) => {
            if (i > 0) asmTl.fromTo(s, { autoAlpha: 0, y: 46 }, { autoAlpha: 1, y: 0, duration: .28, ease: 'power2.out' }, i + .02);
            if (i < steps.length - 1) asmTl.to(s, { autoAlpha: 0, y: -46, duration: .26, ease: 'power2.in' }, i + .72);
        });

        /* ---- beneficios: la imagen se abre a pantalla completa ---- */
        const small = innerWidth < 768;
        const plusTl = g.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { id: 'beneficios', trigger: '.plus', start: 'top top', end: '+=380%', pin: true, scrub: .5, anticipatePin: 1 },
        });
        plusTl
            .fromTo('[data-plus-frame]',
                { clipPath: small ? 'inset(18% 6% 30% 6% round 24px)' : 'inset(24% 22% 24% 22% round 28px)' },
                { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 1.5 }, 0)
            .fromTo('[data-plus-img]', { scale: 1.18 }, { scale: 1, ease: 'power2.inOut', duration: 1.5 }, 0)
            .to('[data-plus-intro]', { autoAlpha: 0, scale: 1.12, ease: 'power2.in', duration: .8 }, .55)
            .fromTo('.plus .benefit', { autoAlpha: 0, y: 56 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: .7, stagger: .32 }, 1.55)
            .fromTo('[data-plus-cta]', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: .7 }, 3.1)
            .to({}, { duration: .7 });

        /* ---- bento: reveal ya cubierto por data-reveal ---- */

        /* ---- menú: carrusel horizontal (escritorio) ---- */
        const mm = g.matchMedia();
        mm.add('(min-width: 900px)', () => {
            const trackEl = $('[data-track]');
            const bar = $('[data-track-progress]');
            const dist = () => Math.max(0, trackEl.scrollWidth - document.documentElement.clientWidth);
            const pan = g.to(trackEl, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: {
                    id: 'menu', trigger: '.flavors', start: 'top top', end: () => '+=' + dist(),
                    pin: '.flavors-pin', scrub: .6, invalidateOnRefresh: true, anticipatePin: 1,
                    onUpdate: self => { bar.style.transform = `scaleX(${self.progress})`; },
                },
            });
            $$('.flavor-media img').forEach(img => {
                g.set(img, { scale: 1.22 });
                g.fromTo(img, { xPercent: -7 }, {
                    xPercent: 7, ease: 'none',
                    scrollTrigger: { trigger: img.closest('.flavor'), containerAnimation: pan, start: 'left right', end: 'right left', scrub: true },
                });
            });
            return () => { /* gsap.matchMedia revierte los triggers al salir de la consulta */ };
        });

        /* ---- cómo pedir: tarjetas apiladas ---- */
        const cards = $$('[data-stack]');
        const navH = parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 64;
        cards.forEach((card, i) => {
            if (i === cards.length - 1) return;
            const stickyTop = navH + 28 + (i + 1) * 16;
            g.fromTo(card, { scale: 1, filter: 'brightness(1)' }, {
                scale: .94, filter: 'brightness(.62)', ease: 'none',
                scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: () => `top ${stickyTop}px`, scrub: true },
            });
        });

        /* ---- footer: wordmark ---- */
        g.fromTo('.footer-wordmark span', { yPercent: 55, opacity: 0 }, {
            yPercent: 0, opacity: 1, duration: 1.5, ease: 'power4.out', stagger: .15,
            scrollTrigger: { trigger: '.footer-wordmark', start: 'top 98%', once: true },
        });

        /* ---- director de la escena 3D: pose en función del scroll ---- */
        if (scene) {
            let keys = [];
            const props = ['x', 'y', 'scale', 'orbit', 'opacity', 'asm'];
            const yOf = el => el.getBoundingClientRect().top + window.scrollY;
            const build = () => {
                const vh = innerHeight;
                const P = poses();
                const man = $('.manifesto');
                const mTop = yOf(man), mH = man.offsetHeight;
                const aST = ST.getById('proceso');
                const cTop = yOf($('.contact-hero'));
                const aS = aST ? aST.start : mTop + mH;
                const aE = aST ? aST.end : aS + vh * 4;
                const w = (pose, extra) => Object.assign({ asm: 0 }, pose, extra);
                keys = [
                    { y: 0, p: w(P.hero) },
                    { y: vh * .15, p: w(P.hero) },
                    { y: Math.max(vh * .95, mTop - vh * .05), p: w(P.manifesto) },
                    { y: mTop + mH * .55, p: w(P.manifesto) },
                    { y: aS, p: w(P.assembly, { asm: 0 }) },
                    { y: aE, p: w(P.assembly, { asm: 4 }) },
                    { y: aE + vh * .55, p: w(P.assembly, { asm: 4, opacity: 0 }) },
                    { y: cTop - vh * 1.15, p: w(P.contact, { asm: 4, opacity: 0 }) },
                    { y: cTop - vh * .65, p: w(P.contact, { asm: 0, opacity: 0 }) },
                    { y: cTop - vh * .05, p: w(P.contact, { asm: 0, opacity: 1 }) },
                    { y: cTop + vh * .7, p: w(P.contact, { asm: 0, opacity: 1 }) },
                    { y: cTop + vh * 1.0, p: w(P.contact, { asm: 0, opacity: 0 }) },
                ].filter(k => isFinite(k.y)).sort((a, b) => a.y - b.y);
                direct(window.scrollY);
            };
            const direct = y => {
                if (!keys.length) return;
                let a = keys[0], b = keys[keys.length - 1];
                if (y <= a.y) b = a;
                else if (y >= b.y) a = b;
                else {
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (y >= keys[i].y && y <= keys[i + 1].y) { a = keys[i]; b = keys[i + 1]; break; }
                    }
                }
                const span = b.y - a.y;
                const t = span > 0 ? smooth(clamp((y - a.y) / span, 0, 1)) : 0;
                const out = {};
                props.forEach(k => { out[k] = lerp(a.p[k], b.p[k], t); });
                // asm lineal dentro de la escena fijada (que coincida con el scroll)
                if (a.p.asm !== b.p.asm && a.p.opacity === 1 && b.p.opacity === 1 && a.p.y === b.p.y) out.asm = lerp(a.p.asm, b.p.asm, clamp((y - a.y) / span, 0, 1));
                scene.setTarget(out);
            };
            ST.addEventListener('refresh', build);
            ST.create({ start: 0, end: 'max', onUpdate: self => direct(self.scroll()) });
            // la escena solo se dibuja mientras alguna zona transparente está a la vista
            build();
        }

        ST.refresh();
    }

    /* ------------------------------------------------------------------
       INTERACCIONES (independientes de GSAP)
       ------------------------------------------------------------------ */
    function setupInteractions() {
        /* acordeón */
        const items = $$('[data-faq]');
        let refreshT;
        items.forEach(item => {
            const btn = $('.faq-q', item);
            btn.addEventListener('click', () => {
                const open = !item.classList.contains('is-open');
                items.forEach(o => { o.classList.remove('is-open'); $('.faq-q', o).setAttribute('aria-expanded', 'false'); });
                item.classList.toggle('is-open', open);
                btn.setAttribute('aria-expanded', String(open));
                if (hasGSAP) { clearTimeout(refreshT); refreshT = setTimeout(() => window.ScrollTrigger.refresh(), 650); }
            });
        });

        /* botones magnéticos y tarjetas con tilt (solo puntero fino) */
        if (useMotion && finePointer) {
            const g = window.gsap;
            $$('.magnetic').forEach(btn => {
                const xTo = g.quickTo(btn, 'x', { duration: .6, ease: 'power3' });
                const yTo = g.quickTo(btn, 'y', { duration: .6, ease: 'power3' });
                btn.addEventListener('pointermove', e => {
                    const r = btn.getBoundingClientRect();
                    xTo((e.clientX - (r.left + r.width / 2)) * .28);
                    yTo((e.clientY - (r.top + r.height / 2)) * .4);
                });
                btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
            });
            $$('[data-flavor]').forEach(card => {
                const rx = g.quickTo(card, 'rotationX', { duration: .6, ease: 'power3' });
                const ry = g.quickTo(card, 'rotationY', { duration: .6, ease: 'power3' });
                g.set(card, { transformPerspective: 900 });
                card.addEventListener('pointermove', e => {
                    const r = card.getBoundingClientRect();
                    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
                    ry((px - .5) * 9); rx(-(py - .5) * 7);
                    card.style.setProperty('--mx', `${px * 100}%`);
                    card.style.setProperty('--my', `${py * 100}%`);
                });
                card.addEventListener('pointerleave', () => { rx(0); ry(0); });
            });
        } else {
            $$('[data-flavor]').forEach(card => {
                card.addEventListener('pointermove', e => {
                    const r = card.getBoundingClientRect();
                    card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
                    card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
                });
            });
        }

        /* formulario → WhatsApp */
        const form = $('[data-form]');
        if (form) {
            const status = $('[data-form-status]', form);
            const setError = (name, msg) => {
                const field = form.elements[name] && (form.elements[name].closest ? form.elements[name].closest('.field') : form.elements[name][0].closest('.field'));
                const err = $(`#e-${name === 'tipo' ? 'tipo' : name}`, form);
                if (field) field.classList.toggle('has-error', !!msg);
                if (err) err.textContent = msg || '';
            };
            form.addEventListener('input', e => { if (e.target.name === 'nombre') setError('nombre', ''); if (e.target.name === 'tipo') setError('tipo', ''); });
            form.addEventListener('submit', e => {
                e.preventDefault();
                const data = new FormData(form);
                const nombre = String(data.get('nombre') || '').trim();
                const tipo = String(data.get('tipo') || '');
                const mascota = String(data.get('mascota') || '').trim();
                const etapa = String(data.get('etapa') || '');
                const sabores = data.getAll('sabor');
                const mensaje = String(data.get('mensaje') || '').trim();

                let invalid = null;
                setError('nombre', ''); setError('tipo', '');
                if (nombre.length < 2) { setError('nombre', 'Dinos tu nombre para saber cómo llamarte.'); invalid = invalid || form.elements.nombre; }
                if (!tipo) { setError('tipo', 'Elige si tu mascota es perro o gato.'); invalid = invalid || form.elements.tipo[0]; }
                if (invalid) { invalid.focus(); status.textContent = 'Revisa los campos marcados.'; status.className = 'form-status'; return; }

                const lines = [
                    `Hola, soy ${nombre}. Quiero información del alimento BARF para mi ${tipo}${mascota ? ` (${mascota})` : ''}.`,
                    etapa ? `Etapa: ${etapa}.` : '',
                    sabores.length ? `Sabores que me interesan: ${sabores.join(', ')}.` : '',
                    mensaje ? `Mensaje: ${mensaje}` : '',
                ].filter(Boolean);
                const url = waUrl(lines.join('\n'));
                const win = window.open(url, '_blank', 'noopener');
                status.className = 'form-status is-ok';
                status.textContent = win ? '¡Listo! Abrimos WhatsApp con tu mensaje.' : '';
                if (!win) {
                    status.textContent = 'Toca aquí para abrir WhatsApp: ';
                    const a = document.createElement('a');
                    a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'abrir conversación';
                    a.style.textDecoration = 'underline';
                    status.appendChild(a);
                }
            });
        }
    }

    /* ------------------------------------------------------------------
       ENTRADA DEL HERO (después del loader)
       ------------------------------------------------------------------ */
    function heroIntro() {
        const fab = $('.fab');
        if (!useMotion) {
            if (scene) scene.startIntro();
            return;
        }
        const g = window.gsap;
        const tl = g.timeline({ defaults: { ease: 'power4.out' } });
        tl.fromTo('.nav-bar', { yPercent: -70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.2 }, .1)
            .fromTo('.hero-line-in', { yPercent: 115 }, { yPercent: 0, duration: 1.4, stagger: .16 }, .05)
            .fromTo('[data-hero-in]:not(.hero-seal)', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: .12 }, .45)
            .fromTo('.hero-seal', { autoAlpha: 0, scale: .5, rotate: -50 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.6, ease: 'elastic.out(1,.65)' }, .9)
            .fromTo(fab, { autoAlpha: 0, scale: .5 }, { autoAlpha: 1, scale: 1, duration: .9, ease: 'back.out(2.2)' }, 1.5);
        if (scene) scene.startIntro();
    }

    /* ------------------------------------------------------------------
       ARRANQUE
       ------------------------------------------------------------------ */
    function boot() {
        applyThemeUI(root.getAttribute('data-theme') || 'dark');
        setupInteractions();
        initLenis();

        const canvas = $('#stage');

        // La escena 3D se crea cuando el loader ya pintó, y sus shaders se compilan por etapas
        const prepared = new Promise(resolve => {
            requestAnimationFrame(() => setTimeout(async () => {
                try {
                    scene = canvas ? createStage(canvas) : null;
                    if (!scene) {
                        root.classList.add('no-webgl');
                        if (canvas) canvas.remove();
                    } else {
                        scene.setTheme(root.getAttribute('data-theme') === 'light');
                        scene.snap(Object.assign({ asm: 0 }, poses().hero, { opacity: 0 }));
                        scene.setTarget(Object.assign({ asm: 0 }, poses().hero));
                        try { await scene.warmup(); } catch (e) { /* el render real reintenta */ }
                    }
                    if (useMotion) setupScroll();
                    else if (scene) {
                        // Sin GSAP o con movimiento reducido: el plato solo vive en el hero
                        const hero = $('.hero');
                        scene.renderStill();
                        if ('IntersectionObserver' in window) {
                            new IntersectionObserver(([en]) => {
                                scene.setActive(en.isIntersecting);
                                if (!en.isIntersecting) $('#stage').style.opacity = '0'; else scene.renderStill();
                            }, { threshold: .05 }).observe(hero);
                        }
                    }
                } catch (err) {
                    console.error('Arranque:', err);
                } finally {
                    resolve();
                }
            }, 60));
        });

        runLoader(prepared).then(() => {
            root.classList.remove('is-loading');
            if (lenis) lenis.start();
            if (scene) scene.start();
            heroIntro();
            if (hasGSAP) {
                window.ScrollTrigger.refresh();
                window.addEventListener('load', () => window.ScrollTrigger.refresh());
            }
        });
    }

    // Los scripts con defer corren antes de DOMContentLoaded; esperamos al DOM listo
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();

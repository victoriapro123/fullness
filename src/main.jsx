import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CookingPot,
  HandPlatter,
  Heart,
  Leaf,
  Lock,
  Mail,
  Menu,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  ShoppingBag,
  Sparkles,
  Sprout,
  Timer,
  User,
  X
} from "lucide-react";
import "./styles.css";

gsap.registerPlugin(ScrollTrigger);

const mediaSrc = (key) => `/api/media?key=${encodeURIComponent(key)}`;

const products = [
  {
    id: "trucha-betarraga",
    name: "Trucha, betarraga y quinoa",
    tag: "Omega 3 + antioxidantes",
    price: 8990,
    description: "Pescado del sur, raíces dulces, hojas verdes y granos integrales sin gluten."
  },
  {
    id: "pollo-curcuma",
    name: "Pollo, cúrcuma y vegetales",
    tag: "Antiinflamatorio",
    price: 7990,
    description: "Proteína limpia con jengibre, pimienta y grasas saludables para una nutrición completa."
  },
  {
    id: "legumbres-granos",
    name: "Legumbres, arroz integral y oliva",
    tag: "Proteína vegetal completa",
    price: 6990,
    description: "Legumbres y granos integrales combinados para equilibrar energía, fibra y saciedad."
  }
];

const functionalNotes = [
  {
    title: "Cúrcuma + jengibre + pimienta",
    image: mediaSrc("assets/combo-curcuma-jengibre.png"),
    description: "Especias elegidas para sumar sabor profundo y acompañar una alimentación antiinflamatoria."
  },
  {
    title: "Grasas saludables + vegetales",
    image: mediaSrc("assets/combo-grasas-saludables.png"),
    description: "Palta, oliva, semillas y hojas verdes ayudan a dar saciedad y equilibrio al plato."
  },
  {
    title: "Limón + hojas verdes",
    image: mediaSrc("assets/combo-espinaca-limon.png"),
    imageClass: "functional-image-limon",
    description: "El ácido del limón favorece la absorción del hierro vegetal presente en hojas verdes."
  },
  {
    title: "Legumbres + granos integrales",
    image: mediaSrc("assets/combo-legumbres-granos.png"),
    description: "Se complementan para lograr una proteína vegetal más completa, con fibra y energía estable."
  }
];

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const introScrollVideoSrc = mediaSrc("assets/scroll-intro/fullness-intro-sequence.mp4");
const introScrollPosterSrc = mediaSrc("assets/scroll-intro/fullness-intro-poster.jpg");
const introScrollFinalFrameSrc = mediaSrc("assets/scroll-intro/fullness-intro-final.jpg");
const introScrollVideoDuration = 15.04;

function formatPrice(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

function IntroScrollSequence() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const posterFrameRef = useRef(null);
  const finalFrameRef = useRef(null);
  const progressRef = useRef(0);
  const playbackRef = useRef(null);
  const touchStartYRef = useRef(null);

  useEffect(() => {
    let animationFrame = 0;
    const playbackMs = 4000;
    const finalFrameHold = 0.16;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollBehaviorSnapshot = {
      root: document.documentElement.style.scrollBehavior,
      body: document.body.style.scrollBehavior
    };

    const getMetrics = () => {
      if (!sectionRef.current) return;

      const sectionTop = sectionRef.current.offsetTop;
      const sectionHeight = Math.max(1, sectionRef.current.offsetHeight);
      return { sectionTop, sectionHeight };
    };

    const clampProgress = (progress) => Math.min(1, Math.max(0, progress));

    const jumpToScroll = (top) => {
      window.scrollTo(0, top);
    };

    const getVideoDuration = () => {
      const duration = videoRef.current?.duration;
      return Number.isFinite(duration) && duration > 0 ? duration : introScrollVideoDuration;
    };

    const setFinalFrameVisible = (visible) => {
      if (!finalFrameRef.current) return;

      finalFrameRef.current.style.opacity = visible ? "1" : "0";
    };

    const setPosterFrameVisible = (visible) => {
      if (!posterFrameRef.current) return;

      posterFrameRef.current.style.opacity = visible ? "1" : "0";
    };

    const setScrollLock = (locked) => {
      document.documentElement.classList.toggle("intro-scroll-playing", locked);
      document.documentElement.style.scrollBehavior = locked ? "auto" : scrollBehaviorSnapshot.root;
      document.body.style.scrollBehavior = locked ? "auto" : scrollBehaviorSnapshot.body;
    };

    const syncHeaderVisibility = () => {
      const metrics = getMetrics();
      if (!metrics) {
        document.documentElement.classList.remove("intro-scroll-active");
        return;
      }

      const isInsideIntro =
        playbackRef.current ||
        (window.scrollY >= metrics.sectionTop + 2 &&
          window.scrollY < metrics.sectionTop + metrics.sectionHeight - 2);

      document.documentElement.classList.toggle("intro-scroll-active", Boolean(isInsideIntro));
    };

    const getProgressFromScroll = () => {
      const metrics = getMetrics();
      if (!metrics) return 0;

      return clampProgress((window.scrollY - metrics.sectionTop) / metrics.sectionHeight);
    };

    const isSequenceActive = () => {
      const metrics = getMetrics();
      if (!metrics) return false;

      return window.scrollY >= metrics.sectionTop - 2 && window.scrollY < metrics.sectionTop + metrics.sectionHeight - 2;
    };

    const setVideoProgress = (progress, scrubVideo = true) => {
      const nextProgress = clampProgress(progress);
      const video = videoRef.current;
      progressRef.current = nextProgress;

      setFinalFrameVisible(nextProgress >= 0.995);
      setPosterFrameVisible(nextProgress < 0.015);

      if (!video || video.readyState < 1 || !scrubVideo) return;

      const duration = getVideoDuration();
      const nextTime =
        nextProgress >= 0.995
          ? Math.max(0, duration - finalFrameHold)
          : Math.min(duration - finalFrameHold, Math.max(0, nextProgress * duration));

      if (Math.abs(video.currentTime - nextTime) > 0.02) {
        video.currentTime = nextTime;
      }
    };

    const finishPlayback = () => {
      const playback = playbackRef.current;
      const metrics = getMetrics();
      const video = videoRef.current;
      if (!playback || !metrics) return;

      const destination = playback.destination;
      playbackRef.current = null;
      setVideoProgress(destination);

      if (video) {
        video.pause();
        if (destination >= 1 && video.readyState >= 1) {
          video.currentTime = Math.max(0, getVideoDuration() - finalFrameHold);
        }
      }

      jumpToScroll(destination >= 1 ? metrics.sectionTop + metrics.sectionHeight + 1 : metrics.sectionTop);
      setScrollLock(false);
      syncHeaderVisibility();
    };

    const startPlayback = (direction) => {
      if (!isSequenceActive()) return false;

      const start = clampProgress(progressRef.current || getProgressFromScroll());
      const destination = direction > 0 ? 1 : 0;
      const distance = Math.abs(destination - start);
      const metrics = getMetrics();

      if (!metrics) return false;

      if (distance < 0.012 || reducedMotion) {
        setVideoProgress(destination);
        jumpToScroll(destination >= 1 ? metrics.sectionTop + metrics.sectionHeight + 1 : metrics.sectionTop);
        syncHeaderVisibility();
        return true;
      }

      const playbackDuration = Math.max(700, playbackMs * distance);

      playbackRef.current = {
        start,
        destination,
        startedAt: performance.now(),
        duration: playbackDuration,
        nativeVideo: false
      };

      setScrollLock(true);
      syncHeaderVisibility();

      const video = videoRef.current;
      if (direction > 0 && video && video.readyState >= 1) {
        const duration = getVideoDuration();
        video.pause();
        video.currentTime = Math.min(duration - finalFrameHold, Math.max(0, start * duration));
        video.playbackRate = Math.max(0.25, Math.min(4, ((duration - finalFrameHold) * distance) / (playbackDuration / 1000)));
        video.play()
          .then(() => {
            if (playbackRef.current) playbackRef.current.nativeVideo = true;
          })
          .catch(() => {
            if (playbackRef.current) playbackRef.current.nativeVideo = false;
          });
      }

      return true;
    };

    const handleWheel = (event) => {
      if (playbackRef.current) {
        event.preventDefault();
        return;
      }

      if (!isSequenceActive()) return;

      const direction = event.deltaY >= 0 ? 1 : -1;
      if (direction < 0 && getProgressFromScroll() <= 0.001) return;

      event.preventDefault();
      startPlayback(direction);
    };

    const handleTouchStart = (event) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event) => {
      if (playbackRef.current) {
        event.preventDefault();
        return;
      }

      if (!isSequenceActive() || touchStartYRef.current === null) return;

      const currentY = event.touches[0]?.clientY ?? touchStartYRef.current;
      const delta = touchStartYRef.current - currentY;
      if (Math.abs(delta) < 8) return;

      const direction = delta >= 0 ? 1 : -1;
      if (direction < 0 && getProgressFromScroll() <= 0.001) return;

      event.preventDefault();
      startPlayback(direction);
    };

    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      const downKeys = new Set(["ArrowDown", "PageDown", " ", "Spacebar", "End"]);
      const upKeys = new Set(["ArrowUp", "PageUp", "Home"]);
      const direction = downKeys.has(event.key) ? 1 : upKeys.has(event.key) ? -1 : 0;
      if (!direction) return;

      if (playbackRef.current) {
        event.preventDefault();
        return;
      }

      if (!isSequenceActive()) return;
      if (direction < 0 && getProgressFromScroll() <= 0.001) return;

      event.preventDefault();
      startPlayback(direction);
    };

    const handleScroll = () => {
      if (playbackRef.current) return;

      if (isSequenceActive()) {
        setVideoProgress(getProgressFromScroll());
      }

      syncHeaderVisibility();
    };

    const handleLoadedMetadata = () => {
      setVideoProgress(progressRef.current);
    };

    const renderFrame = () => {
      const playback = playbackRef.current;
      syncHeaderVisibility();

      if (playback) {
        const metrics = getMetrics();
        const elapsed = performance.now() - playback.startedAt;
        const rawProgress = Math.min(1, elapsed / playback.duration);
        const playbackProgress = playback.start + (playback.destination - playback.start) * rawProgress;

        setVideoProgress(playbackProgress, !playback.nativeVideo || playback.destination < playback.start);

        if (metrics) {
          jumpToScroll(metrics.sectionTop + playbackProgress * metrics.sectionHeight);
        }

        if (rawProgress >= 1) {
          finishPlayback();
        }
      }

      animationFrame = window.requestAnimationFrame(renderFrame);
    };

    setVideoProgress(getProgressFromScroll());
    videoRef.current?.addEventListener("loadedmetadata", handleLoadedMetadata);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("resize", handleScroll);
    animationFrame = window.requestAnimationFrame(renderFrame);

    return () => {
      videoRef.current?.removeEventListener("loadedmetadata", handleLoadedMetadata);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel, { capture: true });
      window.removeEventListener("touchstart", handleTouchStart, { capture: true });
      window.removeEventListener("touchmove", handleTouchMove, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("resize", handleScroll);
      window.cancelAnimationFrame(animationFrame);
      setScrollLock(false);
      document.documentElement.classList.remove("intro-scroll-active", "intro-scroll-playing");
    };
  }, []);

  return (
    <section className="scroll-sequence scroll-sequence-intro" id="inicio" ref={sectionRef} aria-label="Video introductorio Fullness Lab">
      <div className="scroll-sequence-stage">
        <video
          ref={videoRef}
          className="scroll-sequence-frame"
          src={introScrollVideoSrc}
          poster={introScrollPosterSrc}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <img
          ref={posterFrameRef}
          className="scroll-sequence-frame scroll-sequence-poster-frame"
          src={introScrollPosterSrc}
          alt=""
          aria-hidden="true"
        />
        <img
          ref={finalFrameRef}
          className="scroll-sequence-frame scroll-sequence-final-frame"
          src={introScrollFinalFrameSrc}
          alt=""
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

function App() {
  const appRef = useRef(null);
  const [cart, setCart] = useState([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [member, setMember] = useState(null);
  const [googleMessage, setGoogleMessage] = useState("");
  const [cartNotice, setCartNotice] = useState(null);
  const [headerHiddenForHero, setHeaderHiddenForHero] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const revealItems = gsap.utils.toArray([
        ".plate-hero-copy > *",
        ".plate-hero-feature",
        ".food-editorial .editorial-copy > *",
        ".functional-band .section-heading > *",
        ".functional-grid article",
        ".heating-copy > *",
        ".products .section-heading > *",
        ".product-card",
        ".membership > *"
      ].join(", "));

      revealItems.forEach((item) => {
        gsap.fromTo(item,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 86%",
              end: "bottom 14%",
              toggleActions: "play reverse play reverse"
            }
          }
        );
      });

      gsap.utils.toArray([
        ".plate-hero-visual",
        ".editorial-image img",
        ".heating-visual",
        ".product-art img",
        ".functional-grid article img"
      ].join(", ")).forEach((image) => {
        gsap.fromTo(image,
          { autoAlpha: 0, y: 22, scale: 1.025 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 1.05,
            ease: "power3.out",
            scrollTrigger: {
              trigger: image,
              start: "top 88%",
              end: "bottom 12%",
              toggleActions: "play reverse play reverse"
            }
          }
        );

        gsap.to(image, {
          yPercent: -4,
          ease: "none",
          scrollTrigger: {
            trigger: image,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.4
          }
        });
      });

      gsap.fromTo(".plate-hero-visual",
        { xPercent: -12, scale: 1.18 },
        {
          xPercent: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".plate-hero",
            start: "top bottom",
            end: "center center",
            scrub: 1.2
          }
        }
      );

    }, appRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const updateHeaderVisibility = () => {
      const introSequence = document.querySelector(".scroll-sequence-intro");
      if (!introSequence) {
        setHeaderHiddenForHero(false);
        return;
      }

      const sequenceTop = introSequence.offsetTop;
      const sequenceEnd = sequenceTop + introSequence.offsetHeight;
      const isInsideIntroScroll = window.scrollY > sequenceTop + 8 && window.scrollY < sequenceEnd - 8;

      setHeaderHiddenForHero((current) => (current === isInsideIntroScroll ? current : isInsideIntroScroll));
    };

    updateHeaderVisibility();
    window.addEventListener("scroll", updateHeaderVisibility, { passive: true });
    window.addEventListener("resize", updateHeaderVisibility);

    return () => {
      window.removeEventListener("scroll", updateHeaderVisibility);
      window.removeEventListener("resize", updateHeaderVisibility);
    };
  }, []);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace("#", ""));
    const accessToken = hash.get("access_token");

    if (!accessToken) return;

    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo validar Gmail.");
        return response.json();
      })
      .then((profile) => {
        setMember({
          name: profile.name || "Miembro Fullness",
          email: profile.email || "",
          phone: ""
        });
        setAccountOpen(false);
        window.history.replaceState(null, "", window.location.pathname);
      })
      .catch(() => {
        setGoogleMessage("No pudimos conectar Gmail. Revisa el Client ID de Google.");
      });
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;

      setAccountOpen(false);
      setCartOpen(false);
      setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  function addToCart(product) {
    setCart((items) => {
      const found = items.find((item) => item.id === product.id);
      if (found) {
        return items.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...items, { ...product, qty: 1 }];
    });
    setCartNotice({ id: Date.now(), name: product.name });
    window.clearTimeout(window.fullnessCartNoticeTimer);
    window.fullnessCartNoticeTimer = window.setTimeout(() => {
      setCartNotice(null);
    }, 2200);
  }

  function updateQty(id, delta) {
    setCart((items) =>
      items
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  }

  function submitAccount(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMember({
      name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone")
    });
    setAccountOpen(false);
  }

  function startGoogleLogin() {
    if (!googleClientId) {
      setGoogleMessage("Para activar Gmail real agrega VITE_GOOGLE_CLIENT_ID en Vercel.");
      return;
    }

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: window.location.origin,
      response_type: "token",
      scope: "openid email profile",
      prompt: "select_account"
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const navItems = [
    { href: "#filosofia", label: "Filosofía" },
    { href: "#calentar", label: "Cómo calentar" },
    { href: "#productos", label: "Tienda" }
  ];

  const nav = navItems.map((item) => (
    <a key={item.href} href={item.href}>{item.label}</a>
  ));

  return (
    <main ref={appRef}>
      <header className={`site-header ${headerHiddenForHero && !menuOpen ? "site-header-hidden" : ""}`}>
        <a className="brand" href="#inicio" aria-label="Fullness Lab inicio">
          <img className="brand-reference-logo" src={mediaSrc("assets/fullness-lab-logo-official.png")} alt="Fullness Lab" />
        </a>

        <nav className="desktop-nav">{nav}</nav>

        <div className="header-actions">
          <button className="member-link" type="button" onClick={() => setAccountOpen(true)}>
            <Sprout size={18} />
            <span>{member ? member.name.split(" ")[0] : "Acceso miembros"}</span>
          </button>
          <button
            className={`icon-button cart-button ${cartNotice ? "cart-pulse" : ""}`}
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={cartCount > 0 ? `Abrir carrito, ${cartCount} productos` : "Abrir carrito"}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && <span aria-hidden="true">{cartCount}</span>}
          </button>
          <button className="icon-button menu-toggle" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menú principal">
          <button className="icon-button close" type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X size={22} />
          </button>
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
          ))}
          <button
            className="member-link"
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setAccountOpen(true);
            }}
          >
            <Sprout size={18} />
            Acceso miembros
          </button>
        </div>
      )}

      <IntroScrollSequence />

      <section className="plate-hero" id="programa">
        <div className="plate-hero-copy">
          <p className="eyebrow">Nutrición inteligente. Energía real.</p>
          <h1>Ingredientes reales. Resultados reales.</h1>
          <p>Alimentación antiinflamatoria diseñada para hacerte sentir, rendir y vivir mejor.</p>
          <a className="primary-button plate-hero-cta" href="#plato">
            Comienza tu programa
            <ArrowRight size={20} />
          </a>
        </div>
        <img
          className="plate-hero-visual"
          src={introScrollFinalFrameSrc}
          alt=""
          aria-hidden="true"
        />
        <div className="plate-hero-features" aria-hidden="true">
          <span className="plate-hero-feature">
            <Leaf size={26} />
            <strong>Ingredientes reales</strong>
          </span>
          <span className="plate-hero-feature">
            <PackageCheck size={26} />
            <strong>Nutrición inteligente</strong>
          </span>
          <span className="plate-hero-feature">
            <CookingPot size={26} />
            <strong>Cocinado con cuidado</strong>
          </span>
          <span className="plate-hero-feature">
            <Heart size={26} />
            <strong>Para que tu cuerpo funcione mejor</strong>
          </span>
        </div>
      </section>

      <div className="philosophy-scene" id="filosofia">
        <section className="food-editorial" id="plato">
          <div className="editorial-copy">
            <h2>Nutrición consciente y lleno de información para tu sistema.</h2>
            <p>
              Fullness Lab une placer gastronómico, nutrición antiinflamatoria y ciencia funcional para que comer bien no se sienta como castigo.
            </p>
            <div className="editorial-pills">
              <span>Sin gluten</span>
              <span>Sin lácteos</span>
              <span>Sin azúcar refinada</span>
              <span>Grasas saludables</span>
            </div>
          </div>
        </section>

        <section className="philosophy">
          <div>
            <p className="eyebrow">Nuestra filosofía</p>
            <h2>Nutrir desde la raíz para transformar desde adentro.</h2>
            <p className="philosophy-lede">
              Creemos que la verdadera salud comienza en la raíz. Por eso creamos alimentos que nutren tu cuerpo, respetan la naturaleza y se basan en ciencia real. Ingredientes reales. Procesos conscientes. Resultados que se sienten.
            </p>
            <div className="philosophy-list">
              <article>
                <Leaf size={28} />
                <div>
                  <h3>Ingredientes reales</h3>
                  <p>Seleccionados por su calidad, origen y aporte real.</p>
                </div>
              </article>
              <article>
                <Sparkles size={28} />
                <div>
                  <h3>Ciencia que nutre</h3>
                  <p>Formulaciones basadas en evidencia y procesos conscientes.</p>
                </div>
              </article>
              <article>
                <Heart size={28} />
                <div>
                  <h3>Bienestar integral</h3>
                  <p>Alimentamos tu cuerpo, tu mente y tu estilo de vida.</p>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>

      <section className="functional-band">
        <div className="section-heading">
          <p className="eyebrow">Nutrición con fundamento</p>
          <h2>Combinaciones que trabajan juntas.</h2>
        </div>
        <div className="functional-grid">
          {functionalNotes.map((note) => (
            <article key={note.title}>
              <img className={note.imageClass || ""} src={note.image} alt={note.title} />
              <div>
                <Sprout size={22} />
                <h3>{note.title}</h3>
                <p>{note.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="heating" id="calentar">
        <div className="heating-water" aria-hidden="true"></div>
        <img
          className="heating-bag"
          src={mediaSrc("images/fullness-heating-bag-hand.png")}
          alt=""
          aria-hidden="true"
        />
        <div className="heating-copy">
          <p className="eyebrow">Cómo calentar tus platos</p>
          <h2>Un ritual simple para cuidar lo que comes.</h2>
          <p>
            Lo bueno hecho simple: en Fullness Lab cuidamos cada preparación para que alimentarte bien sea una forma de volver a ti.
          </p>
        </div>
        <ol className="heating-steps">
          <li>
            <span className="step-icon"><CookingPot size={28} /></span>
            <span className="step-content">
              <span className="step-heading"><span className="step-number">1.</span><strong>Calienta agua.</strong></span>
              <span>Lleva a hervor en una olla grande.</span>
            </span>
          </li>
          <li>
            <span className="step-icon"><PackageCheck size={28} /></span>
            <span className="step-content">
              <span className="step-heading"><span className="step-number">2.</span><strong>Sumerge la bolsa sellada.</strong></span>
              <span>Baja el fuego para mantener un hervor suave.</span>
            </span>
          </li>
          <li>
            <span className="step-icon"><Timer size={28} /></span>
            <span className="step-content">
              <span className="step-heading"><span className="step-number">3.</span><strong>Espera unos minutos.</strong></span>
              <span>El tiempo varía según el plato.</span>
            </span>
          </li>
          <li>
            <span className="step-icon"><HandPlatter size={28} /></span>
            <span className="step-content">
              <span className="step-heading"><span className="step-number">4.</span><strong>Sirve y disfruta.</strong></span>
              <span>Abre la bolsa con cuidado y sirve tu plato real.</span>
            </span>
          </li>
        </ol>
      </section>

      <section className="products section" id="productos">
        <div className="section-heading">
          <p className="eyebrow">Meal prep premium</p>
          <h2>Antiinflamatorio, rico y listo para tu rutina.</h2>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-art">
                <img src={mediaSrc("assets/fullness-food-crop.jpeg")} alt={`Plato ${product.name}`} />
              </div>
              <span>{product.tag}</span>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="product-footer">
                <strong>{formatPrice(product.price)}</strong>
                <button className="add-button" type="button" onClick={() => addToCart(product)}>
                  <Plus size={18} />
                  Agregar al pedido
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="membership">
        <p className="eyebrow">Nutrición emocional</p>
        <h2>El cuidado personal empieza por dentro.</h2>
        <p>
          El siguiente paso de Fullness Lab abre espacio a acompañamiento, sesiones y una comunidad para comer mejor desde el amor propio.
        </p>
      </section>

      <footer>
        <span>Fullness Lab</span>
        <span>Nutrirse desde la raíz.</span>
      </footer>

      {accountOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="account-title">
          <section className="plans-panel login-only">
            <button className="icon-button close" type="button" onClick={() => setAccountOpen(false)} aria-label="Cerrar cuenta">
              <X size={22} />
            </button>
            <form className="account-panel embedded" onSubmit={submitAccount}>
              <p className="eyebrow">Acceso miembros</p>
              <h2 id="account-title">Iniciar sesión</h2>
              <button className="google-button" type="button" onClick={startGoogleLogin}>
                <Mail size={18} />
                Continuar con Gmail
              </button>
              {googleMessage && <p className="form-note">{googleMessage}</p>}
              <label>
                Nombre completo
                <span><User size={18} /><input required name="name" placeholder="Tu nombre" autoComplete="name" /></span>
              </label>
              <label>
                Correo electrónico
                <span><Mail size={18} /><input required name="email" type="email" placeholder="tu@gmail.com" autoComplete="email" /></span>
              </label>
              <label>
                Teléfono
                <span><Phone size={18} /><input required name="phone" type="tel" placeholder="+56 9 1234 5678" autoComplete="tel" /></span>
              </label>
              <label>
                Contraseña
                <span><Lock size={18} /><input required name="password" type="password" placeholder="Mínimo 8 caracteres" minLength={8} autoComplete="current-password" /></span>
              </label>
              <button className="primary-button full" type="submit">Iniciar sesión</button>
            </form>
          </section>
        </div>
      )}

      {cartNotice && (
        <div className="cart-toast" role="status" aria-live="polite" key={cartNotice.id}>
          <span className="cart-toast-icon">
            <ShoppingBag size={18} />
          </span>
          <div>
            <strong>Agregado al carrito</strong>
            <p>{cartNotice.name}</p>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <button className="icon-button close" type="button" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">
            <X size={22} />
          </button>
          <p className="eyebrow">Tu carrito</p>
          <h2 id="cart-title">Pedido Fullness</h2>
          {cart.length === 0 ? (
            <p className="empty-cart">Aún no agregas platos. Elige un favorito para empezar.</p>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <article className="cart-item" key={item.id}>
                    <div>
                      <h3>{item.name}</h3>
                      <p>{formatPrice(item.price)}</p>
                    </div>
                    <div className="qty">
                      <button type="button" onClick={() => updateQty(item.id, -1)} aria-label={`Restar ${item.name}`}>
                        <Minus size={16} />
                      </button>
                      <span>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(item.id, 1)} aria-label={`Sumar ${item.name}`}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="cart-total">
                <span>Total</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              <button
                className="primary-button full"
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  setAccountOpen(true);
                }}
              >
                Continuar pedido
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

const rootElement = document.getElementById("root");
const root = window.fullnessRoot || createRoot(rootElement);
window.fullnessRoot = root;
root.render(<App />);

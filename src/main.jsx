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
  const targetProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const playbackRef = useRef(null);

  useEffect(() => {
    let animationFrame = 0;

    const getMetrics = () => {
      if (!sectionRef.current) return;

      const sectionTop = sectionRef.current.offsetTop;
      const scrollDistance = Math.max(1, sectionRef.current.offsetHeight - window.innerHeight);
      return { sectionTop, scrollDistance };
    };

    const clampProgress = (progress) => Math.min(1, Math.max(0, progress));
    const easeInOutCubic = (progress) =>
      progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const jumpToScroll = (top) => {
      const root = document.documentElement;
      const body = document.body;
      const previousRootBehavior = root.style.scrollBehavior;
      const previousBodyBehavior = body.style.scrollBehavior;

      root.style.scrollBehavior = "auto";
      body.style.scrollBehavior = "auto";
      window.scrollTo(0, top);
      window.requestAnimationFrame(() => {
        root.style.scrollBehavior = previousRootBehavior;
        body.style.scrollBehavior = previousBodyBehavior;
      });
    };

    const moveScrollToProgress = (progress) => {
      const metrics = getMetrics();
      if (!metrics) return;

      jumpToScroll(metrics.sectionTop + progress * metrics.scrollDistance);
    };

    const moveScrollPastSequence = () => {
      if (!sectionRef.current) return;

      jumpToScroll(sectionRef.current.offsetTop + sectionRef.current.offsetHeight + 1);
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

    const updateProgress = () => {
      if (playbackRef.current) return;

      const metrics = getMetrics();
      if (!metrics) return;

      const { sectionTop, scrollDistance } = metrics;
      const rawProgress = (window.scrollY - sectionTop) / scrollDistance;
      targetProgressRef.current = clampProgress(rawProgress);
    };

    const syncHeaderVisibility = () => {
      const metrics = getMetrics();
      if (!metrics) {
        document.documentElement.classList.remove("intro-scroll-active");
        return;
      }

      const { sectionTop, scrollDistance } = metrics;
      const isInsideIntroScroll = window.scrollY > sectionTop + 8 && window.scrollY < sectionTop + scrollDistance - 8;
      document.documentElement.classList.toggle("intro-scroll-active", isInsideIntroScroll);
    };

    const isSequenceActive = () => {
      const metrics = getMetrics();
      if (!metrics) return false;

      const { sectionTop, scrollDistance } = metrics;
      return window.scrollY >= sectionTop - 2 && window.scrollY <= sectionTop + scrollDistance + 2;
    };

    const startPlayback = (direction) => {
      if (!isSequenceActive()) return false;

      const start = clampProgress(smoothProgressRef.current);
      const destination = direction > 0 ? 1 : 0;
      const distance = Math.abs(destination - start);
      if (distance < 0.012) return false;

      const playbackDuration = Math.max(4200, Math.min(9500, distance * 9800));

      playbackRef.current = {
        start,
        destination,
        startedAt: performance.now(),
        duration: playbackDuration
      };

      targetProgressRef.current = start;
      return true;
    };

    const handleWheel = (event) => {
      if (!isSequenceActive()) return;

      const playback = playbackRef.current;
      const direction = event.deltaY >= 0 ? 1 : -1;
      const wheelDistance = Math.abs(event.deltaY);
      const wheelScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const wheelProgress = (event.deltaY * wheelScale) / 5200;

      if (playback) {
        event.preventDefault();
        if ((direction > 0 && playback.destination === 0) || (direction < 0 && playback.destination === 1)) {
          startPlayback(direction);
        }
        return;
      }

      const isWideFastScroll = wheelDistance > 240;
      if (isWideFastScroll && startPlayback(direction)) {
        event.preventDefault();
        return;
      }

      const currentProgress = clampProgress(targetProgressRef.current);
      const isLeavingSequence =
        (currentProgress <= 0.001 && direction < 0) || (currentProgress >= 0.999 && direction > 0);

      if (isLeavingSequence) {
        if (currentProgress >= 0.999 && direction > 0) {
          moveScrollPastSequence();
        } else {
          moveScrollToProgress(0);
        }
        return;
      }

      event.preventDefault();
      const nextProgress = clampProgress(currentProgress + wheelProgress);
      targetProgressRef.current = nextProgress;

      if (nextProgress <= 0.001 || nextProgress >= 0.999) {
        if (nextProgress >= 0.999) {
          moveScrollPastSequence();
        } else {
          moveScrollToProgress(0);
        }
      }
    };

    const renderFrame = () => {
      const playback = playbackRef.current;
      syncHeaderVisibility();

      if (playback) {
        const elapsed = performance.now() - playback.startedAt;
        const rawProgress = Math.min(1, elapsed / playback.duration);
        const playbackProgress = playback.start + (playback.destination - playback.start) * easeInOutCubic(rawProgress);

        targetProgressRef.current = playbackProgress;
        smoothProgressRef.current = playbackProgress;

        if (rawProgress >= 1) {
          targetProgressRef.current = playback.destination;
          smoothProgressRef.current = playback.destination;
          setFinalFrameVisible(playback.destination >= 1);
          if (playback.destination >= 1) {
            moveScrollPastSequence();
          } else {
            moveScrollToProgress(0);
          }
          playbackRef.current = null;
        }
      } else {
        const target = targetProgressRef.current;
        const current = smoothProgressRef.current;
        const nextProgress = current + (target - current) * 0.14;
        smoothProgressRef.current = Math.abs(target - nextProgress) < 0.00035 ? target : nextProgress;
      }

      const video = videoRef.current;
      if (video) {
        const duration = getVideoDuration();
        const isAtFinalFrame = smoothProgressRef.current >= 0.999;
        const nextTime = isAtFinalFrame
          ? Math.max(0, duration - 0.16)
          : Math.min(duration - 0.16, Math.max(0, smoothProgressRef.current * duration));

        setFinalFrameVisible(isAtFinalFrame);
        setPosterFrameVisible(smoothProgressRef.current < 0.012 && !isAtFinalFrame);

        if (Math.abs(video.currentTime - nextTime) > 0.006) {
          video.currentTime = nextTime;
        }
      }

      animationFrame = window.requestAnimationFrame(renderFrame);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    window.addEventListener("resize", updateProgress);
    animationFrame = window.requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("wheel", handleWheel, { capture: true });
      window.removeEventListener("resize", updateProgress);
      window.cancelAnimationFrame(animationFrame);
      document.documentElement.classList.remove("intro-scroll-active");
    };
  }, []);

  return (
    <section className="scroll-sequence scroll-sequence-intro" id="inicio" ref={sectionRef} aria-label="Fullness Lab">
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

      gsap.utils.toArray(".functional-band, .heating, .products, .membership").forEach((section) => {
        gsap.fromTo(section,
          { backgroundPosition: "50% 0%" },
          {
            backgroundPosition: "50% 100%",
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.8
            }
          }
        );
      });

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
      const sequenceEnd = sequenceTop + introSequence.offsetHeight - window.innerHeight;
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

  const nav = (
    <>
      <a href="#filosofia">Filosofía</a>
      <a href="#calentar">Cómo calentar</a>
      <a href="#productos">Tienda</a>
    </>
  );

  return (
    <main ref={appRef}>
      <header className={`site-header ${headerHiddenForHero && !menuOpen ? "site-header-hidden" : ""}`}>
        <a className="brand" href="#inicio" aria-label="Fullness Lab inicio">
          <img className="brand-reference-logo" src={mediaSrc("assets/fullness-lab-logo-official.png")} alt="Fullness Lab" />
        </a>

        <nav className="desktop-nav">{nav}</nav>

        <div className="header-actions">
          <button className="member-link" onClick={() => setAccountOpen(true)}>
            <Sprout size={18} />
            <span>{member ? member.name.split(" ")[0] : "Acceso miembros"}</span>
          </button>
          <button className={`icon-button cart-button ${cartNotice ? "cart-pulse" : ""}`} onClick={() => setCartOpen(true)} aria-label="Abrir carrito">
            <ShoppingBag size={20} />
            {cartCount > 0 && <span>{cartCount}</span>}
          </button>
          <button className="icon-button menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <button className="icon-button close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X size={22} />
          </button>
          {nav}
          <button className="member-link" onClick={() => setAccountOpen(true)}>
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
                <img src={mediaSrc("assets/fullness-food-crop.jpeg")} alt="" />
              </div>
              <span>{product.tag}</span>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="product-footer">
                <strong>{formatPrice(product.price)}</strong>
                <button className="add-button" onClick={() => addToCart(product)}>
                  <Plus size={18} />
                  Agregar
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
        <div className="overlay" role="dialog" aria-modal="true">
          <section className="plans-panel login-only">
            <button className="icon-button close" type="button" onClick={() => setAccountOpen(false)} aria-label="Cerrar cuenta">
              <X size={22} />
            </button>
            <form className="account-panel embedded" onSubmit={submitAccount}>
              <p className="eyebrow">Acceso miembros</p>
              <h2>Iniciar sesión</h2>
              <button className="google-button" type="button" onClick={startGoogleLogin}>
                <Mail size={18} />
                Continuar con Gmail
              </button>
              {googleMessage && <p className="form-note">{googleMessage}</p>}
              <label>
                Nombre completo
                <span><User size={18} /><input required name="name" placeholder="Tu nombre" /></span>
              </label>
              <label>
                Correo electrónico
                <span><Mail size={18} /><input required name="email" type="email" placeholder="tu@gmail.com" /></span>
              </label>
              <label>
                Teléfono
                <span><Phone size={18} /><input required name="phone" type="tel" placeholder="+56 9 1234 5678" /></span>
              </label>
              <label>
                Contraseña
                <span><Lock size={18} /><input required name="password" type="password" placeholder="Mínimo 8 caracteres" minLength={8} /></span>
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
        <div className="cart-drawer" role="dialog" aria-modal="true">
          <button className="icon-button close" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">
            <X size={22} />
          </button>
          <p className="eyebrow">Tu carrito</p>
          <h2>Pedido Fullness</h2>
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
                      <button onClick={() => updateQty(item.id, -1)} aria-label="Restar">
                        <Minus size={16} />
                      </button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} aria-label="Sumar">
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
              <button className="primary-button full">Continuar pedido</button>
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



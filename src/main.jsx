import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ChefHat,
  Flame,
  Heart,
  Leaf,
  Lock,
  Mail,
  Menu,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  Sparkles,
  Sprout,
  User,
  Waves,
  X
} from "lucide-react";
import "./styles.css";

gsap.registerPlugin(ScrollTrigger);

const products = [
  {
    id: "trucha-betarraga",
    name: "Trucha, betarraga y quinoa",
    tag: "Omega 3 + antioxidantes",
    price: 8990,
    description: "Pescado del sur, raices dulces, hojas verdes y granos integrales sin gluten."
  },
  {
    id: "pollo-curcuma",
    name: "Pollo, curcuma y vegetales",
    tag: "Antiinflamatorio",
    price: 7990,
    description: "Proteina limpia con jengibre, pimienta y grasas saludables para una nutricion completa."
  },
  {
    id: "legumbres-granos",
    name: "Legumbres, arroz integral y oliva",
    tag: "Proteina vegetal completa",
    price: 6990,
    description: "Legumbres y granos integrales combinados para equilibrar energia, fibra y saciedad."
  }
];

const functionalNotes = [
  {
    title: "Curcuma + jengibre + pimienta",
    image: "/assets/combo-curcuma-jengibre.png",
    description: "Especias elegidas para sumar sabor profundo y acompanar una alimentacion antiinflamatoria."
  },
  {
    title: "Grasas saludables + vegetales",
    image: "/assets/combo-grasas-saludables.png",
    description: "Palta, oliva, semillas y hojas verdes ayudan a dar saciedad y equilibrio al plato."
  },
  {
    title: "Limon + hojas verdes",
    image: "/assets/combo-espinaca-limon.png",
    imageClass: "functional-image-limon",
    description: "El acido del limon favorece la absorcion del hierro vegetal presente en hojas verdes."
  },
  {
    title: "Legumbres + granos integrales",
    image: "/assets/combo-legumbres-granos.png",
    description: "Se complementan para lograr una proteina vegetal mas completa, con fibra y energia estable."
  }
];

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function formatPrice(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

function App() {
  const appRef = useRef(null);
  const heroSceneRef = useRef(null);
  const [cart, setCart] = useState([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [member, setMember] = useState(null);
  const [googleMessage, setGoogleMessage] = useState("");
  const [cartNotice, setCartNotice] = useState(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".hero-plate-base, .hero-plate-impact, .hero-plate-final", { autoAlpha: 0 });
      gsap.set(".hero-plate-stage", { y: 34, scale: 1.02 });
      gsap.set(".hero-salmon", { autoAlpha: 1, xPercent: -50, yPercent: -50, y: 0, rotate: -4, scale: 1 });
      gsap.set(".hero-final-kicker, .hero-copy-block, .hero-privilege, .hero-cta, .hero-principles", { autoAlpha: 0, y: 24 });

      const heroTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: ".hero-scroll",
          start: "top top",
          end: "bottom bottom",
          scrub: 1.05
        }
      });

      heroTimeline
        .to(".hero-title-left", {
          x: "-18vw",
          autoAlpha: 0,
          filter: "blur(8px)",
          duration: 0.35,
          ease: "power2.inOut"
        }, 0.05)
        .to(".hero-title-right", {
          x: "18vw",
          autoAlpha: 0,
          filter: "blur(8px)",
          duration: 0.35,
          ease: "power2.inOut"
        }, 0.05)
        .to(".hero-salmon", {
          y: "0vh",
          rotate: 1.5,
          scale: 0.98,
          duration: 0.2,
          ease: "power2.inOut"
        }, 0)
        .to(".hero-plate-base", {
          autoAlpha: 1,
          duration: 0.2,
          ease: "sine.inOut"
        }, 0.2)
        .to(".hero-plate-stage", {
          y: 0,
          scale: 1,
          duration: 0.2,
          ease: "power3.out"
        }, 0.2)
        .to(".hero-salmon", {
          x: "-1.4vw",
          y: "4vh",
          rotate: 8,
          scale: 0.78,
          duration: 0.45,
          ease: "power1.inOut"
        }, 0.2)
        .to(".hero-plate-base", {
          autoAlpha: 0,
          duration: 0.1,
          ease: "sine.inOut"
        }, 0.65)
        .to(".hero-plate-impact", {
          autoAlpha: 1,
          duration: 0.1,
          ease: "sine.inOut"
        }, 0.65)
        .to(".hero-plate-stage", {
          y: -4,
          scale: 1.008,
          duration: 0.05,
          ease: "sine.out"
        }, 0.68)
        .to(".hero-plate-stage", {
          y: 0,
          scale: 1,
          duration: 0.07,
          ease: "sine.inOut"
        }, 0.73)
        .to(".hero-salmon", {
          y: "4.5vh",
          rotate: 8,
          scale: 0.78,
          duration: 0.15,
          ease: "sine.out"
        }, 0.75)
        .to(".hero-salmon", {
          autoAlpha: 0,
          duration: 0.1,
          ease: "sine.inOut"
        }, 0.9)
        .to(".hero-plate-impact", {
          autoAlpha: 0,
          duration: 0.1,
          ease: "sine.inOut"
        }, 0.9)
        .to(".hero-plate-final", {
          autoAlpha: 1,
          duration: 0.1,
          ease: "sine.inOut"
        }, 0.9)
        .to(".hero-final-kicker, .hero-copy-block, .hero-privilege, .hero-cta, .hero-principles", {
          autoAlpha: 1,
          y: 0,
          duration: 0.28,
          ease: "power3.out"
        }, 0.86);

      const revealItems = gsap.utils.toArray([
        ".food-editorial .editorial-copy > *",
        ".philosophy .eyebrow",
        ".philosophy h2",
        ".philosophy-list article",
        ".philosophy-close",
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
        ".editorial-image img",
        ".philosophy-visual img",
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

      gsap.utils.toArray(".food-editorial, .philosophy, .functional-band, .heating, .products, .membership").forEach((section) => {
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
      <a href="#filosofia">Filosofia</a>
      <a href="#calentar">Como calentar</a>
      <a href="#productos">Tienda</a>
    </>
  );

  return (
    <main ref={appRef}>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Fullness Lab inicio">
          <img className="brand-reference-logo" src="/assets/fullness-lab-logo-official.png" alt="Fullness Lab" />
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
          <button className="icon-button menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <button className="icon-button close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menu">
            <X size={22} />
          </button>
          {nav}
          <button className="member-link" onClick={() => setAccountOpen(true)}>
            <Sprout size={18} />
            Acceso miembros
          </button>
        </div>
      )}

      <section className="hero-scroll" id="inicio">
        <div className="hero">
          <div className="hero-plate-scene" ref={heroSceneRef} aria-label="Plato Fullness Lab animado">
            <div className="hero-plate-stage">
              <img className="hero-plate-layer hero-plate-base" src="/assets/hero-plate-base.png" alt="" />
              <img className="hero-plate-layer hero-plate-impact" src="/assets/hero-plate-impact.png" alt="" />
              <img className="hero-plate-layer hero-plate-final" src="/assets/hero-plate-final.png" alt="Plato Fullness Lab con salmon" />
              <img className="hero-salmon" src="/assets/hero-salmon-crop.png" alt="" />
            </div>
          </div>
          <div className="hero-wash" />

          <div className="hero-split-title" aria-hidden="true">
            <span className="hero-title-left">Nutrirse desde</span>
            <span className="hero-title-right">la raiz.</span>
          </div>

          <p className="eyebrow hero-final-kicker">Nutricion inteligente. Energia real.</p>

          <div className="hero-copy-block">
            <p className="hero-copy">
              Comida real, ingredientes funcionales y combinaciones que nutren tu cuerpo, tu mente y tu energia.
            </p>
          </div>

          <p className="hero-privilege">Es un privilegio nutrirse bien.</p>

          <div className="hero-cta">
            <a className="primary-button" href="#productos">
              Comienza tu programa
              <ArrowRight size={19} />
            </a>
          </div>

          <div className="hero-principles" aria-label="Pilares Fullness Lab">
            <span><Leaf size={22} /> Ingredientes reales</span>
            <span><Sparkles size={22} /> Nutricion inteligente</span>
            <span><ChefHat size={22} /> Cocinado con cuidado</span>
            <span><Heart size={22} /> Bienestar desde adentro</span>
          </div>
        </div>
      </section>

      <section className="food-editorial" id="plato">
        <div className="editorial-image">
          <img src="/assets/fullness-lab-food-porn.png" alt="Plato funcional Fullness Lab" />
        </div>
        <div className="editorial-copy">
          <h2>Rico, consciente y lleno de informacion para tu sistema.</h2>
          <p>
            Fullness Lab une placer gastronomico, nutricion antiinflamatoria y criterio funcional para que comer bien no se sienta como castigo.
          </p>
          <div className="editorial-pills">
            <span>Sin gluten</span>
            <span>Sin lacteos</span>
            <span>Sin azucar refinada</span>
            <span>Grasas saludables</span>
          </div>
        </div>
      </section>

      <section className="philosophy" id="filosofia">
        <div className="philosophy-visual">
          <img src="/assets/fullness-lab-philosophy-new.png" alt="Filosofia Fullness Lab" />
        </div>
        <div>
          <p className="eyebrow">Nuestra filosofia</p>
          <h2>Nutrirse desde la raiz.</h2>
          <div className="philosophy-list">
            <article>
              <Leaf size={28} />
              <div>
                <h3>Ingredientes reales</h3>
                <p>Seleccionamos ingredientes naturales, integrales y llenos de vida.</p>
              </div>
            </article>
            <article>
              <Sparkles size={28} />
              <div>
                <h3>Sin conservantes ni aditivos</h3>
                <p>Sin quimicos innecesarios. Solo comida real.</p>
              </div>
            </article>
            <article>
              <ChefHat size={28} />
              <div>
                <h3>Cocinado a baja temperatura</h3>
                <p>Respetamos los nutrientes y potenciamos el sabor.</p>
              </div>
            </article>
            <article>
              <Sprout size={28} />
              <div>
                <h3>Nutricion inteligente</h3>
                <p>Equilibrio entre macronutrientes, micronutrientes y alimentos funcionales.</p>
              </div>
            </article>
            <article>
              <Heart size={28} />
              <div>
                <h3>Bienestar integral</h3>
                <p>Comer bien es el primer paso para vivir mejor en cuerpo, mente y energia.</p>
              </div>
            </article>
          </div>
          <p className="philosophy-close">
            Comida real para una vida extraordinaria. Cada plato esta disenado para que te sientas bien, con energia estable, claridad mental y conexion contigo.
          </p>
        </div>
      </section>

      <section className="functional-band">
        <div className="section-heading">
          <p className="eyebrow">Nutricion con fundamento</p>
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
        <div className="heating-copy">
          <p className="eyebrow">Como calentar tus platos</p>
          <h2>Un ritual simple para cuidar lo que comes.</h2>
          <ol>
            <li>Calienta agua.</li>
            <li>Sumerge la bolsa sellada.</li>
            <li>Espera unos minutos.</li>
            <li>Sirve y disfruta un plato real, nutritivo y listo para ti.</li>
          </ol>
          <p>
            Lo bueno hecho simple: en Fullness Lab cuidamos cada preparacion para que alimentarte bien sea una forma de volver a ti.
          </p>
        </div>
        <div className="heating-visual">
          <Waves size={54} />
          <span>Bolsa al vacio + agua caliente + plato listo</span>
        </div>
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
                <img src="/assets/fullness-food-crop.jpeg" alt="" />
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
        <p className="eyebrow">Nutricion emocional</p>
        <h2>El cuidado personal empieza por dentro.</h2>
        <p>
          El siguiente paso de Fullness Lab abre espacio a acompanamiento, sesiones y una comunidad para comer mejor desde el amor propio.
        </p>
      </section>

      <footer>
        <span>Fullness Lab</span>
        <span>Nutrirse desde la raiz.</span>
      </footer>

      {accountOpen && (
        <div className="overlay" role="dialog" aria-modal="true">
          <section className="plans-panel login-only">
            <button className="icon-button close" type="button" onClick={() => setAccountOpen(false)} aria-label="Cerrar cuenta">
              <X size={22} />
            </button>
            <form className="account-panel embedded" onSubmit={submitAccount}>
              <p className="eyebrow">Acceso miembros</p>
              <h2>Iniciar sesion</h2>
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
                Correo electronico
                <span><Mail size={18} /><input required name="email" type="email" placeholder="tu@gmail.com" /></span>
              </label>
              <label>
                Telefono
                <span><Phone size={18} /><input required name="phone" type="tel" placeholder="+56 9 1234 5678" /></span>
              </label>
              <label>
                Contrasena
                <span><Lock size={18} /><input required name="password" type="password" placeholder="Minimo 8 caracteres" minLength={8} /></span>
              </label>
              <button className="primary-button full" type="submit">Iniciar sesion</button>
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
            <p className="empty-cart">Aun no agregas platos. Elige un favorito para empezar.</p>
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

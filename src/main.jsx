import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ChefHat,
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
  X
} from "lucide-react";
import "./styles.css";

gsap.registerPlugin(ScrollTrigger);

const nutrients = [
  ["Vitaminas", "Energia que se siente."],
  ["Minerales", "Equilibrio que sostiene."],
  ["Grasas saludables", "Saciedad y sistema hormonal."],
  ["Antioxidantes", "Proteccion desde adentro."],
  ["Proteinas de calidad", "Fuerza que se construye."],
  ["Hidratos complejos", "Energia estable."]
];

const philosophy = [
  ["Ingredientes reales", "Naturales, integrales y llenos de vida."],
  ["Sin conservantes ni aditivos", "Sin quimicos innecesarios. Solo comida real."],
  ["Coccion cuidada", "Respetamos nutrientes, textura y sabor."],
  ["Nutricion inteligente", "Macronutrientes, micronutrientes y funcionalidad."],
  ["Bienestar integral", "Cuerpo, mente y energia en una misma mesa."]
];

const combinations = [
  {
    title: "Curcuma + jengibre + pimienta",
    image: "/assets/combo-curcuma-jengibre.png",
    body: "Especias elegidas para sumar sabor profundo y acompanar una alimentacion antiinflamatoria."
  },
  {
    title: "Grasas saludables + vegetales",
    image: "/assets/combo-grasas-saludables.png",
    body: "Palta, oliva, semillas y hojas verdes ayudan a dar saciedad y equilibrio al plato."
  },
  {
    title: "Limon + hojas verdes",
    image: "/assets/combo-espinaca-limon.png",
    body: "El acido del limon favorece la absorcion del hierro vegetal presente en hojas verdes.",
    imageClass: "object-[center_38%]"
  },
  {
    title: "Legumbres + granos integrales",
    image: "/assets/combo-legumbres-granos.png",
    body: "Se complementan para lograr una proteina vegetal mas completa, con fibra y energia estable."
  }
];

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

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function formatPrice(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

function App() {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const plateRef = useRef(null);
  const rootLineRef = useRef(null);
  const [cart, setCart] = useState([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [member, setMember] = useState(null);
  const [googleMessage, setGoogleMessage] = useState("");
  const [cartNotice, setCartNotice] = useState(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".reveal", { y: 34, opacity: 0 });
      gsap.utils.toArray(".reveal").forEach((item) => {
        gsap.to(item, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: item,
            start: "top 84%"
          }
        });
      });

      gsap.to(".depth-image", {
        yPercent: -10,
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2
        }
      });

      gsap.to(plateRef.current, {
        yPercent: 9,
        rotate: -1.5,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "+=130%",
          scrub: 1.1,
          pin: true,
          anticipatePin: 1
        }
      });

      gsap.fromTo(".nutrient-chip", {
        y: 44,
        opacity: 0,
        scale: 0.94
      }, {
        y: 0,
        opacity: 1,
        scale: 1,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top+=10%",
          end: "+=80%",
          scrub: 1
        }
      });

      gsap.fromTo(rootLineRef.current, { strokeDashoffset: 900 }, {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: {
          trigger: ".philosophy-panel",
          start: "top 70%",
          end: "bottom 40%",
          scrub: 1.4
        }
      });

      gsap.from(".ingredient-card", {
        y: 90,
        opacity: 0,
        stagger: 0.12,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".ingredients-stage",
          start: "top 72%"
        }
      });
    }, rootRef);

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
      <a href="#ingredientes">Ingredientes</a>
      <a href="#calentar">Como calentar</a>
      <a href="#productos">Tienda</a>
    </>
  );

  return (
    <main ref={rootRef} className="min-h-screen overflow-x-hidden bg-[#06120e] text-[#f4eadb]">
      <header className="fixed inset-x-0 top-0 z-50 grid grid-cols-[auto_1fr_auto] items-center gap-6 bg-[linear-gradient(180deg,rgba(6,18,14,0.96),rgba(6,18,14,0.82))] px-5 py-4 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl md:px-12">
        <a href="#inicio" className="inline-flex items-center" aria-label="Fullness Lab inicio">
          <img className="h-16 w-16 object-contain mix-blend-screen brightness-125 contrast-125" src="/assets/fullness-lab-logo-official.png" alt="Fullness Lab" />
        </a>
        <nav className="hidden justify-center gap-10 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#eadcc6]/85 lg:flex">
          {nav}
        </nav>
        <div className="flex items-center justify-end gap-3">
          <button className="hidden min-h-11 items-center gap-2 border-l border-[#c9a86a]/40 bg-[#081611]/55 px-5 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#eadcc6]/90 lg:inline-flex" onClick={() => setAccountOpen(true)}>
            <Sprout size={17} />
            {member ? member.name.split(" ")[0] : "Acceso miembros"}
          </button>
          <button className="icon-round relative" onClick={() => setCartOpen(true)} aria-label="Abrir carrito">
            <ShoppingBag size={19} />
            {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#c9a86a] px-1 text-xs font-black text-[#210b11]">{cartCount}</span>}
          </button>
          <button className="icon-round menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={21} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#06120e]/95 px-6 text-center uppercase tracking-[0.18em] text-[#fff8ef]">
          <button className="icon-round absolute right-5 top-5" onClick={() => setMenuOpen(false)} aria-label="Cerrar menu">
            <X size={22} />
          </button>
          <div className="grid gap-7 font-black">
            {nav}
            <button className="text-[#c9a86a]" onClick={() => setAccountOpen(true)}>Acceso miembros</button>
          </div>
        </div>
      )}

      <section ref={heroRef} id="inicio" className="relative grid min-h-screen overflow-hidden px-5 pt-28 md:px-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(142,38,60,0.18),transparent_26rem),linear-gradient(110deg,#06120e_0%,#092018_48%,#1b120d_100%)]" />
        <div className="absolute inset-0 opacity-[0.18] grain" />
        <div className="reveal relative z-10 max-w-xl pb-8">
          <p className="eyebrow">Nutricion inteligente. Energia real.</p>
          <h1 className="font-serif text-[clamp(4rem,9vw,8.7rem)] leading-[0.86] text-[#f6ead7]">
            Nutrirse desde la raiz.
          </h1>
          <p className="mt-8 max-w-md text-lg leading-8 text-[#f4eadb]/78">
            Comida real, placer gastronomico y nutricion antiinflamatoria para que alimentarte bien se sienta como volver a ti.
          </p>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#b77a3f]">Es un privilegio nutrirse bien.</p>
          <a className="primary-action mt-8" href="#productos">
            Comienza tu programa
            <ArrowRight size={18} />
          </a>
        </div>

        <div className="relative z-10 grid min-h-[52vh] place-items-center lg:min-h-[78vh]">
          <div ref={plateRef} className="relative w-full max-w-4xl">
            <img className="depth-image w-full object-contain drop-shadow-[0_44px_90px_rgba(0,0,0,0.48)]" src="/assets/fullness-lab-food-porn.png" alt="Plato Fullness Lab con nutrientes" />
            <div className="absolute inset-0 rounded-full bg-[#c9a86a]/10 blur-3xl" />
          </div>
          <div className="pointer-events-none absolute inset-0">
            {nutrients.map(([title, body], index) => (
              <div className={`nutrient-chip nutrient-chip-${index + 1}`} key={title}>
                <span>{title}</span>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#07120e] py-24 md:py-32" id="plato">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 md:px-12 lg:grid-cols-[0.95fr_1fr] lg:items-center">
          <div className="reveal overflow-hidden">
            <img className="depth-image h-[620px] w-full object-cover object-center" src="/assets/fullness-lab-food-porn.png" alt="Plato funcional Fullness Lab" />
          </div>
          <div className="reveal max-w-2xl lg:pl-8">
            <p className="eyebrow">Placer con criterio</p>
            <h2 className="font-serif text-[clamp(3.2rem,6vw,6.4rem)] leading-[0.9]">
              Rico, consciente y lleno de informacion para tu sistema.
            </h2>
            <p className="mt-7 text-lg leading-8 text-[#f4eadb]/70">
              Fullness Lab une cocina gourmet, nutricion funcional y bienestar emocional sin caer en dieta, castigo ni estetica fitness.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Sin gluten", "Sin lacteos", "Sin azucar refinada", "Grasas saludables"].map((tag) => (
                <span className="border border-[#c9a86a]/25 bg-[#0a1812]/70 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#e6c786]" key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="filosofia" className="philosophy-panel relative overflow-hidden bg-[#e8ddca] text-[#17110c]">
        <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-[520px] overflow-hidden">
            <img className="depth-image h-full w-full object-cover" src="/assets/fullness-lab-philosophy-new.png" alt="Betarraga Fullness Lab" />
            <svg className="absolute inset-0 h-full w-full opacity-50" viewBox="0 0 640 820" fill="none">
              <path ref={rootLineRef} className="root-line" d="M310 230 C300 330 320 400 292 492 C270 565 210 596 168 690 M310 230 C332 348 356 421 355 520 C354 604 396 649 452 722 M310 230 C278 356 246 430 244 548 C242 638 220 692 200 760 M310 230 C350 335 420 386 444 486 C468 588 510 632 562 704" />
            </svg>
          </div>
          <div className="reveal flex items-center px-5 py-24 md:px-12">
            <div className="max-w-2xl">
              <p className="eyebrow text-[#7d2e3d]">Nuestra filosofia</p>
              <h2 className="font-serif text-[clamp(3rem,6vw,6rem)] leading-[0.92]">Lo esencial vive adentro.</h2>
              <p className="mt-7 text-lg leading-8 text-[#17110c]/70">
                La betarraga crece bajo tierra, absorbiendo minerales, agua y vida. Fullness Lab entiende el bienestar igual: lo que sostiene nace desde adentro.
              </p>
              <div className="mt-10 grid gap-5">
                {philosophy.map(([title, body]) => (
                  <article className="grid grid-cols-[56px_1fr] gap-4" key={title}>
                    <span className="grid h-12 w-12 place-items-center rounded-full border border-[#7d2e3d]/25 text-[#7d2e3d]"><Leaf size={22} /></span>
                    <div>
                      <h3 className="font-serif text-2xl uppercase tracking-[0.08em]">{title}</h3>
                      <p className="mt-1 text-[#17110c]/65">{body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ingredientes" className="ingredients-stage bg-[linear-gradient(135deg,#07120e,#16251d_48%,#1b120d)] px-5 py-24 md:px-12 md:py-32">
        <div className="section-heading reveal">
          <p className="eyebrow text-[#7d2e3d]">Nutricion con fundamento</p>
          <h2 className="font-serif text-[clamp(3.2rem,6vw,6.2rem)] leading-[0.92]">Combinaciones que trabajan juntas.</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {combinations.map((item) => (
            <article className="ingredient-card overflow-hidden border border-[#c9a86a]/15 bg-[#e8ddca]/[0.055]" key={item.title}>
              <img className={`h-72 w-full object-cover ${item.imageClass || ""}`} src={item.image} alt={item.title} />
              <div className="p-6">
                <Sprout className="mb-8 text-[#c9a86a]" size={24} />
                <h3 className="text-xl font-black">{item.title}</h3>
                <p className="mt-5 leading-7 text-[#f4eadb]/70">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="calentar" className="grid bg-[#e8ddca] text-[#17110c] lg:grid-cols-[0.9fr_1fr]">
        <div className="reveal flex items-center px-5 py-20 md:px-12">
          <div className="max-w-xl">
            <p className="eyebrow text-[#7d2e3d]">Como calentar tus platos</p>
            <h2 className="font-serif text-[clamp(3rem,6vw,5.8rem)] leading-[0.92]">Un ritual simple para cuidar lo que comes.</h2>
            <ol className="mt-8 grid gap-3 pl-5 text-lg leading-8 text-[#17110c]/70">
              <li>Calienta agua.</li>
              <li>Sumerge la bolsa sellada.</li>
              <li>Espera unos minutos.</li>
              <li>Sirve y disfruta un plato real, nutritivo y listo para ti.</li>
            </ol>
            <p className="mt-8 text-lg leading-8 text-[#17110c]/70">
              Lo bueno hecho simple: en Fullness Lab cuidamos cada preparacion para que alimentarte bien sea una forma de volver a ti.
            </p>
          </div>
        </div>
        <div className="min-h-[520px] overflow-hidden">
          <img className="depth-image h-full w-full object-cover" src="/assets/fullness-lab-bag-heating.png" alt="Bolsa Fullness Lab calentandose" />
        </div>
      </section>

      <section id="productos" className="bg-[#101d17] px-5 py-24 md:px-12 md:py-32">
        <div className="section-heading reveal">
          <p className="eyebrow">Meal prep premium</p>
          <h2 className="font-serif text-[clamp(3.1rem,6vw,6rem)] leading-[0.92]">Antiinflamatorio, rico y listo para tu rutina.</h2>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {products.map((product) => (
            <article className="reveal overflow-hidden border border-[#c9a86a]/15 bg-[#e8ddca]/[0.055]" key={product.id}>
              <img className="h-80 w-full object-cover" src="/assets/fullness-food-crop.jpeg" alt="" />
              <div className="p-7">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#c9a86a]">{product.tag}</span>
                <h3 className="mt-4 text-2xl font-black">{product.name}</h3>
                <p className="mt-4 leading-7 text-[#f4eadb]/66">{product.description}</p>
                <div className="mt-7 flex items-center justify-between gap-4">
                  <strong className="text-[#f3d89d]">{formatPrice(product.price)}</strong>
                  <button className="add-button" onClick={() => addToCart(product)}>
                    <Plus size={18} />
                    Agregar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[radial-gradient(circle_at_center,rgba(142,38,60,0.24),transparent_24rem),linear-gradient(135deg,#1b120d,#07110d)] px-5 py-24 text-center md:px-12 md:py-32">
        <div className="reveal mx-auto max-w-3xl">
          <p className="eyebrow">Nutricion emocional</p>
          <h2 className="font-serif text-[clamp(3rem,6vw,6rem)] leading-[0.92]">El cuidado personal empieza por dentro.</h2>
          <p className="mt-7 text-lg leading-8 text-[#f4eadb]/70">
            No es dieta. No es restriccion. Es una forma de volver a ti a traves de alimentos reales, ricos y combinados con intencion.
          </p>
        </div>
      </section>

      <footer className="flex flex-col gap-2 bg-[#06120e] px-5 py-8 text-[#f4eadb]/60 md:flex-row md:justify-between md:px-12">
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
              <p className="eyebrow text-[#7d2e3d]">Acceso miembros</p>
              <h2>Iniciar sesion</h2>
              <button className="google-button" type="button" onClick={startGoogleLogin}>
                <Mail size={18} />
                Continuar con Gmail
              </button>
              {googleMessage && <p className="form-note">{googleMessage}</p>}
              <label>Nombre completo<span><User size={18} /><input required name="name" placeholder="Tu nombre" /></span></label>
              <label>Correo electronico<span><Mail size={18} /><input required name="email" type="email" placeholder="tu@gmail.com" /></span></label>
              <label>Telefono<span><Phone size={18} /><input required name="phone" type="tel" placeholder="+56 9 1234 5678" /></span></label>
              <label>Contrasena<span><Lock size={18} /><input required name="password" type="password" placeholder="Minimo 8 caracteres" minLength={8} /></span></label>
              <button className="primary-button full" type="submit">Iniciar sesion</button>
            </form>
          </section>
        </div>
      )}

      {cartNotice && (
        <div className="cart-toast" role="status" aria-live="polite" key={cartNotice.id}>
          <span className="cart-toast-icon"><ShoppingBag size={18} /></span>
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
          <p className="eyebrow text-[#7d2e3d]">Tu carrito</p>
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
                      <button onClick={() => updateQty(item.id, -1)} aria-label="Restar"><Minus size={16} /></button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} aria-label="Sumar"><Plus size={16} /></button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="cart-total"><span>Total</span><strong>{formatPrice(cartTotal)}</strong></div>
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

import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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

const memberPlans = [
  {
    id: "vegetarianos",
    name: "Vegetarianos",
    description: "Platos plant based, granos integrales y combinaciones completas."
  },
  {
    id: "perdida-peso",
    name: "Perdida de peso",
    description: "Nutricion consciente, saciedad y energia estable sin castigo."
  },
  {
    id: "premium",
    name: "Premium",
    description: "Proteinas seleccionadas, pescados del sur y cocina funcional gourmet."
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

const functionalNotes = [
  "Curcuma + jengibre + pimienta",
  "Grasas saludables + vegetales",
  "Limon + hojas verdes",
  "Legumbres + granos integrales"
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
  const [cart, setCart] = useState([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [member, setMember] = useState(null);
  const [googleMessage, setGoogleMessage] = useState("");
  const [cartNotice, setCartNotice] = useState(null);

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
    setLoginOpen(false);
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
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Fullness Lab inicio">
          <img className="brand-reference-logo" src="/assets/fullness-lab-logo-white.png" alt="Fullness Lab" />
        </a>

        <nav className="desktop-nav">{nav}</nav>

        <div className="header-actions">
          <button className="member-link" onClick={() => { setLoginOpen(false); setAccountOpen(true); }}>
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
          <button className="member-link" onClick={() => { setLoginOpen(false); setAccountOpen(true); }}>
            <Sprout size={18} />
            Acceso miembros
          </button>
        </div>
      )}

      <section className="hero" id="inicio">
        <video className="hero-video" autoPlay muted playsInline preload="auto" poster="/assets/fullness-lab-hero-reference.png">
          <source src="/assets/fullness-lab-hero-0513.mp4" type="video/mp4" />
        </video>
        <div className="hero-wash" />

        <div className="hero-copy-block">
          <p className="eyebrow">Nutricion inteligente. Energia real.</p>
          <h1>Nutrirse desde la raiz.</h1>
          <p className="hero-copy">
            Comida real, ingredientes funcionales y combinaciones que nutren tu cuerpo, tu mente y tu energia.
          </p>
          <p className="hero-privilege">Es un privilegio nutrirse bien.</p>
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
      </section>

      <section className="food-editorial" id="plato">
        <div className="editorial-image">
          <img src="/assets/fullness-lab-food-porn.png" alt="Plato funcional Fullness Lab" />
        </div>
        <div className="editorial-copy">
          <p className="eyebrow">Food porn funcional</p>
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
            <article key={note}>
              <Sprout size={24} />
              <h3>{note}</h3>
              <p>Ingredientes elegidos para sumar sabor, equilibrio y funcion sin rigidez.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="heating" id="calentar">
        <div className="heating-copy">
          <p className="eyebrow">Como calentar tus platos</p>
          <h2>Un ritual simple para cuidar lo que comes.</h2>
          <ol>
            <li>Calienta agua sin hervir agresivamente.</li>
            <li>Sumerge la bolsa sellada durante unos minutos.</li>
            <li>Abre, sirve y termina con hierbas o aceite de oliva.</li>
          </ol>
          <p>
            Lo bueno hecho simple: nosotros cuidamos los ingredientes, las combinaciones y el punto de coccion.
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
          <section className="plans-panel">
            <button className="icon-button close" type="button" onClick={() => { setLoginOpen(false); setAccountOpen(false); }} aria-label="Cerrar cuenta">
              <X size={22} />
            </button>
            <p className="eyebrow">Acceso miembros</p>
            <h2>Elige tu plan Fullness Lab</h2>
            <div className="plans-grid">
              {memberPlans.map((plan) => (
                <article key={plan.id}>
                  <Leaf size={24} />
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                  <button className="primary-button full" type="button" onClick={() => setLoginOpen(true)}>
                    Comprar plan
                  </button>
                </article>
              ))}
            </div>
            {loginOpen && (
              <form className="account-panel embedded" onSubmit={submitAccount}>
                <p className="eyebrow">Iniciar sesion</p>
                <h2>Accede para continuar</h2>
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
            )}
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

createRoot(document.getElementById("root")).render(<App />);

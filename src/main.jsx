import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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
  Play,
  Plus,
  ShoppingBag,
  Sparkles,
  User,
  X
} from "lucide-react";
import "./styles.css";

const products = [
  {
    id: "salmon-quinoa",
    name: "Salmón, quinoa y betarraga",
    tag: "Antiinflamatorio",
    price: 7990,
    description: "Proteína noble, vegetales vivos y carbohidrato limpio para energía estable."
  },
  {
    id: "pollo-camote",
    name: "Pollo de campo con camote",
    tag: "Alto en proteína",
    price: 6990,
    description: "Cocinado al vacío para mantener textura, sabor y nutrientes reales."
  },
  {
    id: "lentejas-verdes",
    name: "Lentejas verdes especiadas",
    tag: "Plant based",
    price: 5990,
    description: "Fibra, minerales y especias suaves para sentirte liviano y satisfecho."
  }
];

const programs = [
  "Reset digestivo de 7 días",
  "Energía real para entrenamiento",
  "Plan diario oficina y casa"
];

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
  const [member, setMember] = useState(null);

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
    setCartOpen(true);
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

  const nav = (
    <>
      <a href="#programas">Programas</a>
      <a href="#filosofia">Filosofía</a>
      <a href="#ingredientes">Ingredientes</a>
      <a href="#comunidad">Comunidad</a>
    </>
  );

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Fullness inicio">
          <span className="brand-mark">
            <span />
          </span>
          <span className="brand-text">
            Fullness
            <small>Lab</small>
          </span>
        </a>

        <nav className="desktop-nav">{nav}</nav>

        <div className="header-actions">
          <button className="pill-button" onClick={() => setAccountOpen(true)}>
            <User size={18} />
            <span>{member ? member.name.split(" ")[0] : "Acceso miembros"}</span>
          </button>
          <button className="icon-button cart-button" onClick={() => setCartOpen(true)} aria-label="Abrir carrito">
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
          <button className="pill-button" onClick={() => setAccountOpen(true)}>
            <User size={18} />
            Acceso miembros
          </button>
        </div>
      )}

      <section className="hero" id="inicio">
        <img src="/assets/fullness-food-crop.jpeg" alt="Plato Fullness con ingredientes reales" />
        <div className="hero-shadow" />
        <div className="hero-content">
          <p className="eyebrow">Nutrición inteligente. Energía real.</p>
          <h1>Ingredientes reales. Resultados reales.</h1>
          <p className="hero-copy">
            Comida 100% natural, seleccionada minuciosamente y lista para servir en bolsas al vacío.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#productos">
              Comienza tu programa
              <ArrowRight size={19} />
            </a>
            <a className="video-link" href="#slowmotion">
              <span><Play size={16} fill="currentColor" /></span>
              Ver video
            </a>
          </div>
        </div>
        <div className="hero-features" aria-label="Beneficios Fullness">
          <span><Leaf size={24} /> Ingredientes reales</span>
          <span><Sparkles size={24} /> Nutrición inteligente</span>
          <span><ChefHat size={24} /> Cocinado con cuidado</span>
          <span><Heart size={24} /> Para que tu cuerpo funcione mejor</span>
        </div>
      </section>

      <section className="section intro-band" id="filosofia">
        <div>
          <p className="eyebrow">Filosofía Fullness</p>
          <h2>Comida real para una rutina que se siente mejor.</h2>
        </div>
        <p>
          Cada preparación está pensada para llegar lista, fresca y equilibrada: abrir, calentar,
          servir y volver a confiar en lo que comes.
        </p>
      </section>

      <section className="section programs" id="programas">
        <div className="section-heading">
          <p className="eyebrow">Programas</p>
          <h2>Planes para ordenar tu semana</h2>
        </div>
        <div className="program-grid">
          {programs.map((program, index) => (
            <article className="program-card" key={program}>
              <span>0{index + 1}</span>
              <h3>{program}</h3>
              <p>Menús al vacío, porciones claras y combinaciones diseñadas para comer mejor sin cocinar de más.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section products" id="productos">
        <div className="section-heading">
          <p className="eyebrow">Listo para servir</p>
          <h2>Agrega tus favoritos al carrito</h2>
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

      <section className="section ingredients" id="ingredientes">
        <div>
          <p className="eyebrow">Ingredientes</p>
          <h2>Seleccionados minuciosamente</h2>
          <p>
            Sin rellenos innecesarios, sin ultraprocesados y con técnicas de cocción que respetan
            sabor, textura y nutrientes.
          </p>
        </div>
        <div className="ingredient-list">
          <span>Proteínas nobles</span>
          <span>Vegetales de temporada</span>
          <span>Grasas saludables</span>
          <span>Especias reales</span>
        </div>
      </section>

      <section className="slowmotion" id="slowmotion">
        <div className="slowmotion-media">
          <img src="/assets/fullness-food-crop.jpeg" alt="Comida Fullness en movimiento cinematográfico" />
        </div>
        <div className="slowmotion-copy">
          <p className="eyebrow">Video de apertura</p>
          <h2>Cuando me mandes el video, esta zona queda como portada en slow motion.</h2>
          <p>
            El diseño ya está pensado para recibir un video horizontal de comida: puede reemplazar
            esta imagen en el hero o vivir aquí como pieza principal de la comunidad.
          </p>
        </div>
      </section>

      <section className="section community" id="comunidad">
        <div className="section-heading">
          <p className="eyebrow">Comunidad</p>
          <h2>Un lugar para comer real, aprender y acompañarse</h2>
        </div>
        <div className="community-grid">
          <article>
            <h3>Retos semanales</h3>
            <p>Hábitos simples, check-ins y objetivos de energía, digestión y constancia.</p>
          </article>
          <article>
            <h3>Acceso a miembros</h3>
            <p>Cuenta con Gmail, correo, contraseña, teléfono y datos básicos para pedidos.</p>
          </article>
          <article>
            <h3>Pedidos inteligentes</h3>
            <p>Carrito listo para sumar platos, programas y futuras suscripciones.</p>
          </article>
        </div>
      </section>

      <footer>
        <span>Fullness Lab</span>
        <span>Comida real lista para servir.</span>
      </footer>

      {accountOpen && (
        <div className="overlay" role="dialog" aria-modal="true">
          <form className="account-panel" onSubmit={submitAccount}>
            <button className="icon-button close" type="button" onClick={() => setAccountOpen(false)} aria-label="Cerrar cuenta">
              <X size={22} />
            </button>
            <p className="eyebrow">Acceso miembros</p>
            <h2>Crea tu cuenta Fullness</h2>
            <button className="google-button" type="button">
              <Mail size={18} />
              Continuar con Gmail
            </button>
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
            <button className="primary-button full" type="submit">Crear cuenta</button>
          </form>
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

createRoot(document.getElementById("root")).render(<App />);

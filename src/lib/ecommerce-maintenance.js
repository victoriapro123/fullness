// Reopen the shop only after its next release is accepted and authorized.
export const ECOMMERCE_MAINTENANCE = true;
export const ECOMMERCE_MAINTENANCE_MESSAGE = 'La tienda está en construcción. Pronto podrás comprar aquí.';
export function isEcommercePath(pathname) {
  return /^\/(?:tienda|producto|carrito|checkout)(?:\/|$)/.test(String(pathname || '').split(/[?#]/)[0]);
}
export function assertShoppingOpen() {
  if (ECOMMERCE_MAINTENANCE) throw Object.assign(new Error(ECOMMERCE_MAINTENANCE_MESSAGE), {statusCode:503,code:'SHOP_UNDER_CONSTRUCTION'});
}

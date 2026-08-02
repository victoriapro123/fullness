import {useEffect, useMemo, useState} from "react";
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  Truck
} from "lucide-react";

const ORDER_STATUS_LABELS = {
  cancelled: "Cancelado",
  delivered: "Completado",
  out_for_delivery: "En reparto",
  paid: "Pagado",
  pending_payment: "Pago pendiente",
  preparing: "En preparación",
  ready: "Listo",
  refunded: "Reembolsado"
};

const PAYMENT_STATUS_LABELS = {
  approved: "Aprobado",
  authorized: "Autorizado",
  cancelled: "Cancelado",
  charged_back: "Contracargo",
  in_process: "En proceso",
  pending: "Pendiente",
  refunded: "Reembolsado",
  rejected: "Rechazado"
};

const DELIVERY_STATUS_LABELS = {
  cancelled: "Cancelada",
  delivered: "Completada",
  out_for_delivery: "En reparto",
  pending: "Pendiente",
  preparing: "En preparación",
  ready: "Listo",
  scheduled: "Programada"
};

const NEXT_STATUSES = {
  paid: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  pending_payment: ["cancelled"]
};

function orderReference(orderId) {
  const compact = String(orderId || "").replaceAll("-", "").slice(0, 8).toUpperCase();
  return compact ? `#${compact}` : "Pedido";
}

function formatClp(value) {
  return new Intl.NumberFormat("es-CL", {
    currency: "CLP",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(Number(value || 0));
}

function formatDate(value, {withTime = true} = {}) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Por confirmar";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    ...(withTime ? {timeStyle: "short"} : {}),
    timeZone: "America/Santiago"
  }).format(date);
}

function humanizePaymentMethod(payment) {
  if (!payment?.providerPaymentId) return "Sin pago registrado";

  const method = String(payment.paymentMethodId || "").replaceAll("_", " ").trim();
  const type = String(payment.paymentTypeId || "").replaceAll("_", " ").trim();
  const base = [method, type].filter(Boolean).join(" · ");
  const installments = Number(payment.installments || 0);

  return [base || "Mercado Pago", installments > 1 ? `${installments} cuotas` : ""].filter(Boolean).join(" · ");
}

function normalizeWhatsAppPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("56")) return digits;
  if (digits.length === 9 && digits.startsWith("9")) return `56${digits}`;
  return digits;
}

function buildCustomerMessage(order) {
  const customer = order.customer || {};
  const name = customer.name ? ` ${customer.name}` : "";
  const status = ORDER_STATUS_LABELS[order.status] || "actualizado";
  const mode = customer.mode === "pickup" ? "retiro" : "despacho";

  return `Hola${name}, te escribimos desde Fullness Lab por tu pedido ${orderReference(order.id)}. Su estado es: ${status}. Estamos coordinando ${mode}. Cualquier duda, responde por aquí.`;
}

function customerAddress(customer) {
  if (customer?.mode === "pickup") return "Retiro en local";
  return [customer?.address, customer?.comuna].filter(Boolean).join(", ") || "Dirección por confirmar";
}

function isPendingOrder(order) {
  return !["delivered", "cancelled", "refunded"].includes(order.status);
}

function statusLabel(status) {
  return ORDER_STATUS_LABELS[status] || "Pendiente";
}

function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || "Pendiente";
}

function deliveryStatusLabel(status) {
  return DELIVERY_STATUS_LABELS[status] || "Pendiente";
}

export function OrderOperationsAdmin({
  actionKey,
  error,
  filters,
  loading,
  message,
  onFiltersChange,
  onRefresh,
  onRefund,
  onSelectOrder,
  onUpdateStatus,
  orders,
  selectedOrderId
}) {
  const [nextStatus, setNextStatus] = useState("");
  const filteredOrders = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase("es");

    return orders.filter((order) => {
      if (filters.progress === "pending" && !isPendingOrder(order)) return false;
      if (filters.progress === "completed" && order.status !== "delivered") return false;
      if (filters.payment !== "all" && order.paymentStatus !== filters.payment) return false;
      if (!query) return true;

      return [
        order.id,
        order.customer?.name,
        order.customer?.email,
        order.customer?.phone,
        order.customer?.address,
        order.customer?.comuna,
        ...(order.items || []).map((item) => item.productName)
      ].some((value) => String(value || "").toLocaleLowerCase("es").includes(query));
    });
  }, [filters, orders]);

  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId) || filteredOrders[0] || null;
  const allowedStatuses = selectedOrder ? NEXT_STATUSES[selectedOrder.status] || [] : [];

  useEffect(() => {
    setNextStatus("");
  }, [selectedOrder?.id]);

  const counts = useMemo(() => ({
    completed: orders.filter((order) => order.status === "delivered").length,
    pending: orders.filter(isPendingOrder).length,
    paid: orders.filter((order) => order.paymentStatus === "approved").length
  }), [orders]);

  const customerMessage = selectedOrder ? buildCustomerMessage(selectedOrder) : "";
  const whatsappPhone = normalizeWhatsAppPhone(selectedOrder?.customer?.phone);
  const email = String(selectedOrder?.customer?.email || "").trim();
  const mailSubject = selectedOrder ? `Actualización de tu pedido Fullness Lab ${orderReference(selectedOrder.id)}` : "";
  const mailtoHref = email
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(customerMessage)}`
    : "";
  const whatsappHref = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(customerMessage)}`
    : "";
  const payment = selectedOrder?.payment || null;
  const refundable = Boolean(selectedOrder?.canRefund && payment?.providerPaymentId);

  return (
    <section className="backoffice-side-panel backoffice-module-panel order-operations-panel" aria-labelledby="orders-title">
      <div className="backoffice-catalog-heading order-operations-heading">
        <div>
          <p className="eyebrow">Operación comercial</p>
          <h3 id="orders-title">Pedidos</h3>
          <p>Gestiona cada pedido desde el pago hasta su entrega.</p>
        </div>
        <button className="backoffice-command" type="button" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={17} className={loading ? "is-spinning" : ""} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className="order-status-overview" aria-label="Resumen de pedidos">
        <span><ClockBadge /><i>{counts.pending}</i> pendientes</span>
        <span><CheckCircle2 size={17} /><i>{counts.completed}</i> completados</span>
        <span><CreditCard size={17} /><i>{counts.paid}</i> pagos aprobados</span>
      </div>

      <div className="order-filters" aria-label="Buscar y filtrar pedidos">
        <label className="order-search-field">
          <span className="sr-only">Buscar pedidos</span>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onFiltersChange({...filters, query: event.target.value})}
            placeholder="Buscar cliente, correo, pedido o producto"
          />
        </label>
        <label>
          <span>Avance</span>
          <select value={filters.progress} onChange={(event) => onFiltersChange({...filters, progress: event.target.value})}>
            <option value="pending">Pendientes</option>
            <option value="all">Todos</option>
            <option value="completed">Completados</option>
          </select>
        </label>
        <label>
          <span>Pago</span>
          <select value={filters.payment} onChange={(event) => onFiltersChange({...filters, payment: event.target.value})}>
            <option value="all">Todos los pagos</option>
            <option value="approved">Aprobado</option>
            <option value="pending">Pendiente</option>
            <option value="rejected">Rechazado</option>
            <option value="refunded">Reembolsado</option>
          </select>
        </label>
      </div>

      {(error || message) && (
        <p className={`backoffice-alert ${error ? "is-error" : "is-success"}`} role="status">
          {error || message}
        </p>
      )}

      <div className="order-workbench">
        <div className="order-list" aria-label="Listado de pedidos">
          <div className="order-list-head">
            <span>{filteredOrders.length} pedidos</span>
            <span>Estado y pago</span>
          </div>
          {loading && orders.length === 0 ? (
            <div className="order-list-empty">Cargando pedidos...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="order-list-empty">No encontramos pedidos con estos filtros.</div>
          ) : (
            filteredOrders.map((order) => (
              <button
                className={`order-list-row ${selectedOrder?.id === order.id ? "is-active" : ""}`}
                key={order.id}
                type="button"
                onClick={() => onSelectOrder(order.id)}
              >
                <span className="order-list-primary">
                  <i>{orderReference(order.id)}</i>
                  <strong>{order.customer?.name || "Cliente por confirmar"}</strong>
                  <small>{formatDate(order.orderedAt, {withTime: false})} · {formatClp(order.totalClp)}</small>
                </span>
                <span className="order-list-statuses">
                  <OrderStatusPill status={order.status} />
                  <PaymentStatusPill status={order.paymentStatus} />
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))
          )}
        </div>

        <aside className="order-detail-panel" aria-live="polite">
          {!selectedOrder ? (
            <div className="order-detail-empty">
              <PackageCheck size={27} />
              <p>Selecciona un pedido para revisar su información.</p>
            </div>
          ) : (
            <>
              <header className="order-detail-header">
                <div>
                  <p className="eyebrow">Pedido {orderReference(selectedOrder.id)}</p>
                  <h4>{selectedOrder.customer?.name || "Cliente por confirmar"}</h4>
                  <span>{formatDate(selectedOrder.orderedAt)}</span>
                </div>
                <div className="order-detail-statuses">
                  <OrderStatusPill status={selectedOrder.status} />
                  <PaymentStatusPill status={selectedOrder.paymentStatus} />
                </div>
              </header>

              <section className="order-detail-section" aria-labelledby="order-customer-title">
                <div className="order-detail-section-heading">
                  <span><MapPin size={17} /> Cliente y entrega</span>
                  <span>{selectedOrder.customer?.mode === "pickup" ? "Retiro" : "Despacho"}</span>
                </div>
                <dl className="order-customer-grid">
                  <div><dt>Correo</dt><dd>{email || "Por confirmar"}</dd></div>
                  <div><dt>Teléfono</dt><dd>{selectedOrder.customer?.phone || "Por confirmar"}</dd></div>
                  <div className="is-wide"><dt>Dirección</dt><dd>{customerAddress(selectedOrder.customer)}</dd></div>
                  {selectedOrder.customer?.instructions && <div className="is-wide"><dt>Indicaciones</dt><dd>{selectedOrder.customer.instructions}</dd></div>}
                </dl>
                <div className="order-contact-actions" aria-label="Contactar al cliente">
                  {whatsappHref ? (
                    <a href={whatsappHref} target="_blank" rel="noreferrer">
                      <MessageCircle size={16} /> WhatsApp <ExternalLink size={14} />
                    </a>
                  ) : <span className="is-unavailable"><MessageCircle size={16} /> Sin teléfono</span>}
                  {mailtoHref ? (
                    <a href={mailtoHref}>
                      <Mail size={16} /> Correo <ExternalLink size={14} />
                    </a>
                  ) : <span className="is-unavailable"><Mail size={16} /> Sin correo</span>}
                </div>
              </section>

              <section className="order-detail-section" aria-labelledby="order-items-title">
                <div className="order-detail-section-heading">
                  <span id="order-items-title"><PackageCheck size={17} /> Contenido del pedido</span>
                  <span>{formatClp(selectedOrder.totalClp)}</span>
                </div>
                <ul className="order-items-list">
                  {(selectedOrder.items || []).map((item) => (
                    <li key={item.id}>
                      <span>{item.quantity}x {item.productName || "Producto"}</span>
                      <span>{formatClp(item.totalClp)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="order-detail-section" aria-labelledby="order-payment-title">
                <div className="order-detail-section-heading">
                  <span id="order-payment-title"><CreditCard size={17} /> Pago</span>
                  <PaymentStatusPill status={selectedOrder.paymentStatus} />
                </div>
                <dl className="order-payment-grid">
                  <div><dt>Medio</dt><dd>{humanizePaymentMethod(payment)}</dd></div>
                  <div><dt>Proveedor</dt><dd>{payment?.provider === "mercado_pago" ? "Mercado Pago" : "Por confirmar"}</dd></div>
                  <div><dt>ID de pago</dt><dd>{payment?.providerPaymentId || "Por confirmar"}</dd></div>
                  <div><dt>Fecha de pago</dt><dd>{payment?.paidAt ? formatDate(payment.paidAt) : "Pendiente"}</dd></div>
                </dl>
              </section>

              <section className="order-detail-section order-actions-section" aria-labelledby="order-actions-title">
                <div className="order-detail-section-heading">
                  <span id="order-actions-title"><Truck size={17} /> Preparación y entrega</span>
                  <span>{deliveryStatusLabel(selectedOrder.deliveryStatus)}</span>
                </div>
                {allowedStatuses.length > 0 ? (
                  <div className="order-status-action">
                    <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} aria-label="Nuevo estado del pedido">
                      <option value="">Cambiar estado...</option>
                      {allowedStatuses.map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}
                    </select>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => onUpdateStatus(selectedOrder, nextStatus)}
                      disabled={!nextStatus || actionKey === `status:${selectedOrder.id}`}
                    >
                      {actionKey === `status:${selectedOrder.id}` ? <RefreshCw size={17} className="is-spinning" /> : <Truck size={17} />}
                      Actualizar estado
                    </button>
                  </div>
                ) : (
                  <p className="order-action-note">Este pedido ya no tiene cambios de avance disponibles.</p>
                )}
                <div className="order-refund-action">
                  <div>
                    <span>Reembolso completo</span>
                    <small>{refundable ? "Devuelve el total por Mercado Pago." : "Disponible sólo con un pago aprobado."}</small>
                  </div>
                  <button
                    className="backoffice-destructive-button"
                    type="button"
                    disabled={!refundable || actionKey === `refund:${selectedOrder.id}`}
                    onClick={() => onRefund(selectedOrder)}
                  >
                    {actionKey === `refund:${selectedOrder.id}` ? <RefreshCw size={17} className="is-spinning" /> : <RotateCcw size={17} />}
                    Reembolsar
                  </button>
                </div>
              </section>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function ClockBadge() {
  return <span className="order-overview-clock" aria-hidden="true"><span /></span>;
}

function OrderStatusPill({status}) {
  return <span className={`order-status-pill is-${status}`}>{statusLabel(status)}</span>;
}

function PaymentStatusPill({status}) {
  return <span className={`payment-status-pill is-${status}`}>{paymentStatusLabel(status)}</span>;
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tags,
  Trash2,
  X
} from "lucide-react";

const acceptedImageTypes = "image/avif,image/gif,image/jpeg,image/png,image/webp";

export class BackofficeModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  reset = () => {
    this.setState({ hasError: false });
    this.props.onRecover?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="backoffice-module-recovery" role="alert">
          <p className="eyebrow">Parámetros</p>
          <h3>No pudimos mostrar este módulo</h3>
          <p>Tu sesión sigue activa. Vuelve a abrir los parámetros para continuar.</p>
          <button className="primary-button" type="button" onClick={this.reset}>Reabrir parámetros</button>
        </section>
      );
    }

    return this.props.children;
  }
}

function cleanText(value) {
  return String(value || "").trim();
}

function preserveInputText(value) {
  return value === null || value === undefined ? "" : String(value);
}

function slugify(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function normalizeAssignments(value, definitions) {
  const definitionById = new Map(definitions.map((item) => [item.id, item]));

  return (Array.isArray(value) ? value : [])
    .map((assignment) => {
      const benefitId = cleanText(assignment?.benefitId || assignment?.benefit_id || assignment?.id);
      const definition = definitionById.get(benefitId);
      const name = definition?.name || cleanText(assignment?.name);

      if (!benefitId && !name) return null;

      return {
        benefitId: definition?.id || benefitId,
        slug: definition?.slug || cleanText(assignment?.slug) || slugify(name),
        name,
        iconUrl: definition?.iconUrl || cleanText(assignment?.iconUrl || assignment?.icon_url),
        iconStoragePath: definition?.iconStoragePath || cleanText(assignment?.iconStoragePath || assignment?.icon_storage_path),
        defaultDescription: definition?.defaultDescription || cleanText(assignment?.defaultDescription || assignment?.default_description),
        explanation: preserveInputText(assignment?.explanation ?? assignment?.description)
      };
    })
    .filter(Boolean);
}

function findMatchingDefinition(definitions, name) {
  const cleanedName = cleanText(name).toLocaleLowerCase("es");
  const slug = slugify(name);

  return definitions.find((definition) => (
    definition.slug === slug || cleanText(definition.name).toLocaleLowerCase("es") === cleanedName
  ));
}

const benefitImagePromptTemplate = `Diseña un ícono cuadrado 1:1 para el beneficio "[NOMBRE DEL BENEFICIO]" de Fullness Lab. Fullness Lab es una marca chilena de mealpreps de alimentación consciente: comida real, ingredientes naturales y nutrición funcional para el bienestar diario.

Traduce el beneficio a una sola metáfora natural y alimentaria, inspirada en un ingrediente, una planta, una raíz, una hoja, una semilla o un gesto de cuidado. No ilustres el concepto de forma literal ni uses iconografía genérica. El resultado debe sentirse parte de una colección editorial botánica ya existente: simple, serena y fácil de reconocer a tamaño pequeño.

Ejemplos de criterio: para "Fuerza", representa dos manos estilizadas sosteniendo una raíz o alimento natural pesado, no un bíceps ni un árbol complejo. Para "Regeneración Celular", representa una hélice biológica mínima formada por una rama joven y dos hojas, no una cadena científica detallada.

Composición: un motivo central, máximo tres elementos principales, mucho espacio vacío y silueta clara. Ilustración monocromática en tinta burdeos #762531, línea orgánica fina y continua, estética editorial botánica contemporánea. Fondo transparente. Sin texto, letras, números, logo, marco, sombras, degradados, acuarela, color adicional, escena completa, árbol frondoso, exceso de ramas ni detalles pequeños. Entrega solamente el ícono como PNG con transparencia.`;

function buildBenefitImagePrompt(name) {
  return benefitImagePromptTemplate.replace("[NOMBRE DEL BENEFICIO]", cleanText(name) || "[NOMBRE DEL BENEFICIO]");
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const temporaryField = document.createElement("textarea");
    temporaryField.value = value;
    temporaryField.setAttribute("readonly", "");
    temporaryField.style.position = "fixed";
    temporaryField.style.opacity = "0";
    document.body.appendChild(temporaryField);
    temporaryField.select();
    const copied = document.execCommand("copy");
    temporaryField.remove();
    return copied;
  }
}

function QuickParameterDialog({
  kind,
  definitions,
  onClose,
  onCreate,
  onChoose,
  onUploadIcon
}) {
  const closeRef = useRef(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const iconOptions = useMemo(
    () => definitions.filter((definition) => definition.iconUrl),
    [definitions]
  );
  const [selectedIconId, setSelectedIconId] = useState("");
  const [customIcon, setCustomIcon] = useState(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [promptCopyMessage, setPromptCopyMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isBenefit = kind === "benefit";
  const singular = isBenefit ? "beneficio" : "tag";
  const dialogTitleId = `quick-${kind}-title`;
  const populatedBenefitImagePrompt = buildBenefitImagePrompt(name);

  useEffect(() => {
    setName("");
    setDescription("");
    setSelectedIconId(iconOptions[0]?.id || "");
    setCustomIcon(null);
    setUploadingIcon(false);
    setPromptCopyMessage("");
    setSaving(false);
    setError("");
    window.requestAnimationFrame(() => closeRef.current?.focus());
  }, [iconOptions, kind]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving && !uploadingIcon) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving, uploadingIcon]);

  async function uploadCustomIcon(event) {
    const file = event.target.files?.[0];
    if (!file || !onUploadIcon) return;

    setUploadingIcon(true);
    setError("");

    try {
      const uploaded = await onUploadIcon(file);
      if (!uploaded?.photoUrl) {
        setError("No pudimos subir la imagen. Intenta nuevamente.");
        return;
      }

      setCustomIcon({
        iconUrl: uploaded.photoUrl,
        iconStoragePath: uploaded.photoStoragePath || ""
      });
      setSelectedIconId("");
    } catch {
      setError("No pudimos subir la imagen. Intenta nuevamente.");
    } finally {
      setUploadingIcon(false);
      event.target.value = "";
    }
  }

  async function copyBenefitImagePrompt() {
    const copied = await copyText(populatedBenefitImagePrompt);
    setPromptCopyMessage(copied ? "Prompt copiado." : "Selecciona el texto para copiarlo.");
  }

  async function submitQuickDefinition() {
    const trimmedName = cleanText(name);

    if (!trimmedName) {
      setError(`Escribe el nombre del ${singular}.`);
      return;
    }

    const existingDefinition = findMatchingDefinition(definitions, trimmedName);
    if (existingDefinition) {
      onChoose(existingDefinition);
      onClose();
      return;
    }

    const selectedIcon = customIcon || iconOptions.find((definition) => definition.id === selectedIconId);
    if (isBenefit && !selectedIcon) {
      setError("Elige o sube una imagen para continuar.");
      return;
    }

    setSaving(true);
    setError("");
    let result;

    try {
      result = await onCreate({
        name: trimmedName,
        defaultDescription: cleanText(description),
        iconUrl: selectedIcon?.iconUrl || "",
        iconStoragePath: selectedIcon?.iconStoragePath || "",
        displayOrder: definitions.reduce(
          (highest, definition) => Math.max(highest, Number(definition.displayOrder || 0)),
          0
        ) + 10,
        isActive: true
      });
    } catch {
      result = { data: null, error: `No pudimos crear el ${singular}. Intenta nuevamente.` };
    }

    setSaving(false);

    if (!result?.data) {
      setError(result?.error || `No pudimos crear el ${singular}. Intenta nuevamente.`);
      return;
    }

    onChoose(result.data);
    onClose();
  }

  function handleQuickDefinitionKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey || event.target?.tagName !== "INPUT" || event.target?.type !== "text") return;

    event.preventDefault();
    event.stopPropagation();
    void submitQuickDefinition();
  }

  return (
    <div
      className="overlay quick-parameter-lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving && !uploadingIcon) onClose();
      }}
    >
      <section className="quick-parameter-dialog" onKeyDown={handleQuickDefinitionKeyDown}>
        <header>
          <div>
            <p className="eyebrow">Mientras editas este mealprep</p>
            <h3 id={dialogTitleId}>Nuevo {singular}</h3>
          </div>
          <button
            ref={closeRef}
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label={`Cerrar nuevo ${singular}`}
            disabled={saving || uploadingIcon}
          >
            <X size={19} />
          </button>
        </header>

        <p>
          {isBenefit
            ? "Quedará disponible para todos los mealpreps. Puedes completar su iconografía o texto más tarde en Parámetros."
            : "Quedará disponible para todos los mealpreps y se agregará a este mealprep al guardarlo."}
        </p>

        <label>
          Nombre
          <input
            autoComplete="off"
            autoFocus
            disabled={saving || uploadingIcon}
            onChange={(event) => setName(event.target.value)}
            placeholder={isBenefit ? "Salud digestiva..." : "Alto en hierro..."}
            value={name}
          />
        </label>

        {isBenefit && (
          <>
            <label>
              Descripcion general <small>(opcional)</small>
              <textarea
                disabled={saving || uploadingIcon}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explica brevemente por qué este beneficio puede aplicar a un mealprep..."
                rows="3"
                value={description}
              />
            </label>

            <div className="quick-parameter-image-tools">
              {onUploadIcon && (
                <label className="quick-parameter-upload">
                  <ImagePlus size={17} aria-hidden="true" />
                  {uploadingIcon ? "Subiendo imagen..." : "Subir imagen personalizada"}
                  <input type="file" accept={acceptedImageTypes} onChange={uploadCustomIcon} disabled={saving || uploadingIcon} />
                </label>
              )}
              {customIcon && (
                <div className="quick-parameter-custom-preview">
                  <img src={customIcon.iconUrl} alt="Imagen personalizada seleccionada" width="52" height="52" />
                  <span>Imagen personalizada seleccionada</span>
                </div>
              )}
              <div className="quick-parameter-ai-prompt">
                <p>Si vas a usar IA para la imagen, copia este prompt base</p>
                <textarea aria-label="Prompt base para imagen de beneficio" readOnly rows="5" value={populatedBenefitImagePrompt} />
                <button type="button" onClick={copyBenefitImagePrompt}>
                  <Copy size={15} aria-hidden="true" />
                  Copiar prompt
                </button>
                {promptCopyMessage && <span role="status">{promptCopyMessage}</span>}
              </div>
            </div>

            <fieldset className="quick-parameter-icons">
              <legend>Simbolo ilustrado</legend>
              <div>
                {iconOptions.map((definition) => {
                  const controlId = `quick-benefit-icon-${definition.id}`;
                  const selected = selectedIconId === definition.id;

                  return (
                    <label className={selected ? "is-selected" : ""} htmlFor={controlId} key={definition.id}>
                      <input
                        checked={selected}
                        disabled={saving || uploadingIcon}
                        id={controlId}
                        name="quickBenefitIcon"
                        onChange={() => {
                          setCustomIcon(null);
                          setSelectedIconId(definition.id);
                        }}
                        type="radio"
                      />
                      <img src={definition.iconUrl} alt="" width="48" height="48" />
                      <span>{definition.name}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}

        {error && <p className="quick-parameter-error" role="alert">{error}</p>}

        <div className="quick-parameter-actions">
          <button type="button" onClick={onClose} disabled={saving || uploadingIcon}>Cancelar</button>
          <button className="primary-button" type="button" onClick={() => void submitQuickDefinition()} disabled={saving || uploadingIcon}>
            {saving ? "Guardando..." : `Crear y agregar ${singular}`}
          </button>
        </div>
      </section>
    </div>
  );
}

export function BenefitAssignmentEditor({
  definitions,
  value,
  onChange,
  legend = "Beneficios del mealprep",
  idPrefix = "benefit",
  onCreateQuick,
  onUploadIcon
}) {
  const activeDefinitions = definitions.filter((item) => item.isActive);
  const assignments = useMemo(
    () => normalizeAssignments(value, definitions),
    [definitions, value]
  );
  const selectedIds = new Set(assignments.map((item) => item.benefitId));
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickNotice, setQuickNotice] = useState("");

  function toggleBenefit(definition) {
    if (selectedIds.has(definition.id)) {
      onChange(assignments.filter((item) => item.benefitId !== definition.id));
      return;
    }

    onChange([
      ...assignments,
      {
        benefitId: definition.id,
        slug: definition.slug,
        name: definition.name,
        iconUrl: definition.iconUrl,
        iconStoragePath: definition.iconStoragePath,
        defaultDescription: definition.defaultDescription,
        explanation: ""
      }
    ]);
  }

  function updateExplanation(benefitId, explanation) {
    onChange(assignments.map((item) => (
      item.benefitId === benefitId ? { ...item, explanation } : item
    )));
  }

  function addQuickBenefit(definition) {
    if (selectedIds.has(definition.id)) {
      setQuickNotice(`“${definition.name}” ya estaba aplicado a este mealprep.`);
      return;
    }

    toggleBenefit(definition);
    setQuickNotice(`“${definition.name}” se agregó a este mealprep.`);
  }

  return (
    <fieldset className="benefit-assignment-editor">
      <legend className="selector-legend">
        <span>{legend}</span>
        {onCreateQuick && (
          <button type="button" onClick={() => setQuickCreateOpen(true)}>
            <Plus size={14} aria-hidden="true" />
            Crear beneficio
          </button>
        )}
      </legend>
      <div className="benefit-choice-grid">
        {activeDefinitions.map((definition) => {
          const selected = selectedIds.has(definition.id);
          const controlId = `${idPrefix}-${definition.id}`;

          return (
            <label className={`benefit-choice ${selected ? "is-selected" : ""}`} htmlFor={controlId} key={definition.id}>
              <input
                id={controlId}
                type="checkbox"
                checked={selected}
                onChange={() => toggleBenefit(definition)}
              />
              <img src={definition.iconUrl} alt="" width="80" height="80" loading="lazy" />
              <span>{definition.name}</span>
              <Check size={15} aria-hidden="true" />
            </label>
          );
        })}
      </div>
      {quickNotice && <p className="quick-parameter-notice" role="status">{quickNotice}</p>}

      {assignments.length > 0 && (
        <div className="benefit-explanation-stack">
          {assignments.map((assignment) => {
            const assignmentKey = assignment.benefitId || assignment.slug;
            const explanationLabelId = `${idPrefix}-${assignmentKey}-explanation-label`;

            return (
              <div className="benefit-explanation-field" key={assignmentKey}>
                <img src={assignment.iconUrl} alt="" width="64" height="64" loading="lazy" />
                <span id={explanationLabelId}>
                  <strong>{assignment.name}</strong>
                  <small>Por qué aplica en este mealprep</small>
                </span>
                <textarea
                  aria-labelledby={explanationLabelId}
                  value={assignment.explanation}
                  onChange={(event) => updateExplanation(assignment.benefitId, event.target.value)}
                  placeholder={`Describe qué ingredientes hacen que este mealprep sea ${assignment.name.toLocaleLowerCase("es")} y por qué.`}
                  rows="3"
                />
              </div>
            );
          })}
        </div>
      )}

      {quickCreateOpen && (
        <QuickParameterDialog
          kind="benefit"
          definitions={definitions}
          onChoose={addQuickBenefit}
          onClose={() => setQuickCreateOpen(false)}
          onCreate={onCreateQuick}
          onUploadIcon={onUploadIcon}
        />
      )}
    </fieldset>
  );
}

export function TagSelector({
  definitions,
  value,
  onChange,
  legend = "Tags nutricionales",
  idPrefix = "tag",
  onCreateQuick
}) {
  const selectedIds = new Set(Array.isArray(value) ? value : []);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickNotice, setQuickNotice] = useState("");

  function toggleTag(tag) {
    const next = selectedIds.has(tag.id)
      ? [...selectedIds].filter((id) => id !== tag.id)
      : [...selectedIds, tag.id];
    onChange(next);
  }

  function addQuickTag(tag) {
    if (selectedIds.has(tag.id)) {
      setQuickNotice(`“${tag.name}” ya estaba aplicado a este mealprep.`);
      return;
    }

    toggleTag(tag);
    setQuickNotice(`“${tag.name}” se agregó a este mealprep.`);
  }

  return (
    <fieldset className="tag-selector">
      <legend className="selector-legend">
        <span>{legend}</span>
        {onCreateQuick && (
          <button type="button" onClick={() => setQuickCreateOpen(true)}>
            <Plus size={14} aria-hidden="true" />
            Crear tag
          </button>
        )}
      </legend>
      <div className="tag-choice-grid">
        {definitions.filter((item) => item.isActive).map((tag) => {
          const controlId = `${idPrefix}-${tag.id}`;

          return (
            <label className={selectedIds.has(tag.id) ? "is-selected" : ""} htmlFor={controlId} key={tag.id}>
              <input
                id={controlId}
                type="checkbox"
                checked={selectedIds.has(tag.id)}
                onChange={() => toggleTag(tag)}
              />
              <span>{tag.name}</span>
              <Check size={14} aria-hidden="true" />
            </label>
          );
        })}
      </div>
      {quickNotice && <p className="quick-parameter-notice" role="status">{quickNotice}</p>}

      {quickCreateOpen && (
        <QuickParameterDialog
          kind="tag"
          definitions={definitions}
          onChoose={addQuickTag}
          onClose={() => setQuickCreateOpen(false)}
          onCreate={onCreateQuick}
        />
      )}
    </fieldset>
  );
}

export function BenefitIconList({
  benefits,
  contextTitle,
  onOpenBenefit,
  limit = 4,
  compact = false
}) {
  const visibleBenefits = (Array.isArray(benefits) ? benefits : [])
    .filter((benefit) => benefit?.name && benefit?.iconUrl)
    .slice(0, limit);

  if (visibleBenefits.length === 0) return null;

  return (
    <div className={`benefit-icon-list ${compact ? "is-compact" : ""}`} aria-label="Beneficios del mealprep">
      {visibleBenefits.map((benefit) => (
        <button
          type="button"
          key={benefit.benefitId || benefit.slug || benefit.name}
          onClick={(event) => {
            event.stopPropagation();
            onOpenBenefit({ benefit, contextTitle });
          }}
          aria-label={`Ver por qué ${contextTitle} es ${benefit.name.toLocaleLowerCase("es")}`}
        >
          <img src={benefit.iconUrl} alt="" width="76" height="76" loading="lazy" />
          <span>{benefit.name}</span>
        </button>
      ))}
    </div>
  );
}

export function BenefitDetailLightbox({ preview, onClose }) {
  const closeRef = useRef(null);
  const benefit = preview?.benefit;

  useEffect(() => {
    if (!preview) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, preview]);

  if (!benefit) return null;

  const sources = Array.isArray(benefit.sources)
    ? benefit.sources.filter((source) => source.mealName || source.explanation)
    : [];
  const explanation = cleanText(benefit.explanation) || cleanText(benefit.defaultDescription);

  return (
    <div
      className="overlay benefit-detail-lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby="benefit-detail-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="benefit-detail-panel">
        <button
          ref={closeRef}
          className="icon-button close"
          type="button"
          onClick={onClose}
          aria-label="Cerrar beneficio"
        >
          <X size={22} />
        </button>
        <figure>
          <img src={benefit.iconUrl} alt="" width="320" height="320" />
        </figure>
        <div>
          <p className="eyebrow">Beneficio del mealprep</p>
          <h2 id="benefit-detail-title">{benefit.name}</h2>
          {preview.contextTitle && <p className="benefit-detail-context">En {preview.contextTitle}</p>}

          {sources.length > 0 ? (
            <div className="benefit-source-list">
              {sources.map((source, index) => (
                <article key={`${source.mealName}-${index}`}>
                  {source.mealName && <h3>{source.mealName}</h3>}
                  <p>{source.explanation || benefit.defaultDescription}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="benefit-detail-copy">{explanation || "Información en preparación."}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function createBenefitForm(nextOrder = 10) {
  return {
    id: "",
    name: "",
    slug: "",
    iconUrl: "",
    iconStoragePath: "",
    defaultDescription: "",
    displayOrder: String(nextOrder),
    isActive: true
  };
}

function createTagForm(nextOrder = 10) {
  return {
    id: "",
    name: "",
    slug: "",
    displayOrder: String(nextOrder),
    isActive: true
  };
}

export function CatalogParametersAdmin({
  benefits,
  tags,
  loading,
  saving,
  message,
  error,
  onRefresh,
  onSaveBenefit,
  onDeleteBenefit,
  onSaveTag,
  onDeleteTag,
  onUploadBenefitIcon
}) {
  const [benefitForm, setBenefitForm] = useState(() => createBenefitForm(benefits.length * 10 + 10));
  const [tagForm, setTagForm] = useState(() => createTagForm(tags.length * 10 + 10));
  const [activeParameterTab, setActiveParameterTab] = useState("benefits");
  const [benefitSearch, setBenefitSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [benefitPromptCopyMessage, setBenefitPromptCopyMessage] = useState("");
  const populatedBenefitImagePrompt = buildBenefitImagePrompt(benefitForm.name);
  const filteredBenefits = useMemo(() => {
    const query = cleanText(benefitSearch).toLocaleLowerCase("es");
    if (!query) return benefits;

    return benefits.filter((benefit) => [benefit.name, benefit.slug, benefit.defaultDescription]
      .some((value) => cleanText(value).toLocaleLowerCase("es").includes(query)));
  }, [benefits, benefitSearch]);
  const filteredTags = useMemo(() => {
    const query = cleanText(tagSearch).toLocaleLowerCase("es");
    if (!query) return tags;

    return tags.filter((tag) => [tag.name, tag.slug]
      .some((value) => cleanText(value).toLocaleLowerCase("es").includes(query)));
  }, [tags, tagSearch]);

  function editBenefit(benefit) {
    setBenefitForm({
      ...benefit,
      displayOrder: String(benefit.displayOrder)
    });
  }

  function editTag(tag) {
    setTagForm({
      ...tag,
      displayOrder: String(tag.displayOrder)
    });
  }

  async function submitBenefit(event) {
    event.preventDefault();
    setActionError("");

    try {
      const saved = await onSaveBenefit(benefitForm);
      if (saved) setBenefitForm(createBenefitForm(benefits.length * 10 + 20));
    } catch {
      setActionError("No pudimos guardar el beneficio. Revisa tu conexión e inténtalo nuevamente.");
    }
  }

  async function submitTag(event) {
    event.preventDefault();
    setActionError("");

    try {
      const saved = await onSaveTag(tagForm);
      if (saved) setTagForm(createTagForm(tags.length * 10 + 20));
    } catch {
      setActionError("No pudimos guardar el tag. Revisa tu conexión e inténtalo nuevamente.");
    }
  }

  async function uploadBenefitIcon(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setActionError("");

    try {
      const uploaded = await onUploadBenefitIcon(file);
      if (!uploaded?.photoUrl) {
        setActionError("No pudimos subir el ícono. Inténtalo nuevamente; tu beneficio sigue intacto.");
        return;
      }

      setBenefitForm((current) => ({
        ...current,
        iconUrl: uploaded.photoUrl,
        iconStoragePath: uploaded.photoStoragePath
      }));
    } catch {
      setActionError("No pudimos subir el ícono. Inténtalo nuevamente; tu beneficio sigue intacto.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function copyParameterBenefitImagePrompt() {
    const copied = await copyText(populatedBenefitImagePrompt);
    setBenefitPromptCopyMessage(copied ? "Prompt copiado." : "Selecciona el texto para copiarlo.");
  }

  return (
    <section className="catalog-parameters-admin" aria-labelledby="catalog-parameters-title">
      <header className="catalog-parameters-heading">
        <div>
          <p className="eyebrow">Parámetros de mealpreps</p>
          <h3 id="catalog-parameters-title">Beneficios y tags</h3>
        </div>
        <button className="icon-button" type="button" onClick={onRefresh} aria-label="Actualizar parámetros" disabled={loading}>
          <RefreshCw size={18} />
        </button>
      </header>

      {(actionError || message || error) && (
        <p className={`backoffice-alert ${actionError || error ? "is-error" : "is-success"}`} role="status">
          {actionError || error || message}
        </p>
      )}

      <div className="catalog-parameter-tabs" role="tablist" aria-label="Tipo de parámetro">
        <button
          className={activeParameterTab === "benefits" ? "is-active" : ""}
          type="button"
          role="tab"
          aria-selected={activeParameterTab === "benefits"}
          aria-controls="parameter-benefits"
          onClick={() => setActiveParameterTab("benefits")}
        >
          Beneficios
        </button>
        <button
          className={activeParameterTab === "tags" ? "is-active" : ""}
          type="button"
          role="tab"
          aria-selected={activeParameterTab === "tags"}
          aria-controls="parameter-tags"
          onClick={() => setActiveParameterTab("tags")}
        >
          Tags
        </button>
      </div>

      <div className="catalog-parameters-layout">
        {activeParameterTab === "benefits" && (
        <section className="parameter-section" id="parameter-benefits" role="tabpanel">
          <div className="parameter-section-heading">
            <span><ImagePlus size={18} aria-hidden="true" /></span>
            <div>
              <h4>Beneficios ilustrados</h4>
              <p>{benefits.length} símbolos disponibles</p>
            </div>
          </div>

          <label className="parameter-library-search">
            <span>Buscar beneficio</span>
            <div>
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={benefitSearch}
                onChange={(event) => setBenefitSearch(event.target.value)}
                placeholder="Nombre o descripción…"
              />
            </div>
          </label>

          <div className="parameter-benefit-library" aria-label="Beneficios configurados">
            {filteredBenefits.length ? filteredBenefits.map((benefit) => (
              <article className={!benefit.isActive ? "is-inactive" : ""} key={benefit.id}>
                <button type="button" className="parameter-benefit-main" onClick={() => editBenefit(benefit)}>
                  <img src={benefit.iconUrl} alt="" width="92" height="92" loading="lazy" />
                  <span>
                    <strong>{benefit.name}</strong>
                    <small>{benefit.isActive ? "Activo" : "Inactivo"}</small>
                  </span>
                </button>
                <div>
                  <button type="button" onClick={() => editBenefit(benefit)} aria-label={`Editar ${benefit.name}`}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" onClick={() => onDeleteBenefit(benefit)} aria-label={`Eliminar ${benefit.name}`} disabled={saving}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            )) : (
              <p className="parameter-library-empty">No encontramos beneficios con esa búsqueda.</p>
            )}
          </div>

          <form className="parameter-form" onSubmit={submitBenefit}>
            <div className="parameter-form-heading">
              <h4>{benefitForm.id ? "Editar beneficio" : "Nuevo beneficio"}</h4>
              <button type="button" onClick={() => setBenefitForm(createBenefitForm(benefits.length * 10 + 10))} aria-label="Nuevo beneficio">
                <Plus size={17} />
              </button>
            </div>
            <div className="parameter-form-grid">
              <label>
                Nombre
                <input
                  required
                  name="benefitName"
                  value={benefitForm.name}
                  onChange={(event) => setBenefitForm((current) => ({
                    ...current,
                    name: event.target.value,
                    slug: current.id ? current.slug : slugify(event.target.value)
                  }))}
                  placeholder="Salud digestiva…"
                  autoComplete="off"
                />
              </label>
              <label>
                Código interno
                <input
                  name="benefitSlug"
                  value={benefitForm.slug}
                  readOnly
                  aria-readonly="true"
                  placeholder="Se genera desde el nombre"
                  autoComplete="off"
                />
              </label>
              <label>
                Orden
                <input
                  name="benefitOrder"
                  type="number"
                  step="1"
                  value={benefitForm.displayOrder}
                  onChange={(event) => setBenefitForm((current) => ({ ...current, displayOrder: event.target.value }))}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
              <label className="parameter-active-toggle">
                <input
                  name="benefitActive"
                  type="checkbox"
                  checked={benefitForm.isActive}
                  onChange={(event) => setBenefitForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                <span>{benefitForm.isActive ? "Activo" : "Inactivo"}</span>
              </label>
            </div>
            <label>
              Descripción general del beneficio
              <textarea
                name="benefitDescription"
                value={benefitForm.defaultDescription}
                onChange={(event) => setBenefitForm((current) => ({ ...current, defaultDescription: event.target.value }))}
                placeholder="Texto general que verá el cliente si el mealprep aún no tiene una explicación específica…"
                rows="3"
              />
            </label>
            <div className="parameter-icon-control">
              <figure>
                {benefitForm.iconUrl ? (
                  <img src={benefitForm.iconUrl} alt="" width="112" height="112" />
                ) : (
                  <ImagePlus size={28} aria-hidden="true" />
                )}
              </figure>
              <div className="parameter-icon-tools">
                <label className="quick-parameter-upload">
                  <ImagePlus size={17} aria-hidden="true" />
                  {uploading ? "Subiendo imagen..." : "Subir imagen personalizada"}
                  <input type="file" accept={acceptedImageTypes} onChange={uploadBenefitIcon} disabled={uploading || saving} />
                </label>
                <div className="quick-parameter-ai-prompt">
                  <p>Si vas a usar IA para la imagen, copia este prompt base</p>
                  <textarea aria-label="Prompt base para imagen de beneficio" readOnly rows="5" value={populatedBenefitImagePrompt} />
                  <button type="button" onClick={copyParameterBenefitImagePrompt}>
                    <Copy size={15} aria-hidden="true" />
                    Copiar prompt
                  </button>
                  {benefitPromptCopyMessage && <span role="status">{benefitPromptCopyMessage}</span>}
                </div>
                <label className="parameter-icon-url">
                  URL del icono
                  <input
                    required
                    name="benefitIconUrl"
                    type="text"
                    value={benefitForm.iconUrl}
                    onChange={(event) => setBenefitForm((current) => ({ ...current, iconUrl: event.target.value }))}
                    placeholder="/api/media?key=assets%2Fbenefits%2F…"
                    autoComplete="off"
                  />
                </label>
              </div>
            </div>
            <button className="primary-button" type="submit" disabled={saving || uploading}>
              {saving ? <RefreshCw size={17} /> : <Save size={17} />}
              {saving ? "Guardando…" : "Guardar beneficio"}
            </button>
          </form>
        </section>
        )}

        {activeParameterTab === "tags" && (
        <section className="parameter-section" id="parameter-tags" role="tabpanel">
          <div className="parameter-section-heading">
            <span><Tags size={18} aria-hidden="true" /></span>
            <div>
              <h4>Tags nutricionales</h4>
              <p>{tags.length} etiquetas disponibles</p>
            </div>
          </div>

          <label className="parameter-library-search">
            <span>Buscar tag</span>
            <div>
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={tagSearch}
                onChange={(event) => setTagSearch(event.target.value)}
                placeholder="Nombre del tag…"
              />
            </div>
          </label>

          <div className="parameter-tag-library" aria-label="Tags configurados">
            {filteredTags.length ? filteredTags.map((tag) => (
              <article className={!tag.isActive ? "is-inactive" : ""} key={tag.id}>
                <button type="button" onClick={() => editTag(tag)}>
                  <span>{tag.name}</span>
                  <small>{tag.isActive ? "Activo" : "Inactivo"}</small>
                </button>
                <div>
                  <button type="button" onClick={() => editTag(tag)} aria-label={`Editar ${tag.name}`}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" onClick={() => onDeleteTag(tag)} aria-label={`Eliminar ${tag.name}`} disabled={saving}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            )) : (
              <p className="parameter-library-empty">No encontramos tags con esa búsqueda.</p>
            )}
          </div>

          <form className="parameter-form" onSubmit={submitTag}>
            <div className="parameter-form-heading">
              <h4>{tagForm.id ? "Editar tag" : "Nuevo tag"}</h4>
              <button type="button" onClick={() => setTagForm(createTagForm(tags.length * 10 + 10))} aria-label="Nuevo tag">
                <Plus size={17} />
              </button>
            </div>
            <label>
              Nombre
              <input
                required
                name="tagName"
                value={tagForm.name}
                onChange={(event) => setTagForm((current) => ({
                  ...current,
                  name: event.target.value,
                  slug: current.id ? current.slug : slugify(event.target.value)
                }))}
                placeholder="Fuente de hierro…"
                autoComplete="off"
              />
            </label>
            <label>
              Código interno
              <input
                name="tagSlug"
                value={tagForm.slug}
                readOnly
                aria-readonly="true"
                placeholder="Se genera desde el nombre"
                autoComplete="off"
              />
            </label>
            <div className="parameter-form-grid">
              <label>
                Orden
                <input
                  name="tagOrder"
                  type="number"
                  step="1"
                  value={tagForm.displayOrder}
                  onChange={(event) => setTagForm((current) => ({ ...current, displayOrder: event.target.value }))}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
              <label className="parameter-active-toggle">
                <input
                  name="tagActive"
                  type="checkbox"
                  checked={tagForm.isActive}
                  onChange={(event) => setTagForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                <span>{tagForm.isActive ? "Activo" : "Inactivo"}</span>
              </label>
            </div>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <RefreshCw size={17} /> : <Save size={17} />}
              {saving ? "Guardando…" : "Guardar tag"}
            </button>
          </form>
        </section>
        )}
      </div>
    </section>
  );
}

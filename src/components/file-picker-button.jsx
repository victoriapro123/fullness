import { useRef } from "react";

const defaultImageAccept = "image/avif,image/gif,image/jpeg,image/png,image/webp";

/**
 * Keeps file selection independent from surrounding forms and overlays.
 * The native input remains available to the browser, while the visible button
 * gives every image field the same predictable interaction.
 */
export function FilePickerButton({
  accept = defaultImageAccept,
  ariaLabel,
  children,
  className,
  disabled = false,
  inputName,
  onChange
}) {
  const inputRef = useRef(null);

  return (
    <>
      <button
        className={className}
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        className="backoffice-file-input"
        name={inputName}
        type="file"
        accept={accept}
        aria-label={ariaLabel}
        onChange={onChange}
        disabled={disabled}
      />
    </>
  );
}

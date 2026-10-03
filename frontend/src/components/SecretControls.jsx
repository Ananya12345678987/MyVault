/*
 * Small reveal (eye) and copy controls for sensitive values.
 *
 * Plain inline SVG + Tailwind classes on purpose: no icon library is
 * needed for these two buttons. They are reused by the cards now and by
 * the key/value editor and detail view later. (SECRET_MASK and
 * copyToClipboard live in ../lib/secrets.js.)
 */

const BUTTON =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-surface-alt text-text-muted transition-colors hover:border-vault-green hover:text-vault-green disabled:cursor-not-allowed disabled:opacity-50";

function Svg({ children }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function RevealButton({ shown, onClick, disabled }) {
  const label = shown ? "Hide value" : "Reveal value";

  return (
    <button
      type="button"
      className={BUTTON}
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
    >
      <Svg>
        {shown ? (
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </>
        ) : (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </Svg>
    </button>
  );
}

export function CopyButton({ copied, onClick, disabled }) {
  const label = copied ? "Copied" : "Copy value";

  return (
    <button
      type="button"
      className={`${BUTTON} ${copied ? "!border-vault-green !text-vault-green" : ""}`}
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
    >
      <Svg>
        {copied ? (
          <polyline points="20 6 9 17 4 12" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </Svg>
    </button>
  );
}

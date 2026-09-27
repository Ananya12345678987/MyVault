export default function VaultMark({ size = 56, locked = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="26" stroke="#232326" strokeWidth="1.5" />
      <circle cx="28" cy="28" r="19" stroke="#232326" strokeWidth="1.5" />
      <circle
        cx="28"
        cy="28"
        r="10"
        fill={locked ? "none" : "#34A67E"}
        fillOpacity={locked ? 0 : 0.15}
        stroke={locked ? "#8A8A8F" : "#34A67E"}
        strokeWidth="1.5"
      />
      <line x1="28" y1="2" x2="28" y2="9" stroke="#232326" strokeWidth="1.5" />
      <line x1="28" y1="47" x2="28" y2="54" stroke="#232326" strokeWidth="1.5" />
      <line x1="2" y1="28" x2="9" y2="28" stroke="#232326" strokeWidth="1.5" />
      <line x1="47" y1="28" x2="54" y2="28" stroke="#232326" strokeWidth="1.5" />
      <line
        x1="28"
        y1="28"
        x2={locked ? "28" : "33"}
        y2={locked ? "19" : "23"}
        stroke={locked ? "#8A8A8F" : "#34A67E"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
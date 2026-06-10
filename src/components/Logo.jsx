export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Circuit head — Redeintermed logo simplified */}
      <circle cx="100" cy="72" r="40" stroke="#00BFA5" strokeWidth="8" fill="none"/>
      <circle cx="100" cy="72" r="18" fill="#00BFA5" opacity="0.15"/>
      {/* Circuit dots */}
      <circle cx="60"  cy="72" r="5" fill="#00BFA5"/>
      <circle cx="140" cy="72" r="5" fill="#00BFA5"/>
      <circle cx="100" cy="32" r="5" fill="#00BFA5"/>
      <line x1="65" y1="72" x2="82" y2="72" stroke="#00BFA5" strokeWidth="3"/>
      <line x1="118" y1="72" x2="135" y2="72" stroke="#00BFA5" strokeWidth="3"/>
      <line x1="100" y1="37" x2="100" y2="54" stroke="#00BFA5" strokeWidth="3"/>
      {/* Circuit branches */}
      <line x1="60" y1="72" x2="60" y2="90" stroke="#00BFA5" strokeWidth="2" opacity="0.6"/>
      <line x1="140" y1="72" x2="140" y2="90" stroke="#00BFA5" strokeWidth="2" opacity="0.6"/>
      {/* Body base */}
      <path d="M65 112 Q100 100 135 112 L145 160 Q100 170 55 160 Z" fill="#00BFA5" opacity="0.12"/>
      <path d="M65 112 Q100 100 135 112" stroke="#00BFA5" strokeWidth="4" fill="none"/>
    </svg>
  )
}

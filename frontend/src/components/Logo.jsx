// OKKARO brand logo — frozi teal logomark + wordmark.
// Swap `/okkaro-mark.svg` (and the wordmark) for the official asset when available.
export function LogoMark({ size = 32, className = '' }) {
  return (
    <img src="/okkaro-mark.svg" width={size} height={size}
      alt="OKKARO" className={className} style={{ display: 'block' }} />
  )
}

export default function Logo({ size = 32, dark = false, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-display font-extrabold tracking-tight leading-none"
        style={{ fontSize: size * 0.62, color: dark ? '#ffffff' : '#2e434c' }}>
        OKKARO
      </span>
    </div>
  )
}

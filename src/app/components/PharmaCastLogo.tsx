/** The complete brand is loaded as an image asset, in light and dark variants. */
export function PharmaCastLogo({ className = "" }: { className?: string }) {
  return <span className={`pc-logo ${className}`}>
    <img className="pc-logo-light" src="/brand/pharmacast-logo-light.svg" alt="PharmaCast" width="800" height="160" />
    <img className="pc-logo-dark" src="/brand/pharmacast-logo-dark.svg" alt="PharmaCast" width="800" height="160" />
  </span>;
}

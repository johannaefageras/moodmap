import logo from '#/assets/brand/moodmap-logo.svg'

export function Brand({ height = 22, className }: { height?: number; className?: string }) {
  return (
    <img
      src={logo}
      alt="moodmap"
      height={height}
      className={className}
      style={{ display: 'block', width: 'auto' }}
    />
  )
}

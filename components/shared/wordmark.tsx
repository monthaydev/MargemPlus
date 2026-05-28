"use client"

import { T } from "@/lib/design-tokens"

// Logo do Margem+. Coloque o arquivo em public/logo.png para substituir o placeholder SVG.
export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="Margem+"
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block' }}
      onError={(e) => {
        const img = e.currentTarget
        img.style.display = 'none'
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('width', String(size))
        svg.setAttribute('height', String(size))
        svg.setAttribute('viewBox', '0 0 24 24')
        svg.setAttribute('fill', 'none')
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.setAttribute('width', '24'); rect.setAttribute('height', '24')
        rect.setAttribute('rx', '6'); rect.setAttribute('fill', T.margem)
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', 'M6 12h12M12 6v12')
        path.setAttribute('stroke', T.margemMint)
        path.setAttribute('stroke-width', '2.2')
        path.setAttribute('stroke-linecap', 'round')
        svg.appendChild(rect); svg.appendChild(path)
        img.parentNode?.insertBefore(svg, img)
      }}
    />
  )
}

import { useEffect, useRef } from 'react'

interface Point3D {
  x: number
  y: number
  z: number
}

interface Particle3D {
  x: number
  y: number
  z: number
  speed: number
  size: number
  hue: number
}

export function Monad3DScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrameId: number
    let angleX = 0.2
    let angleY = 0.4
    let targetAngleX = 0.2
    let targetAngleY = 0.4

    // Polyhedron vertices: 3D Shield / Octahedron geometry
    const vertices: Point3D[] = [
      { x: 0, y: -95, z: 0 },    // Top vertex
      { x: 65, y: -25, z: 45 },  // Front right
      { x: -65, y: -25, z: 45 }, // Front left
      { x: 0, y: -10, z: -65 },  // Back
      { x: 50, y: 55, z: 35 },   // Lower front right
      { x: -50, y: 55, z: 35 },  // Lower front left
      { x: 0, y: 95, z: 0 },     // Bottom vertex
      // Inner core prism
      { x: 0, y: -45, z: 0 },
      { x: 28, y: 0, z: 20 },
      { x: -28, y: 0, z: 20 },
      { x: 0, y: 45, z: 0 },
    ]

    // Wireframe edges connecting vertices
    const edges: [number, number][] = [
      // Outer shell
      [0, 1], [0, 2], [0, 3],
      [1, 2], [2, 5], [5, 6], [6, 4], [4, 1],
      [1, 3], [2, 3], [3, 4], [3, 5],
      // Inner core
      [7, 8], [7, 9], [8, 10], [9, 10], [8, 9],
      // Lattice ties
      [0, 7], [6, 10], [1, 8], [2, 9],
    ]

    // Orbiting particle telemetry
    const particleCount = 28
    const particles: Particle3D[] = Array.from({ length: particleCount }, (_, index) => {
      const radius = 105 + (index % 5) * 16
      const theta = (index / particleCount) * Math.PI * 2
      return {
        x: Math.cos(theta) * radius,
        y: ((index % 7) - 3) * 18,
        z: Math.sin(theta) * radius,
        speed: 0.008 + (index % 4) * 0.004,
        size: 1.5 + (index % 3) * 1.2,
        hue: index % 2 === 0 ? 255 : 170, // Monad Purple (255) vs Cyan (170)
      }
    })

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas?.getBoundingClientRect()
      if (!rect) return
      const mouseX = (e.clientX - rect.left) / rect.width - 0.5
      const mouseY = (e.clientY - rect.top) / rect.height - 0.5
      targetAngleY = mouseX * 1.8
      targetAngleX = -mouseY * 1.4
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    function setCanvasDimensions() {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = canvas.clientWidth || 340
      const height = canvas.clientHeight || 340
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
    }

    setCanvasDimensions()
    window.addEventListener('resize', setCanvasDimensions)

    function render() {
      if (!canvas || !ctx) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2

      ctx.clearRect(0, 0, w, h)

      // Smooth mouse rotation interpolation
      if (!prefersReducedMotion) {
        angleX += (targetAngleX - angleX) * 0.05
        angleY += (targetAngleY - angleY) * 0.05 + 0.007 // gentle continuous spin
      }

      const cosX = Math.cos(angleX)
      const sinX = Math.sin(angleX)
      const cosY = Math.cos(angleY)
      const sinY = Math.sin(angleY)

      const fov = 340 * dpr

      // Project 3D point to 2D screen
      function project(p: Point3D): { x: number; y: number; scale: number; z: number } {
        // Rotate around Y
        const x1 = p.x * cosY + p.z * sinY
        const z1 = -p.x * sinY + p.z * cosY

        // Rotate around X
        const y2 = p.y * cosX - z1 * sinX
        const z2 = p.y * sinX + z1 * cosX + 320

        const scale = fov / (fov + z2)
        return {
          x: cx + x1 * scale * dpr,
          y: cy + y2 * scale * dpr,
          scale,
          z: z2,
        }
      }

      // Detect theme from html element
      const isLight = document.documentElement.getAttribute('data-theme') === 'light'

      // Draw background glow aura
      const auraGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, 140 * dpr)
      if (isLight) {
        auraGradient.addColorStop(0, 'rgba(91, 62, 255, 0.16)')
        auraGradient.addColorStop(0.5, 'rgba(2, 132, 199, 0.08)')
        auraGradient.addColorStop(1, 'rgba(248, 249, 254, 0)')
      } else {
        auraGradient.addColorStop(0, 'rgba(110, 84, 255, 0.28)')
        auraGradient.addColorStop(0.5, 'rgba(0, 245, 212, 0.12)')
        auraGradient.addColorStop(1, 'rgba(14, 9, 28, 0)')
      }
      ctx.fillStyle = auraGradient
      ctx.beginPath()
      ctx.arc(cx, cy, 140 * dpr, 0, Math.PI * 2)
      ctx.fill()

      // Project vertices
      const projected = vertices.map(project)

      // Draw wireframe edges
      ctx.lineWidth = (isLight ? 1.6 : 1.4) * dpr
      edges.forEach(([i1, i2]) => {
        const p1 = projected[i1]
        const p2 = projected[i2]
        if (!p1 || !p2) return

        const depth = (p1.scale + p2.scale) / 2
        const alpha = Math.max(0.18, Math.min(0.9, (depth - 0.4) * (isLight ? 1.8 : 1.5)))

        ctx.strokeStyle = isLight
          ? `rgba(91, 62, 255, ${alpha})`
          : `rgba(131, 110, 249, ${alpha})`
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      })

      // Draw glowing vertices
      projected.forEach((p, idx) => {
        const size = (idx < 7 ? 4 : 2.5) * p.scale * dpr
        const isCore = idx >= 7

        const vertexColor = isLight
          ? (isCore ? '#0284C7' : '#5B3EFF')
          : (isCore ? '#00F5D4' : '#836EF9')

        ctx.fillStyle = vertexColor
        ctx.shadowColor = vertexColor
        ctx.shadowBlur = (isLight ? 8 : 12) * dpr

        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(1.5, size), 0, Math.PI * 2)
        ctx.fill()
      })

      // Reset shadow blur
      ctx.shadowBlur = 0

      // Animate and draw orbiting testnet particles
      particles.forEach((part) => {
        if (!prefersReducedMotion) {
          const currentRadius = Math.sqrt(part.x * part.x + part.z * part.z)
          const currentAngle = Math.atan2(part.z, part.x) + part.speed
          part.x = Math.cos(currentAngle) * currentRadius
          part.z = Math.sin(currentAngle) * currentRadius
        }

        const proj = project(part)
        const alpha = Math.max(0.2, Math.min(0.9, (proj.scale - 0.4) * 1.8))

        if (isLight) {
          ctx.fillStyle = part.hue === 255 ? `rgba(91, 62, 255, ${alpha})` : `rgba(2, 132, 199, ${alpha})`
        } else {
          ctx.fillStyle = part.hue === 255 ? `rgba(168, 120, 255, ${alpha})` : `rgba(0, 245, 212, ${alpha})`
        }
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, part.size * proj.scale * dpr, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', setCanvasDimensions)
    }
  }, [])

  return (
    <div className="monad-3d-wrapper" aria-hidden="true">
      <div className="monad-3d-ambient-glow" />
      <canvas ref={canvasRef} className="monad-3d-canvas" />
      <div className="monad-3d-badge">
        <span className="monad-3d-dot" />
        <span>Monad Testnet 10143</span>
      </div>
    </div>
  )
}

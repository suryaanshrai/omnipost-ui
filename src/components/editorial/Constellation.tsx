import { useEffect, useRef } from "react"

/**
 * The WebGL "constellation" background used at three densities across the
 * design: the auth panel (0.9), the landing hero (1.0), and the landing CTA
 * band (0.62). Three orbiting clusters of satellite points wired to a
 * shared centre node by faint lines, with a brighter pulse firing from the
 * centre out to each cluster on a 3.4s cycle, and every point gently
 * repelled within 92px of the pointer.
 *
 * This is a straight port of the raw WebGL from App v2.dc.html /
 * Landing Page v2.dc.html's `initConstellation()` — same shaders, same
 * physics — wrapped for React lifecycle instead of the design canvas's
 * ad-hoc setup/`_glStops` teardown array. The three call sites in the
 * source duplicated ~230 lines of this each; here it's one component.
 *
 * Browsers cap live WebGL contexts around 16, so correct teardown matters
 * far more here than in most effects: every listener is removed, the
 * animation frame is canceled, and the context itself is explicitly lost
 * via WEBGL_lose_context on unmount — repeated navigation between the
 * landing page and the app must not slowly exhaust the browser's context
 * budget. The loop also pauses while the tab is hidden and never starts at
 * all under prefers-reduced-motion (drawn once, statically, instead).
 */
export default function Constellation({ density = 1, className }: { density?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = (canvas.getContext("webgl", { antialias: true, alpha: true }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null
    if (!gl) return // static fallback: whatever background sits behind the canvas shows through

    const vs =
      "attribute vec2 aPos; attribute vec4 aCol; attribute float aSize; uniform vec2 uRes; varying vec4 vCol;" +
      "void main(){ vCol = aCol; gl_PointSize = aSize; vec2 c = (aPos / uRes) * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); }"
    const fsLine = "precision mediump float; varying vec4 vCol; void main(){ gl_FragColor = vec4(vCol.rgb, vCol.a); }"
    const fsPoint =
      "precision mediump float; varying vec4 vCol; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.12, d); gl_FragColor = vec4(vCol.rgb, vCol.a * a); }"

    type Program = { p: WebGLProgram; aPos: number; aCol: number; aSize: number; uRes: WebGLUniformLocation | null }
    const build = (fsSrc: string): Program | null => {
      const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        return s
      }
      const p = gl.createProgram()!
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs))
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsSrc))
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null
      return {
        p,
        aPos: gl.getAttribLocation(p, "aPos"),
        aCol: gl.getAttribLocation(p, "aCol"),
        aSize: gl.getAttribLocation(p, "aSize"),
        uRes: gl.getUniformLocation(p, "uRes"),
      }
    }
    const lineProg = build(fsLine)
    const pointProg = build(fsPoint)
    if (!lineProg || !pointProg) return

    const buf = gl.createBuffer()
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const BONE = [0.918, 0.89, 0.843]
    const FIRE = [0.878, 0.376, 0.165]
    const CLUSTERS = 3
    const perCluster = Math.max(7, Math.round(15 * density))
    const sats = Array.from({ length: CLUSTERS * perCluster }, (_, i) => {
      const c = Math.floor(i / perCluster)
      return {
        c,
        r: 0.1 + Math.random() * 0.3,
        sp: (0.14 + Math.random() * 0.4) * (Math.random() < 0.5 ? -1 : 1),
        ph: Math.random() * Math.PI * 2,
        sz: 1.8 + Math.random() * 1.9,
        a: 0.45 + Math.random() * 0.5,
      }
    })
    const clusterAngles = [-1.28, 0.44, 2.62]

    let W = 1,
      H = 1,
      dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth || 1
      H = canvas.clientHeight || 1
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    let mx = W / 2,
      my = H / 2,
      tmx = W / 2,
      tmy = H / 2
    const host = canvas.parentElement
    const onHostMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      tmx = e.clientX - r.left
      tmy = e.clientY - r.top
    }
    const onHostLeave = () => {
      tmx = W / 2
      tmy = H / 2
    }
    host?.addEventListener("mousemove", onHostMove)
    host?.addEventListener("mouseleave", onHostLeave)

    const start = performance.now()
    let raf: number | null = null

    const draw = () => {
      const t = (performance.now() - start) / 1000
      mx += (tmx - mx) * 0.06
      my += (tmy - my) * 0.06

      const scale = Math.min(W, H)
      const px = (mx - W / 2) / Math.max(W, 1)
      const py = (my - H / 2) / Math.max(H, 1)
      const cx = W * 0.5 + px * 26
      const cy = H * 0.48 + py * 26
      const ringR = scale * 0.3

      const cpos = clusterAngles.map((baseAngle, c) => {
        const a = baseAngle + Math.sin(t * 0.16 + c * 1.7) * 0.12
        const rr = ringR * (1 + Math.sin(t * 0.22 + c) * 0.05)
        return [cx + Math.cos(a) * rr + px * 34, cy + Math.sin(a) * rr + py * 34]
      })

      const spos = sats.map((s) => {
        const base = cpos[s.c]
        const ang = s.ph + t * s.sp
        const rr = s.r * scale * 0.32
        let x = base[0] + Math.cos(ang) * rr
        let y = base[1] + Math.sin(ang) * rr * 0.86
        const dx = x - mx,
          dy = y - my,
          d = Math.sqrt(dx * dx + dy * dy)
        if (d < 92 && d > 0.01) {
          const push = (1 - d / 92) * 26
          x += (dx / d) * push
          y += (dy / d) * push
        }
        return [x, y]
      })

      const lines: number[] = []
      const pushLine = (a: number[], b: number[], col: number[], alpha: number) => {
        lines.push(a[0], a[1], col[0], col[1], col[2], alpha, 1)
        lines.push(b[0], b[1], col[0], col[1], col[2], alpha, 1)
      }
      sats.forEach((s, i) => pushLine(spos[i], cpos[s.c], BONE, 0.14))
      for (let c = 0; c < CLUSTERS; c++) pushLine([cx, cy], cpos[c], BONE, 0.42)
      for (let i = 0; i < sats.length; i++) {
        for (let j = i + 1; j < sats.length; j++) {
          if (sats[i].c !== sats[j].c) continue
          const dx = spos[i][0] - spos[j][0],
            dy = spos[i][1] - spos[j][1]
          const d2 = dx * dx + dy * dy
          if (d2 < 5200) pushLine(spos[i], spos[j], BONE, 0.11 * (1 - d2 / 5200))
        }
      }

      const cycle = 3.4
      const prog = (t % cycle) / cycle
      const eased = prog < 0.62 ? prog / 0.62 : 1
      const heads: number[][] = []
      if (prog < 0.62) {
        for (let c = 0; c < CLUSTERS; c++) {
          const tailT = Math.max(0, eased - 0.16)
          const hx = cx + (cpos[c][0] - cx) * eased,
            hy = cy + (cpos[c][1] - cy) * eased
          const txp = cx + (cpos[c][0] - cx) * tailT,
            typ = cy + (cpos[c][1] - cy) * tailT
          const fade = 1 - Math.pow(eased, 3) * 0.45
          pushLine([txp, typ], [hx, hy], FIRE, 0.85 * fade)
          heads.push([hx, hy])
        }
      }

      const points: number[] = []
      const pushPoint = (p: number[], col: number[], alpha: number, size: number) =>
        points.push(p[0], p[1], col[0], col[1], col[2], alpha, size * dpr)
      sats.forEach((s, i) => pushPoint(spos[i], BONE, s.a, s.sz))
      for (let c = 0; c < CLUSTERS; c++) pushPoint(cpos[c], BONE, 0.9, 4.6)
      heads.forEach((hp) => pushPoint(hp, FIRE, 1, 5.4))
      pushPoint([cx, cy], FIRE, 1, 8 + Math.sin(t * 2.2) * 1.2)

      const data = new Float32Array([...lines, ...points])
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      const stride = 7 * 4
      const setup = (prg: Program) => {
        gl.useProgram(prg.p)
        gl.uniform2f(prg.uRes, W, H)
        gl.enableVertexAttribArray(prg.aPos)
        gl.vertexAttribPointer(prg.aPos, 2, gl.FLOAT, false, stride, 0)
        gl.enableVertexAttribArray(prg.aCol)
        gl.vertexAttribPointer(prg.aCol, 4, gl.FLOAT, false, stride, 8)
        gl.enableVertexAttribArray(prg.aSize)
        gl.vertexAttribPointer(prg.aSize, 1, gl.FLOAT, false, stride, 24)
      }
      const lineVerts = lines.length / 7
      const pointVerts = points.length / 7
      setup(lineProg)
      gl.drawArrays(gl.LINES, 0, lineVerts)
      setup(pointProg)
      gl.drawArrays(gl.POINTS, lineVerts, pointVerts)
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const loop = () => {
      draw()
      raf = requestAnimationFrame(loop)
    }
    if (reducedMotion) {
      draw() // one static frame, no continuous animation
    } else {
      loop()
    }

    const onVisibility = () => {
      if (reducedMotion) return
      if (document.hidden && raf !== null) {
        cancelAnimationFrame(raf)
        raf = null
      } else if (!document.hidden && raf === null) {
        loop()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      document.removeEventListener("visibilitychange", onVisibility)
      host?.removeEventListener("mousemove", onHostMove)
      host?.removeEventListener("mouseleave", onHostLeave)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [density])

  return <canvas ref={canvasRef} className={className} style={{ display: "block", width: "100%", height: "100%" }} />
}

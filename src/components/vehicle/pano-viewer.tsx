"use client";

import { useEffect, useRef, useState } from "react";
import { Hand, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { optimizedUrl } from "./view-360";
import { PlayToggle, useAutoplay } from "./play-toggle";

const VERTEX = `#version 300 es
in vec2 p;
out vec2 ndc;
void main() { ndc = p; gl_Position = vec4(p, 0.0, 1.0); }`;

// Para cada píxel calcula el rayo de la cámara y lo convierte a longitud/latitud de la foto equirectangular.
// El nivel de mip va fijo por cuadro: con derivadas automáticas se vería una costura donde la longitud da la vuelta.
const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D tex;
uniform float yaw, pitch, tanHalf, aspect, lod;
in vec2 ndc;
out vec4 color;
void main() {
  vec3 d = normalize(vec3(ndc.x * tanHalf * aspect, ndc.y * tanHalf, -1.0));
  float cp = cos(pitch), sp = sin(pitch);
  d = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
  float cy = cos(yaw), sy = sin(yaw);
  d = vec3(d.x * cy - d.z * sy, d.y, d.x * sy + d.z * cy);
  vec2 uv = vec2(0.5 + atan(d.x, -d.z) / 6.2831853, 0.5 + asin(clamp(d.y, -1.0, 1.0)) / 3.1415927);
  color = textureLod(tex, uv, lod);
}`;

const MIN_FOV = 35, MAX_FOV = 100, PAN_DEG_PER_SEC = 6;
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * Panorama 360 del interior (foto equirectangular 2:1) en WebGL2, sin librerías.
 * Arrastrar mira alrededor; la rueda, el pellizco o +/- acercan; las flechas también giran.
 * Gira despacio solo hasta que alguien lo toca.
 */
export function PanoViewer({ src, alt, autoplay = true, className }: { src: string; alt: string; autoplay?: boolean; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef({ yaw: 0, pitch: -15, fov: 80 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const { playing, toggle, stop } = useAutoplay(autoplay);
  const playingRef = useRef(playing);
  const redraw = useRef(() => {});

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);


  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const gl = canvas?.getContext("webgl2", { antialias: false });
    if (!canvas || !root || !gl) {
      setState("error");
      return;
    }
    let disposed = false, visible = false, raf = 0, last = 0;
    let texWidth = 0;

    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(["yaw", "pitch", "tanHalf", "aspect", "lod"].map((k) => [k, gl.getUniformLocation(program, k)]));

    const draw = () => {
      if (!texWidth) return;
      const dpr = Math.min(devicePixelRatio, 2);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      const { yaw, pitch, fov } = view.current;
      // Texeles de la foto por píxel de pantalla en el centro de la vista.
      const texelsPerPixel = (texWidth / (2 * Math.PI)) * (rad(fov) / h);
      gl.uniform1f(u.yaw, rad(yaw));
      gl.uniform1f(u.pitch, rad(pitch));
      gl.uniform1f(u.tanHalf, Math.tan(rad(fov) / 2));
      gl.uniform1f(u.aspect, w / h);
      gl.uniform1f(u.lod, Math.max(0, Math.log2(texelsPerPixel)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      if (playingRef.current && !pointers.current.size) view.current.yaw += PAN_DEG_PER_SEC * dt;
      draw();
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    redraw.current = () => {
      if (!raf) draw();
    };

    const load = () => {
      setState("loading");
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (disposed) return;
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        texWidth = img.naturalWidth;
        setState("ready");
        start();
      };
      img.onerror = () => !disposed && setState("error");
      img.src = optimizedUrl(src, Math.min(max, 4096));
    };
    const start = () => {
      if (visible && texWidth && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    let requested = false;
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !requested) {
          requested = true;
          load();
        }
        start();
      },
      { rootMargin: "200px" },
    );
    io.observe(root);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      redraw.current = () => {};
    };
  }, [src]);

  const look = (dYaw: number, dPitch: number, dFov = 0) => {
    const v = view.current;
    v.yaw += dYaw;
    v.pitch = Math.max(-85, Math.min(85, v.pitch + dPitch));
    v.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, v.fov + dFov));
    redraw.current();
  };
  const interact = stop;

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) look(0, 0, (pinch.current - dist) * 0.15);
      pinch.current = dist;
      return;
    }
    // Grados por píxel según el zoom, para que la foto siga al dedo.
    const k = view.current.fov / (canvasRef.current?.clientHeight || 400);
    look(-(e.clientX - prev.x) * k, (e.clientY - prev.y) * k);
  };

  return (
    <div
      ref={rootRef}
      role="application"
      tabIndex={0}
      aria-label={`${alt}, vista 360 del interior. Arrastra o usa las flechas para mirar alrededor; + y − para acercar.`}
      className={cn("relative cursor-grab touch-none overflow-hidden bg-night select-none active:cursor-grabbing", className)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        interact();
      }}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        pinch.current = null;
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        pinch.current = null;
      }}
      onWheel={(e) => {
        interact();
        look(0, 0, e.deltaY * 0.05);
      }}
      onKeyDown={(e) => {
        const moves: Record<string, [number, number, number]> = {
          ArrowLeft: [-5, 0, 0],
          ArrowRight: [5, 0, 0],
          ArrowUp: [0, 5, 0],
          ArrowDown: [0, -5, 0],
          "+": [0, 0, -5],
          "=": [0, 0, -5],
          "-": [0, 0, 5],
        };
        const m = moves[e.key];
        if (!m) return;
        e.preventDefault();
        interact();
        look(...m);
      }}
    >
      <canvas ref={canvasRef} className={cn("absolute inset-0 size-full transition-opacity duration-300", state === "ready" ? "opacity-100" : "opacity-0")} aria-hidden />
      {state === "loading" && (
        <span className="absolute inset-0 m-auto flex h-fit w-fit items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Cargando interior 360°
        </span>
      )}
      {state === "error" && <p className="absolute inset-0 grid place-items-center p-6 text-center text-white/80">Tu navegador no puede mostrar la vista 360 del interior.</p>}
      {state === "ready" && (
        <>
          <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-sm font-semibold text-white">
            <Hand className="size-4" aria-hidden />
            Arrastra para mirar
          </span>
          {autoplay && <PlayToggle playing={playing} onToggle={toggle} className="absolute right-3 bottom-3" label="recorrido" />}
        </>
      )}
    </div>
  );
}

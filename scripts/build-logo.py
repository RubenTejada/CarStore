"""Genera el logo de TuCarroOnline como SVG con el texto convertido a trazos (Archivo)."""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

SRC = Path(sys.argv[1])  # archivo.woff2 (variable)
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

NAVY, RED, RED_DARK, WHITE = "#0B2A5B", "#D0142C", "#A10F22", "#FFFFFF"

_fonts = {}


def font(wght, wdth):
    key = (wght, wdth)
    if key not in _fonts:
        f = TTFont(SRC)
        _fonts[key] = instantiateVariableFont(f, {"wght": wght, "wdth": wdth})
    return _fonts[key]


def text_path(text, x, baseline, size, wght=800, wdth=125, tracking=0.0, kern=None):
    """Devuelve (path_d, ancho) del texto como contornos."""
    f = font(wght, wdth)
    upm = f["head"].unitsPerEm
    scale = size / upm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f["hmtx"]
    d = []
    cursor = x
    for i, ch in enumerate(text):
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        tpen = TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline))
        gs[name].draw(tpen)
        d.append(pen.getCommands())
        adv = hmtx[name][0] * scale
        cursor += adv + tracking * size
        if kern and i + 1 < len(text):
            cursor += kern.get(text[i : i + 2], 0) * size
    return " ".join(d), cursor - x - tracking * size


# Ajustes ópticos de pares (en em).
KERN = {"Tu": -0.06, "On": -0.005}


def mark(x, y, h, car=WHITE, pin=RED, glass=RED_DARK, tire=NAVY):
    """Pin de mapa con un carro de perfil dentro. (x, y) esquina superior izquierda, alto h."""
    s = h / 64  # diseñado en una caja de 52x64
    t = lambda px, py: f"{x + px * s:.2f} {y + py * s:.2f}"
    # Pin: círculo de radio 24 centrado en (26,25) que se cierra en punta en (26,62).
    pin_d = (
        f"M{t(26, 62)} C{t(21, 52)} {t(2, 41)} {t(2, 25)} "
        f"C{t(2, 11.7)} {t(12.7, 1)} {t(26, 1)} C{t(39.3, 1)} {t(50, 11.7)} {t(50, 25)} "
        f"C{t(50, 41)} {t(31, 52)} {t(26, 62)}Z"
    )
    # Carro compacto (perfil) dentro del pin: caja 120x48 -> ancho 40, centrado en la cabeza del pin.
    cw = 40
    cs = cw / 120 * s
    ox = x + (26 - cw / 2) * s
    oy = y + 25.5 * s - 28 * cs  # centro vertical del carro (~y=28 en su caja) sobre el centro del pin

    def c(px, py):
        return f"{ox + px * cs:.2f} {oy + py * cs:.2f}"

    sill, r, tire_r = 38, 12, 9.5
    wx = (30, 90)
    body = (
        f"M{c(6, 38)}L{c(6, 28)}Q{c(6, 23)} {c(11, 22)}L{c(25, 20)}L{c(37, 10)}Q{c(39, 8)} {c(43, 8)}"
        f"L{c(76, 8)}Q{c(80, 8)} {c(83, 10.5)}L{c(94, 20)}L{c(108, 22.5)}Q{c(114, 24)} {c(114, 30)}L{c(114, 38)}"
        f"L{c(wx[1] + r, sill)}A{r * cs:.2f} {r * cs:.2f} 0 0 0 {c(wx[1] - r, sill)}L{c(wx[0] + r, sill)}"
        f"A{r * cs:.2f} {r * cs:.2f} 0 0 0 {c(wx[0] - r, sill)}Z"
    )
    glass_d = (
        f"M{c(41, 12)}L{c(57, 12)}L{c(57, 19.5)}L{c(32, 19.5)}Z"
        f"M{c(60.5, 12)}L{c(75, 12)}Q{c(78, 12)} {c(80, 14)}L{c(86, 19.5)}L{c(60.5, 19.5)}Z"
    )
    wheels = "".join(
        f'<circle cx="{ox + cx * cs:.2f}" cy="{oy + sill * cs:.2f}" r="{tire_r * cs:.2f}" fill="{tire}"/>'
        f'<circle cx="{ox + cx * cs:.2f}" cy="{oy + sill * cs:.2f}" r="{4 * cs:.2f}" fill="{car}"/>'
        for cx in wx
    )
    return (
        f'<path d="{pin_d}" fill="{pin}"/>'
        f'<path d="{body}" fill="{car}"/>'
        f'<path d="{glass_d}" fill="{glass}"/>'
        f"{wheels}"
    ), 52 * s


def svg(w, h, body, bg=None):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">{rect}{body}</svg>\n'


def horizontal(dark=False, dotcom=False):
    tu = WHITE if dark else NAVY
    on = "#FF4D63" if dark else RED
    pad = 8
    m, mw = mark(pad, pad, 64)
    size = 40
    baseline = pad + 46
    x0 = pad + mw + 12
    p1, w1 = text_path("TuCarro", x0, baseline, size, kern=KERN)
    p2, w2 = text_path("Online", x0 + w1 + 0.01 * size, baseline, size, kern=KERN)
    body = m + f'<path d="{p1}" fill="{tu}"/><path d="{p2}" fill="{on}"/>'
    end = x0 + w1 + 0.01 * size + w2
    if dotcom:
        p3, w3 = text_path(".com", end + 2, baseline, size * 0.5, wght=600, wdth=100)
        body += f'<path d="{p3}" fill="{tu}" opacity="0.7"/>'
        end += 2 + w3
    return svg(end + pad, 64 + 2 * pad, body)


def icon(bg=None, h=64, pad=0, **kw):
    m, mw = mark(0, 0, h, **kw)
    if bg:
        box = h + 2 * pad
        return svg(box, box, f'<g transform="translate({(box - mw) / 2:.2f} {pad})">{m}</g>', bg)
    return svg(mw, h, m)


(OUT / "tucarroonline-logo.svg").write_text(horizontal())
(OUT / "tucarroonline-logo-com.svg").write_text(horizontal(dotcom=True))
(OUT / "tucarroonline-logo-dark.svg").write_text(horizontal(dark=True))
(OUT / "tucarroonline-logo-com-dark.svg").write_text(horizontal(dark=True, dotcom=True))
(OUT / "tucarroonline-icon.svg").write_text(icon())
(OUT / "tucarroonline-app-icon.svg").write_text(icon(bg=NAVY, h=120, pad=30))
print("ok")

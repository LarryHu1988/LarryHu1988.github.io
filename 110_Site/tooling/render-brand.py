"""Render repository-native artwork using the site's licensed font outlines."""

import base64
from html import escape
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "112_Brand"
FONTS = ROOT / "110_Site/public/fonts"
PAPER, INK, GREEN, MUTED, RUST = "#f5f3ed", "#263b30", "#2e5b48", "#616b5d", "#a34d32"


def font(name):
    face = TTFont(FONTS / name)
    if "fvar" in face:
        face = instantiateVariableFont(face, {"wght": 500})
    return face


MONO = font("ibm-plex-mono-500.woff2")
SERIF = font("noto-serif-sc.woff2")


def text(value, x, y, size, face=SERIF, fill=INK, spacing=0):
    paths, advance = [], 0
    for char in value:
        active = face if ord(char) in face.getBestCmap() else MONO
        cmap, glyphs = active.getBestCmap(), active.getGlyphSet()
        if ord(char) not in cmap:
            raise ValueError(f"Font subset is missing {char!r}")
        scale = size / active["head"].unitsPerEm
        glyph = glyphs[cmap[ord(char)]]
        pen = SVGPathPen(glyphs)
        glyph.draw(pen)
        paths.append(f'<path transform="translate({x + advance:.3f} {y}) scale({scale:.6f} {-scale:.6f})" d="{pen.getCommands()}"/>')
        advance += glyph.width * scale + spacing
    return f'<g fill="{fill}">' + "".join(paths) + "</g>"


def image(path, x, y, width, height):
    path = ROOT / path
    mime = "image/webp" if path.suffix == ".webp" else "image/png"
    data = base64.b64encode(path.read_bytes()).decode()
    return f'<image x="{x}" y="{y}" width="{width}" height="{height}" href="data:{mime};base64,{data}" preserveAspectRatio="xMidYMin meet"/>'


def svg(name, width, height, title, body):
    content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">
<title id="title">{escape(title)}</title>
<rect width="{width}" height="{height}" fill="{PAPER}"/>
{body}
</svg>'''
    target = ROOT / "119_Build/brand" if name in {"simpleworth", "keepfit", "pdflibrarian"} else OUT
    target.mkdir(parents=True, exist_ok=True)
    (target / f"{name}.svg").write_text(content)


def arrow(x, y, color=GREEN):
    return f'<path d="M{x} {y+14}l14-14m-14 0h14v14" fill="none" stroke="{color}" stroke-width="1.5"/>'


def cover():
    body = '''<defs>
<linearGradient id="drop" x1="700" y1="100" x2="1010" y2="390" gradientUnits="userSpaceOnUse"><stop stop-color="#8db0a0"/><stop offset="1" stop-color="#234f43"/></linearGradient>
<pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#6f8367" stroke-opacity=".10" stroke-width=".7"/></pattern>
<radialGradient id="mist"><stop stop-color="#e2e8d9"/><stop offset="1" stop-color="#f5f3ed" stop-opacity="0"/></radialGradient>
</defs>
<rect x="24" y="24" width="1152" height="492" rx="2" fill="none" stroke="#dcded2"/>
<ellipse cx="920" cy="282" rx="290" ry="260" fill="url(#mist)"/>
<path d="M700 69h428v417H700z" fill="url(#grid)"/>
<g fill="none" stroke="#527a68" stroke-width=".8" opacity=".28"><ellipse cx="912" cy="380" rx="203" ry="55"/><ellipse cx="912" cy="380" rx="159" ry="42"/><ellipse cx="912" cy="380" rx="110" ry="28"/><ellipse cx="912" cy="380" rx="56" ry="14"/></g>
<path d="M912 114c-24 48-102 111-102 174a102 102 0 0 0 204 0c0-63-78-126-102-174Z" fill="url(#drop)"/>
<path d="M834 287c31-27 112 34 159-8m-150 29c37-20 95 18 136-8m-116 29c30-12 53 6 86-10" fill="none" stroke="#e4e8d4" stroke-width="1.2" opacity=".8"/>
<path d="M839 261c0-42 35-81 59-119" fill="none" stroke="#c4d3b8" opacity=".65"/>
<circle cx="1082" cy="153" r="9" fill="#a34d32"/>
<path d="M1060 153h-39m61 20v29M747 243h16m-8-8v16" fill="none" stroke="#a34d32" stroke-width=".8" opacity=".55"/>
<path d="M78 460h1044" stroke="#dcded2"/>
'''
    body += text("LARRY STUDIO", 78, 86, 25, MONO, GREEN, 1)
    body += text("滴水龙雨工作室", 79, 117, 16, fill=MUTED)
    body += text("写代码，", 72, 250, 78)
    body += text("也写小诗。", 72, 354, 78, fill=GREEN)
    body += '<path d="M79 372c94-6 224-5 307 0" fill="none" stroke="#bec7aa" stroke-width="5" opacity=".55"/>'
    body += text("ENGINEERING BY DAY. POETRY ALONG THE WAY.", 80, 414, 11, MONO, MUTED)
    body += text("LAWRENCE HU", 80, 491, 11, MONO, MUTED, 1)
    body += text("larryhu.com", 930, 491, 14, MONO, GREEN)
    body += arrow(1093, 478)
    svg("cover", 1200, 540, "滴水龙雨工作室：写代码，也写小诗。", body)


def app_card(name, label, tagline, icon, screen, platform, tone):
    body = f'<rect x="1" y="1" width="358" height="498" rx="4" fill="none" stroke="#dcded2"/><circle cx="275" cy="303" r="157" fill="{tone}"/>'
    body += image(icon, 28, 29, 38, 38)
    body += text(label, 80, 54, 19, MONO)
    body += text(tagline, 28, 108, 18, fill=GREEN)
    if name != "pdflibrarian":
        body += '<defs><clipPath id="screen"><rect x="83" y="155" width="194" height="290" rx="16"/></clipPath></defs><rect x="76" y="143" width="208" height="310" rx="24" fill="#e6e8df" stroke="#c8cfc0"/><g clip-path="url(#screen)">'
        body += image(screen, 83, 155, 194, 422)
        body += '</g><rect x="145" y="148" width="70" height="4" rx="2" fill="#263b30" opacity=".3"/>'
    else:
        body += '<rect x="24" y="214" width="312" height="211" rx="5" fill="#e3e6df" stroke="#c8cfc0"/><path d="M25 234h310" stroke="#c8cfc0"/><g fill="#9daa97"><circle cx="35" cy="224" r="2"/><circle cx="43" cy="224" r="2"/><circle cx="51" cy="224" r="2"/></g>'
        body += image(screen, 28, 237, 304, 185)
        body += '<path d="M20 427h320l-10 8H30Z" fill="#c8cfc0"/>'
    body += text(platform, 28, 477, 10, MONO, MUTED, .5)
    body += arrow(317, 463)
    svg(name, 360, 500, f"{label}：{tagline}", body)


def poem_card(name, title, lines, number):
    body = '<rect x="1" y="1" width="558" height="329" rx="3" fill="none" stroke="#dcded2"/>'
    body += text("WORDS I KEEP", 32, 41, 10, MONO, MUTED, 1)
    if number == 1:
        body += '<circle cx="451" cy="99" r="28" fill="#a34d32" opacity=".7"/><path d="M330 254l70-141 92 123 68-51v144H330Z" fill="#dce3d3"/><path d="M331 329l139-137 90 62v75Z" fill="#879c82" opacity=".62"/>'
    else:
        body += '<g fill="none" stroke="#7f9984" opacity=".5"><path d="M372 329V106h156v223"/><path d="M390 329V133h120v196"/><path d="M408 329V160h84v169"/></g><circle cx="451" cy="250" r="24" fill="#a34d32" opacity=".75"/>'
    body += text(title, 30, 111, 31)
    for index, line in enumerate(lines):
        body += text(line, 32, 173 + index * 32, 17, fill=MUTED)
    body += text("读完整首诗", 32, 294, 13, fill=GREEN)
    body += arrow(136, 282)
    svg(name, 560, 330, title, body)


OUT.mkdir(exist_ok=True)
cover()
app_card("simpleworth", "SimpleWorth", "记得简单，心里有数。", "111_Products/simpleworth/assets/icon.png", "111_Products/simpleworth/assets/zh-Hans-01-expenses.webp", "iPhone / iPad", "#e5e8dc")
app_card("keepfit", "KeepFit", "管住嘴，迈开腿。", "111_Products/keepfit/assets/icon.png", "111_Products/keepfit/assets/zh-eat-overview.webp", "iPhone / iPad", "#eadfd1")
app_card("pdflibrarian", "PDF Librarian", "给 PDF，一份清楚的书目。", "110_Site/public/images/pdf-icon.png", "110_Site/public/images/pdf-overview.webp", "macOS", "#e0e7e3")
poem_card("second-granduncle", "二姥爷是个哑巴", ["在正月的日子里", "我回忆起了他"], 1)
poem_card("performance", "表演", ["这是一个无尽的舞台", "所有人都在刻意不刻意地表演"], 2)
svg("signature", 1200, 120, "日子慢慢过，文字慢慢写。", '<path d="M40 20h1120" stroke="#dcded2"/>' + text("日子慢慢过，文字慢慢写。", 474, 68, 21, fill=MUTED) + text("LARRY STUDIO / larryhu.com", 517, 99, 11, MONO, GREEN))
print("Rendered brand artwork using local licensed font outlines.")

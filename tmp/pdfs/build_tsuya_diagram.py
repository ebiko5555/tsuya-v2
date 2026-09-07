from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "experience-prototype" / "art-assets"
TMP = ROOT / "tmp" / "pdfs" / "assets"
OUT = ROOT / "output" / "pdf" / "艶II_ネイルデザイン生成ルール_授業用図解.pdf"
TMP.mkdir(parents=True, exist_ok=True)

W, H = landscape(A4)
BG = HexColor("#090A0D")
CARD = HexColor("#15171C")
CARD2 = HexColor("#1D2026")
TEXT = HexColor("#F3F1EC")
MUTED = HexColor("#AAA9A5")
GOLD = HexColor("#D0A34E")
PINK = HexColor("#D14F78")
MINT = HexColor("#79C9C3")

pdfmetrics.registerFont(TTFont("ArialUnicodeEmbedded", "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"))
SANS = "ArialUnicodeEmbedded"
SERIF = "ArialUnicodeEmbedded"


def first_frame(name: str) -> Path:
    src = ASSETS / f"{name}.webp"
    dst = TMP / f"{name}.jpg"
    with Image.open(src) as im:
        im.seek(0)
        im.convert("RGB").save(dst, quality=92)
    return dst


def draw_cover(c, image_path: Path, x, y, w, h, radius=8):
    with Image.open(image_path) as im:
        iw, ih = im.size
    scale = max(w / iw, h / ih)
    sw, sh = iw * scale, ih * scale
    c.saveState()
    p = c.beginPath()
    p.roundRect(x, y, w, h, radius)
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(str(image_path), x - (sw - w) / 2, y - (sh - h) / 2, sw, sh, mask="auto")
    c.restoreState()


def draw_contain(c, image_path: Path, x, y, w, h):
    with Image.open(image_path) as im:
        iw, ih = im.size
    scale = min(w / iw, h / ih)
    sw, sh = iw * scale, ih * scale
    c.drawImage(str(image_path), x + (w - sw) / 2, y + (h - sh) / 2, sw, sh, mask="auto")


def round_card(c, x, y, w, h, fill=CARD, stroke=None, radius=10):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1 if stroke else 0)


def fit_text(c, text, x, y, max_width, size=12, leading=18, color=TEXT, font=SANS, max_lines=99):
    c.setFont(font, size)
    c.setFillColor(color)
    lines, line = [], ""
    for ch in text:
        if ch == "\n":
            lines.append(line)
            line = ""
            continue
        trial = line + ch
        if pdfmetrics.stringWidth(trial, font, size) > max_width and line:
            lines.append(line)
            line = ch
        else:
            line = trial
    if line:
        lines.append(line)
    for i, ln in enumerate(lines[:max_lines]):
        c.drawString(x, y - i * leading, ln)
    return y - min(len(lines), max_lines) * leading


def title(c, page_no, kicker, heading, subtitle=None):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.setFont(SANS, 8)
    c.drawString(34, H - 29, f"艶 II  /  {kicker}")
    c.setFillColor(TEXT)
    c.setFont(SERIF, 26)
    c.drawString(34, H - 62, heading)
    if subtitle:
        c.setFillColor(MUTED)
        c.setFont(SANS, 9)
        c.drawString(35, H - 80, subtitle)
    c.setStrokeColor(HexColor("#34363B"))
    c.line(34, 25, W - 34, 25)
    c.setFillColor(MUTED)
    c.setFont(SANS, 7)
    c.drawRightString(W - 34, 13, f"{page_no} / 5")


def arrow(c, x1, y1, x2, y2, color=GOLD):
    c.setStrokeColor(color)
    c.setLineWidth(1.5)
    c.line(x1, y1, x2, y2)
    ang = math.atan2(y2 - y1, x2 - x1)
    for d in (-0.45, 0.45):
        c.line(x2, y2, x2 - 8 * math.cos(ang + d), y2 - 8 * math.sin(ang + d))


def nail_path(c, x, y, w, h):
    p = c.beginPath()
    p.moveTo(x - w / 2, y + h * 0.34)
    p.lineTo(x - w / 2, y - h * 0.18)
    p.curveTo(x - w * .46, y - h * .48, x - w * .22, y - h * .52, x, y - h * .52)
    p.curveTo(x + w * .22, y - h * .52, x + w * .46, y - h * .48, x + w / 2, y - h * .18)
    p.lineTo(x + w / 2, y + h * .34)
    p.curveTo(x + w * .32, y + h * .50, x - w * .32, y + h * .50, x - w / 2, y + h * .34)
    p.close()
    return p


def draw_nail(c, x, y, w, h, color, kind="solid", seed=0):
    base = HexColor(color)
    p = nail_path(c, x, y, w, h)
    c.saveState()
    c.setFillColor(base)
    c.drawPath(p, fill=1, stroke=0)
    c.clipPath(p, stroke=0, fill=0)
    if kind in ("lines", "art", "field"):
        c.setStrokeColor(Color(1, 1, 1, alpha=.55))
        c.setLineWidth(1.1)
        for i in range(5):
            yy = y - h * .35 + i * h * .18
            c.line(x - w * .55, yy, x + w * .55, yy + ((i + seed) % 3 - 1) * 7)
    if kind in ("spark", "glow"):
        c.setFillColor(Color(1, 1, 1, alpha=.72))
        for i in range(7):
            xx = x + (((i * 17 + seed * 9) % 31) / 30 - .5) * w * .75
            yy = y + (((i * 29 + seed * 5) % 43) / 42 - .5) * h * .75
            c.circle(xx, yy, 1.1 + i % 2, fill=1, stroke=0)
    if kind in ("sheer", "quiet"):
        c.setFillColor(Color(1, 1, 1, alpha=.35))
        c.rect(x - w, y - h, w * 2, h * .65, fill=1, stroke=0)
    if kind == "field":
        c.setFillColor(Color(1, .85, .55, alpha=.50))
        for i in range(4):
            xx = x + (i - 1.5) * w * .20
            c.circle(xx, y + ((i % 2) - .5) * h * .20, w * .12, fill=1, stroke=0)
    c.setFillColor(Color(1, 1, 1, alpha=.35))
    c.ellipse(x - w * .30, y - h * .30, x - w * .05, y + h * .12, fill=1, stroke=0)
    c.restoreState()
    c.setStrokeColor(Color(1, 1, 1, alpha=.23))
    c.setLineWidth(.7)
    c.drawPath(p, fill=0, stroke=1)


def work_mask_and_palette(image_path: Path):
    im = Image.open(image_path).convert("RGB")
    ow, oh = im.size
    scale = max(160 / ow, 160 / oh)
    nw, nh = round(ow * scale), round(oh * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - 160) // 2, (nh - 160) // 2
    im = im.crop((left, top, left + 160, top + 160))
    arr = np.asarray(im).astype(np.float32)
    ring = max(8, round(160 * .09))
    buckets = defaultdict(lambda: [0., 0., 0., 0])
    for y in range(0, 160, 2):
        for x in range(0, 160, 2):
            if ring <= x < 160 - ring and ring <= y < 160 - ring:
                continue
            r, g, b = arr[y, x]
            key = (int(r) >> 4, int(g) >> 4, int(b) >> 4)
            q = buckets[key]
            q[0] += r; q[1] += g; q[2] += b; q[3] += 1
    bg = sorted(buckets.values(), key=lambda q: q[3], reverse=True)[:8]
    bg = np.array([[q[0]/q[3], q[1]/q[3], q[2]/q[3]] for q in bg])
    diff = arr[:, :, None, :] - bg[None, None, :, :]
    dist = np.sqrt(diff[..., 0] ** 2 * .30 + diff[..., 1] ** 2 * .59 + diff[..., 2] ** 2 * .11).min(axis=2)
    yy, xx = np.mgrid[0:160, 0:160]
    nx, ny = (xx / 159 - .5) / .5, (yy / 159 - .5) / .5
    center = np.maximum(0, 1 - np.sqrt(nx * nx * .72 + ny * ny))
    edge = np.minimum.reduce([xx, yy, 159 - xx, 159 - yy]) / ring
    raw = np.clip((dist - 16) / 58 + center * .52 - np.maximum(0, 1 - edge) * .58, 0, 1)
    smooth = np.asarray(Image.fromarray(np.uint8(raw * 255)).filter(ImageFilter.BoxBlur(2))) / 255
    weight = np.clip((smooth - .16) / .58, 0, 1)
    alpha = weight * weight * (3 - 2 * weight)
    if (alpha > 48/255).sum() < 160 * 160 * .12:
        alpha = np.clip(1.32 - np.sqrt(nx * nx + ny * ny), 0, 1)
    rgba = np.dstack([arr.astype(np.uint8), np.uint8(alpha * 255)])
    masked = Image.new("RGB", (160, 160), "#EFEAE2")
    masked.paste(Image.fromarray(rgba, "RGBA"), mask=Image.fromarray(np.uint8(alpha * 255)))
    original_path = TMP / "analysis-original.png"
    masked_path = TMP / "analysis-masked.png"
    im.save(original_path)
    masked.save(masked_path)

    small = np.asarray(Image.fromarray(rgba, "RGBA").resize((96, 96), Image.Resampling.LANCZOS)).astype(np.float32)
    buckets2 = defaultdict(lambda: [0., 0., 0., 0., 0.])
    for px in small.reshape(-1, 4):
        a = px[3] / 255
        if a < .18:
            continue
        r, g, b = px[:3]
        mx, mn = max(r, g, b), min(r, g, b)
        sat = (mx - mn) / mx if mx else 0
        light = (mx + mn) / 510
        if (sat < .08 and (light > .84 or light < .14)) or light > .97:
            continue
        key = (int(r) >> 4, int(g) >> 4, int(b) >> 4)
        q = buckets2[key]
        q[0] += r*a; q[1] += g*a; q[2] += b*a; q[3] += a; q[4] += sat*a
    candidates = []
    for q in buckets2.values():
        r, g, b, count, sat = q[0]/q[3], q[1]/q[3], q[2]/q[3], q[3], q[4]/q[3]
        candidates.append((count * (.28 + sat * 2.8), np.array([r, g, b])))
    candidates.sort(key=lambda item: item[0], reverse=True)
    chosen = []
    for _, rgb in candidates:
        if all(np.linalg.norm(rgb - other) > 48 for other in chosen):
            chosen.append(rgb)
        if len(chosen) >= 8:
            break
    for _, rgb in candidates:
        if len(chosen) >= 8:
            break
        if not any(np.array_equal(rgb, other) for other in chosen):
            chosen.append(rgb)
    fallback = ["#D8C4B8", "#806C65", "#ECE7DF", "#384047", "#B9977D", "#F7F4EF"]
    palette = ["#%02X%02X%02X" % tuple(np.clip(rgb, 0, 255).astype(int)) for rgb in chosen]
    for col in fallback:
        if len(palette) < 8 and col not in palette:
            palette.append(col)
    return original_path, masked_path, palette[:8]


def page1(c, images):
    title(c, 1, "OVERVIEW", "作品や写真を、5本のネイルへ翻訳する", "画像を貼り付けるのではなく、特徴を抽出して組み直す")
    y, box_h, gap = 275, 138, 16
    stages = [
        ("1  MATERIAL", "作品・写真", images["color-pattern"]),
        ("2  READ", "色・線・光・形", None),
        ("3  COMPOSE", "5本に役割を分ける", None),
        ("4  TRY ON", "自分の手で試す", images["hand-drawing"]),
    ]
    box_w = (W - 68 - gap * 3) / 4
    for i, (code, label, img) in enumerate(stages):
        x = 34 + i * (box_w + gap)
        round_card(c, x, y, box_w, box_h, CARD, HexColor("#34363B"))
        if img:
            draw_cover(c, img, x + 8, y + 42, box_w - 16, box_h - 50)
        elif i == 1:
            for j, (txt, col) in enumerate([("COLOR", PINK), ("LINE", GOLD), ("LIGHT", MINT), ("SHAPE", TEXT)]):
                c.setFillColor(col); c.circle(x + 31, y + 105 - j * 20, 4, fill=1, stroke=0)
                c.setFont(SANS, 8); c.drawString(x + 43, y + 102 - j * 20, txt)
        else:
            cols = ["#D14F78", "#477D6C", "#E0B936", "#795A9F", "#C55D3D"]
            for j, col in enumerate(cols):
                draw_nail(c, x + 23 + j * 24, y + 84, 15, 52 + [0, 7, 12, 7, 0][j], col, ["art", "sheer", "field", "spark", "solid"][j], j)
        c.setFillColor(GOLD); c.setFont(SANS, 7); c.drawString(x + 10, y + 24, code)
        c.setFillColor(TEXT); c.setFont(SANS, 10); c.drawString(x + 10, y + 10, label)
        if i < 3:
            arrow(c, x + box_w + 3, y + box_h/2, x + box_w + gap - 3, y + box_h/2)
    c.setFillColor(TEXT); c.setFont(SERIF, 17)
    c.drawString(34, 215, "中心の考え方")
    round_card(c, 34, 78, W - 68, 118, CARD2)
    fit_text(c, "プログラムが自由にデザインを考えるのではない。作者が決めた『何を読むか』『5本へどう分けるか』『どの質感で描くか』という規則へ、作品や写真の特徴を入れている。", 54, 166, W - 108, 14, 23, TEXT, SERIF, 3)
    c.setFillColor(GOLD); c.setFont(SANS, 10)
    c.drawString(54, 97, "COPY ではなく  TRANSLATION  /  コピーではなく翻訳")


def page2(c, original, masked, palette):
    title(c, 2, "READ THE IMAGE", "写真から、必要な特徴だけを読む", "物体認識ではなく、位置・色・明暗差を数値として扱う")
    y = 260
    cards = [("A  中央を正方形に", original), ("B  外周背景を弱める", masked)]
    for i, (lab, img) in enumerate(cards):
        x = 34 + i * 190
        round_card(c, x, y, 174, 174, CARD, HexColor("#34363B"))
        draw_contain(c, img, x + 8, y + 26, 158, 138)
        c.setFillColor(TEXT); c.setFont(SANS, 9); c.drawString(x + 10, y + 10, lab)
    arrow(c, 211, y + 87, 222, y + 87)
    round_card(c, 414, y, 394, 174, CARD2)
    c.setFillColor(GOLD); c.setFont(SANS, 10); c.drawString(432, y + 148, "C  4種類の特徴")
    features = [
        ("COLOR", "よく使われる色 + 彩度", PINK),
        ("LINE", "明るさの差 + 線の方向", GOLD),
        ("LIGHT", "明るさ205以上の割合", MINT),
        ("SHAPE", "強い輪郭から最大42点", TEXT),
    ]
    for i, (a, b, col) in enumerate(features):
        yy = y + 116 - i * 30
        c.setFillColor(col); c.circle(440, yy + 2, 4, fill=1, stroke=0)
        c.setFont(SANS, 8); c.drawString(452, yy, a)
        c.setFillColor(MUTED); c.drawString(510, yy, b)
    c.setFillColor(TEXT); c.setFont(SERIF, 15); c.drawString(34, 222, "抽出した8色")
    for i, col in enumerate(palette):
        x = 34 + i * 55
        c.setFillColor(HexColor(col)); c.roundRect(x, 176, 44, 30, 6, fill=1, stroke=0)
        c.setFillColor(MUTED); c.setFont(SANS, 6); c.drawCentredString(x + 22, 165, col)
    round_card(c, 500, 156, 308, 72, CARD)
    c.setFillColor(GOLD); c.setFont(SANS, 9); c.drawString(516, 204, "背景判定の要点")
    fit_text(c, "外周で多い8色を背景候補にする。中央へ加点、端へ減点し、5×5ピクセルで平均化。残る範囲が12％未満なら中央域を残す。", 516, 187, 275, 8.5, 14, TEXT, SANS, 4)
    c.setFillColor(MUTED); c.setFont(SANS, 8)
    c.drawString(34, 118, "※ 車・花などの名前は理解していない。『背景らしい位置と色』を推定している。")
    c.setFillColor(TEXT); c.setFont(SERIF, 16); c.drawString(34, 83, "結果：背景を消すのではなく、ネイル分析への影響を弱める")


def page3(c, palette):
    title(c, 3, "COMPOSE FIVE NAILS", "8色と特徴を、5本の構成へ組み直す", "左から 親指・人差し指・中指・薬指・小指")
    x0, y0 = 55, 330
    labels = ["親指\n特徴", "人差し指\nつなぎ", "中指\n主役", "薬指\n光", "小指\n余白"]
    color_idx = [0, 3, 1, 4, 2]
    kinds = ["field", "lines", "field", "glow", "solid"]
    heights = [85, 98, 110, 98, 82]
    for i in range(5):
        x = x0 + i * 80
        draw_nail(c, x, y0, 43, heights[i], palette[color_idx[i]], kinds[i], i)
        fit_text(c, labels[i], x - 30, 257, 60, 8, 12, TEXT, SANS, 2)
        c.setFillColor(MUTED); c.setFont(SANS, 6); c.drawCentredString(x, 234, f"palette[{color_idx[i]}]")
    round_card(c, 470, 250, 338, 166, CARD2)
    c.setFillColor(GOLD); c.setFont(SANS, 10); c.drawString(488, 392, "色の並べ方")
    fit_text(c, "よく使われた順に並べず、1・4・2・5・3番目の色を組み合わせる。近い色だけで固まらず、5本にリズムが生まれる。", 488, 369, 304, 10, 17, TEXT, SANS, 5)
    c.setFillColor(MINT); c.setFont(SANS, 9); c.drawString(488, 282, "共通設定")
    c.setFillColor(TEXT); c.setFont(SANS, 9)
    c.drawString(555, 282, "濃さ96 / 大きさ95 / 長さ118 / ナチュラル")

    modes = [
        ("COLOR", "配色を中心に", ["nuance", "sheer", "grad", "pearl", "one"]),
        ("PATTERN", "線・形を中心に", ["line", "wire", "shape", "pearl", "one"]),
        ("LIGHT", "反射・輝きを中心に", ["glow", "water", "dust", "pearl", "sheer"]),
        ("MIX", "色・線・形・光", ["shape", "line", "shape", "glow", "one"]),
    ]
    card_w = (W - 68 - 12 * 3) / 4
    for i, (mode, desc, seq) in enumerate(modes):
        x = 34 + i * (card_w + 12)
        round_card(c, x, 64, card_w, 135, CARD, HexColor("#303239"))
        c.setFillColor([PINK, GOLD, MINT, TEXT][i]); c.setFont(SANS, 10); c.drawString(x + 12, 178, mode)
        c.setFillColor(MUTED); c.setFont(SANS, 7); c.drawString(x + 12, 163, desc)
        kind_map = {"line":"lines", "wire":"lines", "shape":"field", "glow":"glow", "water":"glow", "dust":"spark", "pearl":"spark", "sheer":"sheer"}
        for j, _ in enumerate(seq):
            draw_nail(c, x + 20 + j * 30, 120, 18, 55 + [0, 7, 11, 7, 0][j], palette[(j + i) % len(palette)], kind_map.get(seq[j], "solid"), i+j)
        c.setFillColor(MUTED); c.setFont(SANS, 6)
        c.drawCentredString(x + card_w/2, 76, " / ".join(seq))


def page4(c, images):
    title(c, 4, "ARTWORK PRESETS", "作品ネイルは、作品ごとに作者が数値を決める", "同じ生成式ではなく、作品の色・手・動きに合わせた固定プリセット")
    works = [
        ("01  色", images["color-pattern"], ["#D14F78", "#477D6C", "#E0B936", "#795A9F", "#C55D3D"], "長さ138 / ツヤ76 / ナチュラル", ["art","sheer","field","art","spark"]),
        ("02  表面", images["surface-gold"], ["#8A5D25", "#C18D3F", "#1F7772", "#D2AA63", "#A97737"], "長さ144 / ツヤ100 / ラウンド", ["art","sheer","art","field","spark"]),
        ("03  FORMWORK", images["sculpt-wire"], ["#E8DDD0", "#D4C4B3", "#F0E7DD", "#B8D9D2", "#E5D6C5"], "長さ112 / ツヤ42 / ナチュラル", ["lines","quiet","lines","art","spark"]),
        ("04  光", images["light-mandala"], ["#173F4D", "#202637", "#447C86", "#9C6681", "#BE4F77"], "長さ156 / ツヤ100 / アーモンド", ["glow","spark","glow","art","spark"]),
    ]
    cw, ch, gap = (W - 68 - 14) / 2, 164, 14
    positions = [(34, 260), (34 + cw + gap, 260), (34, 78), (34 + cw + gap, 78)]
    for (label, img, cols, spec, kinds), (x, y) in zip(works, positions):
        round_card(c, x, y, cw, ch, CARD, HexColor("#34363B"))
        draw_cover(c, img, x + 8, y + 8, 154, ch - 16)
        c.setFillColor(TEXT); c.setFont(SANS, 11); c.drawString(x + 178, y + ch - 28, label)
        c.setFillColor(MUTED); c.setFont(SANS, 7.5); c.drawString(x + 178, y + ch - 44, spec)
        for j, col in enumerate(cols):
            draw_nail(c, x + 190 + j * 37, y + 67, 23, 68 + [0, 7, 12, 7, 0][j], col, kinds[j], j)
        if "FORMWORK" in label:
            c.setFillColor(GOLD); c.setFont(SANS, 7.5); c.drawString(x + 178, y + 15, "男性の手に合わせ、短く・小さく・低光沢")
        elif "光" in label:
            c.setFillColor(MINT); c.setFont(SANS, 7.5); c.drawString(x + 178, y + 15, "長く、強い光沢と光の軌跡")
        else:
            c.setFillColor(MUTED); c.setFont(SANS, 7); c.drawString(x + 178, y + 15, "5本を同じ柄にせず、主役と余白を作る")


def page5(c, images):
    title(c, 5, "HOW TO EXPLAIN", "授業では、この順番で説明する", "約60秒で話せる要約")
    draw_cover(c, images["frame-0001-0240"], 34, 116, 260, 310)
    round_card(c, 315, 116, W - 349, 310, CARD2)
    steps = [
        ("1", "コピーではなく翻訳", "作品や写真を、そのまま爪に貼っていません。"),
        ("2", "特徴を数値化", "色、線、明暗、光、形をブラウザ内で読み取ります。"),
        ("3", "5本へ役割分担", "主役、つなぎ、光、余白として組み直します。"),
        ("4", "作者のルール", "何を読むか、どう並べるか、質感と長さは私が設計しています。"),
        ("5", "自分の手で完成", "MediaPipeで手を追跡し、2D Canvasで爪を重ねます。"),
    ]
    y = 390
    for no, head, body in steps:
        c.setFillColor(GOLD); c.circle(342, y - 2, 13, fill=1, stroke=0)
        c.setFillColor(BG); c.setFont(SANS, 8); c.drawCentredString(342, y - 5, no)
        c.setFillColor(TEXT); c.setFont(SANS, 11); c.drawString(366, y + 2, head)
        c.setFillColor(MUTED); c.setFont(SANS, 8); c.drawString(366, y - 14, body)
        y -= 56
    c.setFillColor(TEXT); c.setFont(SERIF, 15)
    c.drawString(34, 86, "生成AIが完成デザインを考えるのではない。")
    c.setFillColor(GOLD); c.setFont(SANS, 10)
    c.drawString(34, 64, "作者のネイル構成法を、プログラムとして実行している。")
    c.setFillColor(MUTED); c.setFont(SANS, 6.5)
    c.drawRightString(W - 34, 43, "画像: 艶 II 作品素材 / 規則: experience-prototype/index.html (mobile34)")


def build():
    names = ["color-pattern", "surface-gold", "sculpt-wire", "light-mandala", "hand-drawing", "frame-0001-0240"]
    images = {name: first_frame(name) for name in names}
    original, masked, palette = work_mask_and_palette(images["color-pattern"])
    c = canvas.Canvas(str(OUT), pagesize=landscape(A4), pageCompression=1)
    c.setTitle("艶 II - ネイルデザイン生成ルール 授業用図解")
    c.setAuthor("今福恵美子")
    page1(c, images); c.showPage()
    page2(c, original, masked, palette); c.showPage()
    page3(c, palette); c.showPage()
    page4(c, images); c.showPage()
    page5(c, images); c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()

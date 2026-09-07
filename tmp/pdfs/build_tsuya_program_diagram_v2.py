from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import json
import math
import os
import subprocess

import numpy as np
from PIL import Image
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

from build_tsuya_diagram import (
    ROOT, TMP, W, H, BG, CARD, CARD2, TEXT, MUTED, GOLD, PINK, MINT,
    SANS, SERIF, draw_cover, draw_contain, round_card, fit_text, title,
    arrow, draw_nail,
)


SOURCE = TMP / "van-gogh-sunflowers-public-domain.jpg"
FERRARI = TMP / "ferrari-f8-tributo-cc0.jpg"
OUT = ROOT / "output" / "pdf" / "艶II_ネイルデザイン生成ルール_授業用図解.pdf"
COMMONS_URL = "commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Sunflowers_(1888,_National_Gallery_London).jpg"
FERRARI_URL = "commons.wikimedia.org/wiki/File:Red_Ferrari_F8_Tributo_in_Foch_parking,_Paris_1.jpg"


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def analyse_source(path: Path):
    """experience-prototype/index.html mobile35 の分析式をPythonへ移植。"""
    with Image.open(path) as src:
        src = src.convert("RGB")
        ow, oh = src.size
        scale = max(160 / ow, 160 / oh)
        crop_w, crop_h = 160 / scale, 160 / scale
        left, top = (ow - crop_w) / 2, (oh - crop_h) / 2
        square = src.crop((left, top, left + crop_w, top + crop_h)).resize((160, 160), Image.Resampling.LANCZOS)

    # アプリが色・線・光を読む際の重みを同様に作る。PDF中ではこの処理は説明対象にしない。
    arr = np.asarray(square).astype(np.float32)
    ring = max(8, round(160 * .09))
    buckets = defaultdict(lambda: [0., 0., 0., 0.])
    for y in range(0, 160, 2):
        for x in range(0, 160, 2):
            if ring <= x < 160 - ring and ring <= y < 160 - ring:
                continue
            r, g, b = arr[y, x]
            q = buckets[(int(r) >> 4, int(g) >> 4, int(b) >> 4)]
            q[0] += r; q[1] += g; q[2] += b; q[3] += 1
    edge_colors = sorted(buckets.values(), key=lambda q: q[3], reverse=True)[:8]
    edge_colors = np.array([[q[0]/q[3], q[1]/q[3], q[2]/q[3]] for q in edge_colors])
    diff = arr[:, :, None, :] - edge_colors[None, None, :, :]
    dist = np.sqrt(diff[..., 0]**2*.30 + diff[..., 1]**2*.59 + diff[..., 2]**2*.11).min(axis=2)
    yy, xx = np.mgrid[0:160, 0:160]
    nx, ny = (xx/159-.5)/.5, (yy/159-.5)/.5
    center = np.maximum(0, 1-np.sqrt(nx*nx*.72+ny*ny))
    edge = np.minimum.reduce([xx, yy, 159-xx, 159-yy]) / ring
    raw = np.clip((dist-16)/58 + center*.52 - np.maximum(0, 1-edge)*.58, 0, 1)
    # 5x5 average
    pad = np.pad(raw, 2, mode="edge")
    smooth = sum(pad[oy:oy+160, ox:ox+160] for oy in range(5) for ox in range(5)) / 25
    weight = np.clip((smooth-.16)/.58, 0, 1)
    alpha = weight*weight*(3-2*weight)
    if (alpha > 48/255).sum() < 160*160*.12:
        alpha = np.clip(1.32-np.sqrt(nx*nx+ny*ny), 0, 1)
    rgba = Image.fromarray(np.dstack([arr.astype(np.uint8), np.uint8(alpha*255)]), "RGBA")
    sample = rgba.resize((96, 96), Image.Resampling.LANCZOS)
    data = np.asarray(sample).astype(np.float32)

    # 8色: 16刻みのRGBバケット、面積と彩度で得点化、近すぎる色はまとめる。
    color_buckets = defaultdict(lambda: [0., 0., 0., 0., 0.])
    for r, g, b, a8 in data.reshape(-1, 4):
        a = a8/255
        if a < .18:
            continue
        mx, mn = max(r, g, b), min(r, g, b)
        sat = (mx-mn)/mx if mx else 0
        light = (mx+mn)/510
        if (sat < .08 and (light > .84 or light < .14)) or light > .97:
            continue
        q = color_buckets[(int(r)>>4, int(g)>>4, int(b)>>4)]
        q[0] += r*a; q[1] += g*a; q[2] += b*a; q[3] += a; q[4] += sat*a
    candidates = []
    for q in color_buckets.values():
        r, g, b, amount, sat_sum = q[0]/q[3], q[1]/q[3], q[2]/q[3], q[3], q[4]/q[3]
        candidates.append({"rgb": np.array([r, g, b]), "amount": amount, "sat": sat_sum,
                           "score": amount*(.28+sat_sum*2.8)})
    fallback = ["#D8C4B8", "#806C65", "#ECE7DF", "#384047", "#B9977D", "#F7F4EF"]

    # アプリと同じ順序で画素をまとめ、同じ画像から同じ整数を作る。
    hash_value = 2166136261
    flat = data.reshape(-1, 4).astype(np.uint8)
    for r, g, b, alpha8 in flat[::4]:
        if int(alpha8) < 32:
            continue
        packed = ((int(r) >> 4) << 12) | ((int(g) >> 4) << 8) | ((int(b) >> 4) << 4) | (int(alpha8) >> 4)
        hash_value ^= packed
        hash_value = (hash_value * 16777619) & 0xFFFFFFFF

    state = (hash_value % 230000 + 137) * 9301 + 49297
    def next_number():
        nonlocal state
        state = (state * 9301 + 49297) % 233280
        return state / 233280
    palette_tunings = [
        {"base": .25 + next_number()*.06, "saturation": 2.75 + next_number()*.40},
        {"base": .30 + next_number()*.06, "saturation": 2.20 + next_number()*.45},
        {"base": .22 + next_number()*.06, "saturation": 3.05 + next_number()*.40},
    ]

    def choose_palette(tuning):
        ranked = sorted(candidates, key=lambda q: q["amount"]*(tuning["base"]+q["sat"]*tuning["saturation"]), reverse=True)
        chosen = []
        for q in ranked:
            if all(np.linalg.norm(q["rgb"]-p["rgb"]) > 48 for p in chosen):
                chosen.append(q)
            if len(chosen) >= 8:
                break
        for q in ranked:
            if len(chosen) >= 8:
                break
            if q not in chosen:
                chosen.append(q)
        colors = ["#%02X%02X%02X" % tuple(np.clip(q["rgb"], 0, 255).astype(int)) for q in chosen[:8]]
        for col in fallback:
            if len(colors) < 8 and col not in colors:
                colors.append(col)
        return colors[:8]

    palette_variants = [choose_palette(tuning) for tuning in palette_tunings]
    palette = palette_variants[0]

    # 明暗差・線密度・光・彩度。
    rgb, a = data[:, :, :3], data[:, :, 3]/255
    lum = .2126*rgb[:, :, 0] + .7152*rgb[:, :, 1] + .0722*rgb[:, :, 2]
    valid = a >= .12
    used = max(1, float(a[valid].sum()))
    avg = float((lum[valid]*a[valid]).sum()/used)
    variance = max(0, float(((lum[valid]**2)*a[valid]).sum()/used - avg*avg))
    mx = rgb.max(axis=2); mn = rgb.min(axis=2)
    sat = np.divide(mx-mn, mx, out=np.zeros_like(mx), where=mx!=0)
    sat_avg = float((sat[valid]*a[valid]).sum()/used)
    bright_ratio = float(a[(lum > 205) & valid].sum()/used)
    edge_sum = ex = ey = edge_count = 0.
    points = []
    for y in range(2, 94, 2):
        for x in range(2, 94, 2):
            w = min(a[y,x], a[y,x-1], a[y,x+1], a[y-1,x], a[y+1,x])
            if w < .16:
                continue
            gx, gy = lum[y,x+1]-lum[y,x-1], lum[y+1,x]-lum[y-1,x]
            m = math.hypot(gx, gy)*w; ang = math.atan2(gy, gx)
            edge_sum += m; edge_count += w
            ex += math.cos(ang*2)*m; ey += math.sin(ang*2)*m
            if m > 34:
                points.append({"x": x/95, "y": y/95, "m": min(1, m/180)})
    points.sort(key=lambda q: q["m"], reverse=True)
    density = clamp((edge_sum/max(1, edge_count))/62, .08, 1)
    contrast = clamp(math.sqrt(variance)/70, .05, 1)
    light_value = clamp(bright_ratio*3.4, .04, 1)
    saturation = clamp(sat_avg*1.45, .04, 1)
    angle = .5*math.atan2(ey, ex)
    return {
        "palette": palette[:8], "paletteVariants": palette_variants,
        "paletteTunings": palette_tunings, "sourceSeed": hash_value,
        "density": density, "contrast": contrast,
        "light": light_value, "saturation": saturation,
        "bright_ratio": bright_ratio, "angle": angle, "points": min(42, len(points)),
        "point_data": points[:42],
        "candidate_count": len(candidates),
    }


def render_app_sets(profile, stem):
    profile = dict(profile)
    profile["density"] = float(profile["density"])
    profile["contrast"] = float(profile["contrast"])
    profile["light"] = float(profile["light"])
    profile["saturation"] = float(profile["saturation"])
    profile["angle"] = float(profile["angle"])
    profile["bright_ratio"] = float(profile["bright_ratio"])
    profile["point_data"] = [
        {"x": float(q["x"]), "y": float(q["y"]), "m": float(q["m"])}
        for q in profile.get("point_data", [])
    ]
    profile["vars"] = {
        "sourceform": min(1, .25 + profile["density"]*.75),
        "sourcefield": min(1, .22 + profile["contrast"]*.72),
        "sourceglow": min(1, .25 + profile["light"]*.8),
        "stardust": .55,
        "line": .5,
    }
    json_path = TMP / f"{stem}-profile.json"
    json_path.write_text(json.dumps(profile, ensure_ascii=False), encoding="utf-8")
    script = Path(__file__).with_name("render_source_sets_exact.js")
    prefix = TMP / f"{stem}-app"
    env = dict(os.environ)
    env["NODE_PATH"] = "/Users/imafukuemiko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"
    subprocess.run([
        "/Users/imafukuemiko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node",
        str(script), str(json_path), str(prefix)
    ], check=True, env=env)
    return {name: Path(f"{prefix}-{key}.png") for name, key in [("流転","ruten"),("景層","keiso"),("残光","zanko")]}


def title6(c, page_no, kicker, heading, subtitle=None):
    title(c, page_no, kicker, heading, subtitle)
    c.setFillColor(BG); c.rect(W-72, 5, 42, 18, fill=1, stroke=0)
    c.setFillColor(MUTED); c.setFont(SANS, 7); c.drawRightString(W-34, 13, f"{page_no} / 9")


def draw_palette(c, palette, x, y, sw=50, gap=9, show_hex=True):
    for i, col in enumerate(palette):
        xx = x+i*(sw+gap)
        c.setFillColor(HexColor(col)); c.roundRect(xx, y, sw, 28, 6, fill=1, stroke=0)
        c.setFillColor(MUTED); c.setFont(SANS, 6)
        if show_hex: c.drawCentredString(xx+sw/2, y-10, col)


def set_colors(palette, idx):
    return [palette[idx%8], palette[(idx+3)%8], palette[(idx+1)%8], palette[(idx+4)%8], palette[(idx+2)%8]]


def draw_set(c, x, y, colors, looks, scale=1.0):
    kind = {"sourcefield":"field", "sourceform":"lines", "sourceglow":"glow",
            "line":"lines", "stardust":"spark", "pearl":"spark", "sheer":"sheer",
            "matte":"solid", "onecolor":"solid"}
    hs = [56, 66, 72, 66, 58]
    for i in range(5):
        draw_nail(c, x+i*37*scale, y, 23*scale, hs[i]*scale, colors[i], kind.get(looks[i], "solid"), i+7)


def percent_bar(c, x, y, w, value, color, label, detail):
    c.setFillColor(TEXT); c.setFont(SANS, 10); c.drawString(x, y+17, label)
    c.setFillColor(MUTED); c.setFont(SANS, 7); c.drawString(x+82, y+18, detail)
    c.setFillColor(HexColor("#303238")); c.roundRect(x, y, w, 10, 5, fill=1, stroke=0)
    c.setFillColor(color); c.roundRect(x, y, max(6, w*value), 10, 5, fill=1, stroke=0)
    c.setFillColor(TEXT); c.setFont(SANS, 9); c.drawRightString(x+w+38, y+1, f"{round(value*100)}")


def page1(c, profile, sets):
    title6(c, 1, "PROGRAM OVERVIEW", "1枚の画像から、5本のネイルを作る", "授業用の実例：フィンセント・ファン・ゴッホ《ひまわり》1888年")
    draw_contain(c, SOURCE, 34, 172, 230, 280)
    c.setFillColor(GOLD); c.setFont(SANS, 8); c.drawString(34, 155, "INPUT  /  PUBLIC DOMAIN")
    stages = [
        ("1", "色を8色選ぶ", "面積 + 彩度で順位を付ける"),
        ("2", "割合を0-100にする", "線・明るさ・明暗差を数値化"),
        ("3", "5本へ分配する", "1・4・2・5・3番目の色を使う"),
        ("4", "模様の強さを決める", "線密度・光・明暗差を式に入れる"),
    ]
    for i, (no, head, body) in enumerate(stages):
        y = 393-i*63
        round_card(c, 300, y, 510, 50, CARD2)
        c.setFillColor(GOLD); c.circle(324, y+25, 13, fill=1, stroke=0)
        c.setFillColor(BG); c.setFont(SANS, 8); c.drawCentredString(324, y+22, no)
        c.setFillColor(TEXT); c.setFont(SANS, 11); c.drawString(348, y+29, head)
        c.setFillColor(MUTED); c.setFont(SANS, 8); c.drawString(348, y+13, body)
    c.setFillColor(TEXT); c.setFont(SANS, 14); c.drawString(300, 123, "出力例  /  MIX - 流転")
    draw_contain(c, sets["流転"], 316, 45, 250, 68)
    c.setFillColor(MUTED); c.setFont(SANS, 7)
    c.drawString(520, 78, "画像は貼らず、色と数値だけをネイルの描画ルールへ渡す。")


def page2(c, profile):
    title6(c, 2, "COLOR EXTRACTION", "色は「多さ」と「彩度」で選ぶ", "ゴッホ《ひまわり》を実際のプログラムに入れた例")
    draw_contain(c, SOURCE, 34, 205, 200, 245)
    steps = [
        ("1  96 x 96", "画像を96×96画素へ縮小する"),
        ("2  RGB / 16", "R・G・Bを16刻みの箱にまとめる"),
        ("3  SCORE", "得点 = その色の量 × 色の強調係数"),
        ("4  DISTANCE", "RGBの距離が48以下の近い色は重複させない"),
        ("5  TOP 8", "得点が高い順に8色を残す"),
    ]
    for i, (code, body) in enumerate(steps):
        y = 405-i*49
        round_card(c, 270, y, 538, 38, CARD)
        c.setFillColor(GOLD); c.setFont(SANS, 8); c.drawString(286, y+14, code)
        c.setFillColor(TEXT); c.setFont(SANS, 9); c.drawString(390, y+14, body)
    c.setFillColor(TEXT); c.setFont(SANS, 15); c.drawString(34, 164, "プログラムが選んだ8色")
    draw_palette(c, profile["palette"], 34, 113, 62, 20)
    round_card(c, 690, 91, 118, 90, CARD2)
    c.setFillColor(GOLD); c.setFont(SANS, 8); c.drawString(705, 159, "ここでの「割合」")
    fit_text(c, "強調係数 = 0.28 + 彩度 x 2.8。無彩色は0.28、最高彩度は3.08。", 705, 142, 88, 7.5, 13, TEXT, SANS, 5)


def page3(c, profile):
    title6(c, 3, "NUMERIC FEATURES", "線・光・明暗差を0-100の割合にする", "右の数字は《ひまわり》を解析した実測値")
    rows = [
        ("LINE  線密度", profile["density"], PINK, "隣り合う画素の明るさの差を合計 ÷ 62"),
        ("LIGHT  光の割合", profile["light"], GOLD, "明るさ205以上の面積比 × 3.4"),
        ("CONTRAST  明暗差", profile["contrast"], MINT, "明るさのばらつきの平方根 ÷ 70"),
        ("SATURATION  彩度", profile["saturation"], HexColor("#9B79C5"), "全画素の平均彩度 × 1.45"),
    ]
    for i, (lab, val, col, detail) in enumerate(rows):
        y = 391-i*78
        round_card(c, 34, y-18, 774, 61, CARD)
        percent_bar(c, 54, y, 420, val, col, lab, detail)
    round_card(c, 34, 72, 365, 72, CARD2)
    c.setFillColor(GOLD); c.setFont(SANS, 9); c.drawString(52, 122, "線の向き")
    c.setFillColor(TEXT); c.setFont(SANS, 10); c.drawString(52, 100, f"明暗の境界の方向を平均する  →  {round(profile['angle']*180/math.pi)}°")
    round_card(c, 417, 72, 391, 72, CARD2)
    c.setFillColor(GOLD); c.setFont(SANS, 9); c.drawString(435, 122, "強い形の点")
    c.setFillColor(TEXT); c.setFont(SANS, 10); c.drawString(435, 100, f"明暗差が34を超えた点を、強い順に最大42点  →  {profile['points']}点")
    c.setFillColor(MUTED); c.setFont(SANS, 7)
    c.drawString(34, 52, "※ すべて最小値と最大値を設け、0や過剰な値にならないよう制限している。")


def page4(c, profile, sets):
    title6(c, 4, "DESIGN RULE", "デザインは「画像」と「作者の設計」で決める", "画像の内容が変わっても、5本を作品としてまとめる構成は変わらない")
    round_card(c, 34, 326, 352, 116, CARD)
    c.setFillColor(PINK); c.setFont(SANS, 10); c.drawString(54, 414, "IMAGE  /  画像が決める")
    fit_text(c, "8色の配色・線の多さ・明暗差・光の量・線の向き・特徴点", 54, 389, 312, 10, 18, TEXT, SANS, 3)
    round_card(c, 456, 326, 352, 116, CARD)
    c.setFillColor(GOLD); c.setFont(SANS, 10); c.drawString(476, 414, "AUTHOR  /  作者が決める")
    fit_text(c, "5本の色順・指ごとの模様・3案の役割・形・長さ・ツヤ・濃さ", 476, 389, 312, 10, 18, TEXT, SANS, 3)
    arrow(c, 386, 384, 456, 384)

    c.setFillColor(TEXT); c.setFont(SANS, 14); c.drawString(34, 286, "5本の配色ルール")
    labels = [("抽出1位",0),("抽出4位",3),("抽出2位",1),("抽出5位",4),("抽出3位",2)]
    roles = [("親指","主役"),("人差し指","流れ"),("中指","密度"),("薬指","光"),("小指","余白")]
    for i, ((lab, idx), (finger, role)) in enumerate(zip(labels, roles)):
        x=83+i*150
        c.setFillColor(HexColor(profile["palette"][idx])); c.circle(x, 235, 27, fill=1, stroke=0)
        c.setFillColor(TEXT); c.setFont(SANS, 9); c.drawCentredString(x, 195, finger)
        c.setFillColor(GOLD); c.setFont(SANS, 7); c.drawCentredString(x, 179, role)
        c.setFillColor(MUTED); c.setFont(SANS, 7); c.drawCentredString(x, 162, lab)
        if i<4: arrow(c, x+38, 235, x+112, 235)
    round_card(c, 34, 68, 774, 62, CARD2)
    c.setFillColor(GOLD); c.setFont(SANS, 9); c.drawString(52, 108, "なぜ 1・4・2・5・3 の順番なのか")
    fit_text(c, "似た色が隣り合わず、主色と差し色がリズムよく並ぶように、作者が固定した配列。これは画像認識の答えではなく、今福恵美子のネイル構成ルール。", 52, 89, 735, 8.6, 14, TEXT, SANS, 3)


def page5(c, profile, sets):
    title6(c, 5, "CANVAS DRAWING", "色だけでなく、線・形・光をプログラムが描く", "写真を爪に貼るのではなく、解析した数値をCanvasの描画命令へ渡す")
    cards = [
        ("01  採集した線", "sourceform", "線密度 + 方向", "4 + (LINE x .55 + 強さ x .45) x 18本", "sourceform"),
        ("02  採集した形", "sourcefield", "明暗差 + 特徴点", "7 + 強さ x 17個の楕円・菱形", "sourcefield"),
        ("03  採集した光", "sourceglow", "明るい面積 + 色", "5 + 強さ x 16 + LIGHT x 12個", "sourceglow"),
    ]
    colors=set_colors(profile["palette"],0)
    for i,(head,code,src,draw,key) in enumerate(cards):
        x=34+i*260
        round_card(c,x,206,244,235,CARD,HexColor("#34363B"))
        c.setFillColor(GOLD);c.setFont(SANS,9);c.drawString(x+16,416,head)
        c.setFillColor(MUTED);c.setFont(SANS,7);c.drawString(x+16,397,code+"()")
        draw_set(c,x+31,294,[colors[i]]*5,[key]*5,.76)
        c.setFillColor(TEXT);c.setFont(SANS,8);c.drawString(x+16,260,"入力  /  "+src)
        c.setFillColor(MUTED);c.setFont(SANS,7);c.drawString(x+16,241,"描画  /  "+draw)
    round_card(c,34,89,774,85,CARD2)
    c.setFillColor(TEXT);c.setFont(SANS,11);c.drawString(52,146,"同じ写真なら、同じネイルが出る")
    fit_text(c, "模様の描画に使う乱数は、指番号を種にした再現可能な乱数。そのため、毎回ばらばらにはならず、作者が設計した同じセットを再現できる。", 52, 124, 735, 9, 15, TEXT, SANS, 3)


def page6(c, profile, sets):
    title6(c, 6, "SUNFLOWERS / THREE SETS", "《ひまわり》から作った3種類", "アプリ本体と同じCanvas描画関数で生成")
    c.setFillColor(TEXT); c.setFont(SANS, 14); c.drawString(34, 433, "第1案 流転 の色配列")
    labels = [("1番目",0,"palette[0]"),("4番目",3,"palette[3]"),("2番目",1,"palette[1]"),("5番目",4,"palette[4]"),("3番目",2,"palette[2]")]
    for i, (lab, idx, code) in enumerate(labels):
        x = 70+i*132
        c.setFillColor(HexColor(profile["palette"][idx])); c.circle(x, 374, 31, fill=1, stroke=0)
        c.setFillColor(TEXT); c.setFont(SANS, 9); c.drawCentredString(x, 329, lab)
        c.setFillColor(MUTED); c.setFont(SANS, 7); c.drawCentredString(x, 314, code)
        if i<4: arrow(c, x+42, 374, x+90, 374)
    recipes = [
        ("01  流転", "流転", "形 / 線 / 形 / 光 / 単色"),
        ("02  景層", "景層", "線 / 透け / 形 / 粒子 / 単色"),
        ("03  残光", "残光", "形 / 金線 / 光 / パール / マット"),
    ]
    for i, (name, key, desc) in enumerate(recipes):
        x = 34+i*260
        round_card(c, x, 102, 244, 160, CARD, HexColor("#34363B"))
        c.setFillColor(GOLD); c.setFont(SANS, 10); c.drawString(x+14, 238, name)
        draw_contain(c, sets[key], x+14, 139, 216, 78)
        c.setFillColor(MUTED); c.setFont(SANS, 6.5)
        c.drawCentredString(x+122, 119, desc)
    c.setFillColor(TEXT); c.setFont(SANS, 9)
    c.drawString(34, 74, "3案は色の起点を1つずつずらし、同じ画像から異なるリズムを作る。")


def page7(c, profile, sets):
    title6(c, 7, "FERRARI / SECOND EXAMPLE", "車の写真を入れた場合", "Ferrari F8 Tributo / CC0写真を同じプログラムで解析")
    draw_cover(c, FERRARI, 34, 218, 330, 234)
    c.setFillColor(GOLD); c.setFont(SANS, 8); c.drawString(34, 202, "INPUT  /  FERRARI F8 TRIBUTO  /  CC0")
    c.setFillColor(TEXT); c.setFont(SANS, 14); c.drawString(394, 424, "抽出された8色")
    draw_palette(c, profile["palette"], 394, 375, 43, 8, False)
    rows=[("LINE",profile["density"],PINK),("LIGHT",profile["light"],GOLD),("CONTRAST",profile["contrast"],MINT),("SATURATION",profile["saturation"],HexColor("#9B79C5"))]
    for i,(lab,val,col) in enumerate(rows): percent_bar(c,394,329-i*44,250,val,col,lab,"")
    cards=[("流転","形と線の流れ"),("景層","車体色と面の層"),("残光","反射と光沢")]
    for i,(key,desc) in enumerate(cards):
        x=34+i*260
        round_card(c,x,58,244,132,CARD,HexColor("#34363B"))
        c.setFillColor(GOLD);c.setFont(SANS,9);c.drawString(x+13,168,f"0{i+1}  {key}")
        draw_contain(c,sets[key],x+10,78,224,80)
        c.setFillColor(MUTED);c.setFont(SANS,6.5);c.drawCentredString(x+122,67,desc)
    c.setFillColor(MUTED);c.setFont(SANS,6.2);c.drawRightString(W-34,41,f"写真: Mathious Ier / CC0 / Wikimedia Commons / {FERRARI_URL}")


def page8(c, profile, sets):
    title6(c, 8, "PROGRAMMED INTENSITY", "画像の割合が、模様の強さに変わる", "最後にネイルの描画関数へ数値を渡す")
    formulas = [
        ("FORM  線と形", ".25 + LINE x .75", min(1,.25+profile["density"]*.75), PINK),
        ("景層  面と明暗", ".22 + CONTRAST x .72", min(1,.22+profile["contrast"]*.72), MINT),
        ("残光  輝き", ".25 + LIGHT x .80", min(1,.25+profile["light"]*.8), GOLD),
    ]
    for i, (lab, formula, value, col) in enumerate(formulas):
        y = 397-i*93
        round_card(c, 34, y-24, 460, 74, CARD2)
        c.setFillColor(col); c.setFont(SANS, 11); c.drawString(52, y+24, lab)
        c.setFillColor(TEXT); c.setFont(SANS, 12); c.drawString(52, y+1, formula)
        c.setFillColor(MUTED); c.setFont(SANS, 8); c.drawString(260, y+2, f"= {value:.2f}  →  {round(value*100)}%")
    round_card(c, 520, 186, 288, 261, CARD)
    c.setFillColor(TEXT); c.setFont(SANS, 14); c.drawString(542, 417, "完成する5本")
    draw_contain(c, sets["流転"], 540, 285, 250, 94)
    c.setFillColor(GOLD); c.setFont(SANS, 9); c.drawString(542, 246, "共通の固定値")
    fit_text(c, "濃さ 96 / 大きさ 95 / 長さ 118 / 形 ナチュラル / ツヤ 96", 542, 225, 242, 9, 16, TEXT, SANS, 3)
    round_card(c, 34, 72, 774, 74, CARD)
    c.setFillColor(GOLD); c.setFont(SANS, 9); c.drawString(52, 124, "授業での説明")
    fit_text(c, "「色を面積と彩度で8色に絞り、線・光・明暗差を0から100にします。その数値を作者が決めた式と、5本の配列表に入れてネイルを描いています。」", 52, 104, 735, 10.5, 17, TEXT, SANS, 3)
    c.setFillColor(MUTED); c.setFont(SANS, 6.2)
    c.drawRightString(W-34, 41, f"画像: Vincent van Gogh, Sunflowers, 1888 / Public Domain / Wikimedia Commons / {COMMONS_URL}")


def page9(c, profile):
    title6(c, 9, "SEEDED VARIATION", "同じ画像から同じ3案を再現する", "数値を自由に変えず、決めた範囲の中だけを画像ごとに動かす")
    steps = [
        ("01", "画像の色を順番に読む", "各画素の色と透明度を、小さな数へまとめる"),
        ("02", "画像ごとの番号を作る", "画像全体から、一つの整数を計算する"),
        ("03", "番号から0〜1の数を作る", "同じ番号なら、同じ数が同じ順番で出る"),
        ("04", "色選びの強さを少し変える", "3案ごとに決めた上限と下限の中だけで動かす"),
    ]
    for i, (no, head, body) in enumerate(steps):
        y = 405-i*72
        c.setFillColor(PINK if i == 0 else GOLD); c.circle(58, y+22, 15, fill=1, stroke=0)
        c.setFillColor(BG); c.setFont(SANS, 7); c.drawCentredString(58, y+19, no)
        c.setFillColor(TEXT); c.setFont(SANS, 11); c.drawString(88, y+27, head)
        c.setFillColor(MUTED); c.setFont(SANS, 8); c.drawString(88, y+9, body)
        if i < 3:
            c.setStrokeColor(HexColor("#34363B")); c.line(88, y-12, 432, y-12)

    c.setFillColor(TEXT); c.setFont(SANS, 13); c.drawString(470, 428, "3案で変える範囲")
    rows = [
        ("流転", ".25〜.31", "2.75〜3.15", PINK),
        ("景層", ".30〜.36", "2.20〜2.65", MINT),
        ("残光", ".22〜.28", "3.05〜3.45", GOLD),
    ]
    for i, (name, base_range, sat_range, col) in enumerate(rows):
        y = 343-i*73
        round_card(c, 470, y, 338, 54, CARD)
        c.setFillColor(col); c.setFont(SANS, 10); c.drawString(486, y+20, name)
        c.setFillColor(TEXT); c.setFont(SANS, 10); c.drawString(576, y+20, base_range); c.drawString(706, y+20, sat_range)
    c.setFillColor(MUTED); c.setFont(SANS, 7)
    c.drawString(470, 404, "案"); c.drawString(558, 404, "低彩度色を残す量"); c.drawString(680, 404, "鮮やかな色を強める量")

    round_card(c, 470, 87, 338, 76, CARD2)
    c.setFillColor(GOLD); c.setFont(SANS, 9); c.drawString(488, 140, "変えないもの")
    fit_text(c, "5本の模様の順番、爪の形と長さ、線・形・光の描き方、手の追跡", 488, 119, 300, 8.5, 14, TEXT, SANS, 3)
    c.setFillColor(TEXT); c.setFont(SANS, 10)
    c.drawCentredString(W/2, 49, "同じ画像 → 同じ番号 → 同じ変化　／　別の画像 → 別の番号 → 少し違う変化")


def build():
    for source in (SOURCE, FERRARI):
        if not source.exists(): raise FileNotFoundError(source)
    profile = analyse_source(SOURCE)
    ferrari_profile = analyse_source(FERRARI)
    sets = render_app_sets(profile, "sunflowers")
    ferrari_sets = render_app_sets(ferrari_profile, "ferrari")
    c = canvas.Canvas(str(OUT), pagesize=landscape(A4), pageCompression=1)
    c.setTitle("艶 II - 画像からネイルを生成するプログラム 授業用図解")
    c.setAuthor("今福恵美子")
    page1(c, profile, sets); c.showPage()
    page2(c, profile); c.showPage()
    page3(c, profile); c.showPage()
    page4(c, profile, sets); c.showPage()
    page5(c, profile, sets); c.showPage()
    page6(c, profile, sets); c.showPage()
    page7(c, ferrari_profile, ferrari_sets); c.showPage()
    page8(c, profile, sets); c.showPage()
    page9(c, profile); c.showPage()
    c.save()
    print(OUT)
    print("sunflowers", profile)
    print("ferrari", ferrari_profile)


if __name__ == "__main__":
    build()

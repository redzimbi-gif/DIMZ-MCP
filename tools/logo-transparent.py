#!/usr/bin/env python3
"""Détoure et recadre le logo DIMZ pour l'utiliser dans la bande titre du site.

Le logo source (img/logo-dimz-blue.png) est encodé en RGB sans canal alpha :
son fond blanc est opaque. Posé tel quel dans le bandeau, il afficherait un
rectangle blanc — très visible en mode sombre. Il contient aussi une rangée de
pictogrammes (Trouvez / Sécuriser / Accompagner / Livrer) qui n'a pas sa place
dans un bandeau de 40px de haut, et qui fait doublon avec les piliers du pied
de page.

Ce script produit img/logo-dimz-full.png : voiture + DIMZ + « MON COPILOTE
AUTO », sur fond transparent.

Aucune dépendance (ni PIL, ni ImageMagick) : aller-retour PNG en Python pur.
À relancer si le logo source change :

    python3 tools/logo-transparent.py
"""

import struct
import zlib

SRC = "img/logo-dimz-blue.png"
DST = "img/logo-dimz-full.png"
DST_DARK = "img/logo-dimz-full-dark.png"

# Le logo est écrit en noir : sur le bandeau en mode sombre (--bg-raised
# #121722), « DIMZ » et « MON COPILOTE AUTO » seraient illisibles. On génère
# donc une seconde version où l'encre neutre passe en clair (--ink du thème
# sombre), le bleu de la marque restant intact.
DARK_INK = (0xED, 0xEF, 0xF3)

# Le contenu à garder s'arrête avant la rangée de pictogrammes. Les bandes de
# lignes entièrement blanches du fichier source donnent la découpe exacte :
#   0-114 marge, 115-419 voiture + DIMZ, 420-461 blanc, 462-489 baseline,
#   490-524 blanc, 525-638 pictogrammes, 639-649 marge.
# On coupe donc dans la bande blanche 490-524.
CROP_TOP = 100
CROP_BOTTOM = 505  # exclu

# Un pixel compte comme « du contenu » en dessous de ce niveau de blanc.
INK_THRESHOLD = 245

# Le « blanc » du fichier source n'est pas 255 mais 253-254 (bruit de
# compression) : sans plancher, tout le fond ressortirait à alpha 1-2 au lieu
# de 0, soit un voile noirâtre sur toute l'image. En dessous de ce seuil, on
# force la transparence complète, puis on réétale l'alpha restant pour ne pas
# écorner l'anticrénelage des bords.
ALPHA_NOISE_FLOOR = 10


def read_png_rgb(path):
    """Renvoie (largeur, hauteur, bytearray RGB) — PNG 8 bits/canal, non entrelacé."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"{path} : ce n'est pas un PNG")

    idat = b""
    pos = 8
    width = height = colortype = bitdepth = interlace = None
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        ctype = data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + length]
        if ctype == b"IHDR":
            width, height, bitdepth, colortype, _, _, interlace = struct.unpack(">IIBBBBB", body)
        elif ctype == b"IDAT":
            idat += body
        elif ctype == b"IEND":
            break
        pos += 12 + length

    if bitdepth != 8 or colortype != 2 or interlace != 0:
        raise SystemExit(
            f"{path} : attendu RGB 8 bits non entrelacé "
            f"(bitdepth={bitdepth}, colortype={colortype}, interlace={interlace})"
        )

    raw = zlib.decompress(idat)
    bpp, stride = 3, width * 3
    out = bytearray(height * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(height):
        f = raw[p]
        p += 1
        line = bytearray(raw[p : p + stride])
        p += stride
        if f == 1:  # Sub
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 255
        elif f == 2:  # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif f == 3:  # Average
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:  # Paeth
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                c = prev[i - bpp] if i >= bpp else 0
                b = prev[i]
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        elif f != 0:
            raise SystemExit(f"{path} : filtre PNG inconnu {f} ligne {y}")
        out[y * stride : (y + 1) * stride] = line
        prev = line
    return width, height, out


def content_columns(width, stride, pixels, top, bottom):
    """Bornes horizontales du contenu (hors blanc) dans la bande [top, bottom)."""
    left, right = width, -1
    for y in range(top, bottom):
        row = y * stride
        for x in range(width):
            o = row + x * 3
            if min(pixels[o], pixels[o + 1], pixels[o + 2]) < INK_THRESHOLD:
                if x < left:
                    left = x
                if x > right:
                    right = x
    if right < 0:
        raise SystemExit("aucun contenu trouvé dans la zone de recadrage")
    return left, right


def unmultiply_white(pixels, stride, top, bottom, left, right):
    """RGB sur fond blanc -> RGBA détouré.

    alpha = 255 - min(r,g,b), puis on « démultiplie » la couleur pour retirer
    la part de blanc qu'elle contient. Le blanc pur devient transparent, le
    noir reste noir, et les bords anticrénelés restent propres — là où un
    simple seuillage laisserait un liseré blanc.
    """
    out = bytearray()
    for y in range(top, bottom):
        row = y * stride
        for x in range(left, right + 1):
            o = row + x * 3
            r, g, b = pixels[o], pixels[o + 1], pixels[o + 2]
            a = 255 - min(r, g, b)
            if a <= ALPHA_NOISE_FLOOR:
                out += b"\x00\x00\x00\x00"
                continue
            a = round((a - ALPHA_NOISE_FLOOR) * 255 / (255 - ALPHA_NOISE_FLOOR))
            scale = a / 255.0
            white = 255.0 * (1.0 - scale)
            out += bytes(
                (
                    max(0, min(255, round((r - white) / scale))),
                    max(0, min(255, round((g - white) / scale))),
                    max(0, min(255, round((b - white) / scale))),
                    a,
                )
            )
    return out


def recolor_neutral_ink(rgba, ink):
    """Copie de l'image où l'encre neutre (noire) prend la couleur `ink`.

    Le logo n'utilise que deux encres : le noir et le bleu de la marque. On
    distingue les deux sur le seul écart bleu/rouge — le bleu de marque a un
    canal bleu très supérieur au rouge, le noir et les gris n'en ont aucun.
    L'alpha n'est jamais touché : l'anticrénelage des bords reste intact.
    """
    out = bytearray(rgba)
    for i in range(0, len(out), 4):
        if out[i + 3] == 0:
            continue
        r, b = out[i], out[i + 2]
        if b - r > 40:  # bleu de la marque : on le laisse tel quel
            continue
        out[i], out[i + 1], out[i + 2] = ink
    return out


def write_png_rgba(path, width, height, rgba):
    def chunk(ctype, body):
        return (
            struct.pack(">I", len(body))
            + ctype
            + body
            + struct.pack(">I", zlib.crc32(ctype + body) & 0xFFFFFFFF)
        )

    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw += b"\x00"  # filtre 0 (None)
        raw += rgba[y * stride : (y + 1) * stride]

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    open(path, "wb").write(png)


def main():
    width, height, pixels = read_png_rgb(SRC)
    stride = width * 3
    print(f"source : {width}x{height}")

    top, bottom = CROP_TOP, min(CROP_BOTTOM, height)
    left, right = content_columns(width, stride, pixels, top, bottom)
    # Une petite marge latérale, pour ne pas coller au bord.
    left = max(0, left - 8)
    right = min(width - 1, right + 8)

    out_w, out_h = right - left + 1, bottom - top
    rgba = unmultiply_white(pixels, stride, top, bottom, left, right)
    write_png_rgba(DST, out_w, out_h, rgba)
    print(f"écrit  : {DST} — {out_w}x{out_h} RGBA")

    write_png_rgba(DST_DARK, out_w, out_h, recolor_neutral_ink(rgba, DARK_INK))
    print(f"écrit  : {DST_DARK} — encre neutre en clair pour le mode sombre")


if __name__ == "__main__":
    main()

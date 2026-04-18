from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "assets" / "referral" / "source"
OUTPUT_DIR = ROOT / "public" / "assets" / "referral" / "generated"


@dataclass(frozen=True)
class VariantCopy:
    source_name: str
    eyebrow: str
    headline: str
    body: str
    accent: str


COPY: dict[str, dict[int, VariantCopy]] = {
    "ru": {
        1: VariantCopy(
            source_name="Photo1.png",
            eyebrow="Tarotolog AI",
            headline="Персональные\nрасклады,\nкоторые попадают\nв суть",
            body="Любовь, деньги, отношения, карта дня и глубокие ответы в одном mini app.",
            accent="Заберите бонусную энергию",
        ),
        2: VariantCopy(
            source_name="Photo2.png",
            eyebrow="Tarotolog AI",
            headline="Откройте\nразные колоды\nи найдите свою",
            body="Классика, Манара, Ленорман, Золотое Таро и другие сценарии для разных вопросов.",
            accent="Ваш путь начинается здесь",
        ),
        3: VariantCopy(
            source_name="Photo3.png",
            eyebrow="Tarotolog AI",
            headline="Гороскоп,\nнумерология\nи матрица судьбы",
            body="Смотрите ежедневные подсказки и личные прогнозы без лишних шагов прямо в Telegram.",
            accent="Личный эзотерический кабинет",
        ),
        4: VariantCopy(
            source_name="Photo4.png",
            eyebrow="Tarotolog AI",
            headline="Пригласите друга\nи копите энергию",
            body="За активацию и первую покупку друга вы получаете бонусный ресурс для раскладов и прогнозов.",
            accent="+2 и +10 энергии бонусом",
        ),
    },
    "en": {
        1: VariantCopy(
            source_name="Photo1.png",
            eyebrow="Tarotolog AI",
            headline="Personal\nreadings that\nhit the core",
            body="Love, money, relationships, the card of the day and deeper insights in one mini app.",
            accent="Claim bonus energy",
        ),
        2: VariantCopy(
            source_name="Photo2.png",
            eyebrow="Tarotolog AI",
            headline="Explore\ndifferent decks\nand find yours",
            body="Classic Tarot, Manara, Lenormand, Golden Tarot and more paths for different questions.",
            accent="Your path starts here",
        ),
        3: VariantCopy(
            source_name="Photo3.png",
            eyebrow="Tarotolog AI",
            headline="Horoscope,\nnumerology and\ndestiny matrix",
            body="Get daily guidance and personal forecasts without extra friction right inside Telegram.",
            accent="Your spiritual dashboard",
        ),
        4: VariantCopy(
            source_name="Photo4.png",
            eyebrow="Tarotolog AI",
            headline="Invite a friend\nand stack energy",
            body="You receive bonus energy after a friend's activation and first purchase in the mini app.",
            accent="+2 and +10 bonus energy",
        ),
    },
}


def _font(candidates: Sequence[str], size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


HEADLINE_FONT = _font(
    [
        "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
        "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ],
    68,
)
BODY_FONT = _font(
    [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/HelveticaNeue.ttc",
        "/System/Library/Fonts/Avenir.ttc",
    ],
    30,
)
EYEBROW_FONT = _font(
    [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Avenir.ttc",
    ],
    24,
)
ACCENT_FONT = _font(
    [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Avenir.ttc",
    ],
    26,
)


def _rounded_rect(size: tuple[int, int], radius: int, fill: tuple[int, int, int, int]) -> Image.Image:
    mask = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=fill)
    return mask


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> str:
    wrapped_lines: list[str] = []
    for paragraph in text.splitlines():
        words = paragraph.split()
        if not words:
            wrapped_lines.append("")
            continue
        current = words[0]
        for word in words[1:]:
            candidate = f"{current} {word}"
            if draw.textlength(candidate, font=font) <= max_width:
                current = candidate
            else:
                wrapped_lines.append(current)
                current = word
        wrapped_lines.append(current)
    return "\n".join(wrapped_lines)


def _draw_text_block(draw: ImageDraw.ImageDraw, *, x: int, y: int, width: int, copy: VariantCopy) -> None:
    draw.text((x, y), copy.eyebrow.upper(), font=EYEBROW_FONT, fill=(218, 197, 245, 220), spacing=6)

    headline_y = y + 58
    wrapped_headline = _wrap_text(draw, copy.headline, HEADLINE_FONT, width)
    draw.multiline_text(
        (x, headline_y),
        wrapped_headline,
        font=HEADLINE_FONT,
        fill=(245, 239, 255, 255),
        spacing=8,
    )

    headline_box = draw.multiline_textbbox((x, headline_y), wrapped_headline, font=HEADLINE_FONT, spacing=8)
    body_y = headline_box[3] + 34
    wrapped_body = _wrap_text(draw, copy.body, BODY_FONT, width)
    draw.multiline_text(
        (x, body_y),
        wrapped_body,
        font=BODY_FONT,
        fill=(229, 220, 242, 235),
        spacing=8,
    )

    body_box = draw.multiline_textbbox((x, body_y), wrapped_body, font=BODY_FONT, spacing=8)
    accent_y = body_box[3] + 46
    accent_box = (x, accent_y, x + width, accent_y + 86)
    draw.rounded_rectangle(
        accent_box,
        radius=26,
        fill=(242, 207, 148, 26),
        outline=(242, 207, 148, 92),
        width=2,
    )
    draw.text((x + 24, accent_y + 25), copy.accent, font=ACCENT_FONT, fill=(55, 36, 17, 255))


def render_variant(language: str, variant: int, copy: VariantCopy) -> None:
    image = Image.open(SOURCE_DIR / copy.source_name).convert("RGBA")
    image = image.resize((1536, 1024))

    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    panel = _rounded_rect((530, 860), 42, (21, 14, 31, 154))
    panel = panel.filter(ImageFilter.GaussianBlur(0.2))
    overlay.alpha_composite(panel, (900, 88))

    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.rounded_rectangle(
        (900, 88, 1430, 948),
        radius=42,
        outline=(192, 147, 255, 80),
        width=2,
    )
    glow = glow.filter(ImageFilter.GaussianBlur(6))
    overlay = Image.alpha_composite(overlay, glow)

    vignette = Image.new("RGBA", image.size, (0, 0, 0, 0))
    vignette_draw = ImageDraw.Draw(vignette)
    vignette_draw.rectangle((840, 0, 1536, 1024), fill=(13, 8, 20, 74))
    vignette = vignette.filter(ImageFilter.GaussianBlur(30))
    overlay = Image.alpha_composite(overlay, vignette)

    composed = Image.alpha_composite(image, overlay)
    draw = ImageDraw.Draw(composed)

    _draw_text_block(draw, x=944, y=146, width=442, copy=copy)

    output_path = OUTPUT_DIR / f"referral-share-{variant}-{language}.png"
    composed.convert("RGB").save(output_path, quality=95)
    print(f"generated {output_path}")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for language, variants in COPY.items():
        for variant, copy in variants.items():
            render_variant(language, variant, copy)


if __name__ == "__main__":
    main()

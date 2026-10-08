import io
import os
import re
import base64
from typing import Optional, Dict, Any
from PIL import Image, ImageOps

# A4 dimensions in typographic points (1/72 inch)
A4_WIDTH_PT = 595.276
A4_HEIGHT_PT = 841.890
A4_RATIO = A4_WIDTH_PT / A4_HEIGHT_PT  # ~0.70707

# A4 dimensions in inches
A4_WIDTH_IN = 8.2677   # 210mm
A4_HEIGHT_IN = 11.6929 # 297mm

# Maximum supported upload size: 10 Megabytes
MAX_COVER_IMAGE_BYTES = 10 * 1024 * 1024

# Allowed PIL formats
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}


DEFAULT_OFFICIAL_COVER_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..", "assets", "sme360_official_cover.png"
))


class CoverImageHandler:
    """
    Validates, normalizes, and calculates layout dimensions for user-provided
    cover page images for both PDF and DOCX business plan reports.
    """

    @staticmethod
    def extract_and_validate_bytes(raw_input: Any) -> Optional[bytes]:
        """
        Extracts raw image bytes from supported input formats:
        - None or empty string -> None
        - bytes -> validates length
        - str: 'default' / 'official' -> loads built-in SME360 AI official cover
        - str: Data URL ('data:image/...;base64,...')
        - str: Raw base64 string
        - str: Existing local file path
        - dict: {'data': '...', 'mime_type': '...', 'filename': '...'}
        """
        if not raw_input:
            return None

        img_bytes: Optional[bytes] = None

        if isinstance(raw_input, bytes):
            img_bytes = raw_input

        elif isinstance(raw_input, dict):
            data_val = raw_input.get("data") or raw_input.get("content") or raw_input.get("base64")
            if not data_val:
                return None
            return CoverImageHandler.extract_and_validate_bytes(data_val)

        elif isinstance(raw_input, str):
            clean_str = raw_input.strip()
            if not clean_str:
                return None

            # 0. Check if default/official keyword
            if clean_str.lower() in ("default", "official", "sme360_official", "sme360_cover"):
                if os.path.exists(DEFAULT_OFFICIAL_COVER_PATH):
                    with open(DEFAULT_OFFICIAL_COVER_PATH, "rb") as f:
                        img_bytes = f.read()
                else:
                    return None

            # 1. Check if it's a file path
            elif os.path.exists(clean_str) and os.path.isfile(clean_str):
                with open(clean_str, "rb") as f:
                    img_bytes = f.read()

            # 2. Check if Data URL (e.g. data:image/png;base64,....)
            elif clean_str.startswith("data:image/") and ";base64," in clean_str:
                parts = clean_str.split(";base64,", 1)
                b64_str = parts[1].strip()
                try:
                    img_bytes = base64.b64decode(b64_str)
                except Exception as e:
                    raise ValueError(f"Invalid Base64 encoding in cover image: {str(e)}")

            # 3. Check if standard Base64 string
            else:
                try:
                    img_bytes = base64.b64decode(clean_str)
                except Exception as e:
                    raise ValueError(f"Unable to decode cover image string: {str(e)}")

        else:
            raise ValueError(f"Unsupported cover image input type: {type(raw_input)}")

        if not img_bytes:
            return None

        # Size check
        if len(img_bytes) > MAX_COVER_IMAGE_BYTES:
            mb_size = len(img_bytes) / (1024 * 1024)
            raise ValueError(f"Cover image size ({mb_size:.2f} MB) exceeds maximum allowed limit of 10 MB.")

        return img_bytes

    @staticmethod
    def process_cover_image(raw_input: Any) -> Optional[Dict[str, Any]]:
        """
        Parses raw input, verifies image integrity with PIL, corrects EXIF orientation,
        and computes contain/bleed layout geometry for A4 PDF and DOCX.
        Returns a dictionary with image bytes, dimensions, and layout coordinates,
        or None if no cover image was provided.
        """
        img_bytes = CoverImageHandler.extract_and_validate_bytes(raw_input)
        if not img_bytes:
            return None

        try:
            pil_image = Image.open(io.BytesIO(img_bytes))
        except Exception as e:
            raise ValueError(f"Uploaded file is not a valid or readable image: {str(e)}")

        # Verify allowed format
        img_format = (pil_image.format or "").upper()
        if img_format not in ALLOWED_FORMATS:
            # Map JPG to JPEG
            if img_format == "JPG":
                img_format = "JPEG"
            else:
                raise ValueError(
                    f"Unsupported image format '{img_format}'. Supported formats: PNG, JPG, JPEG, WEBP."
                )

        # Transpose based on EXIF orientation (handles smartphone photos)
        try:
            pil_image = ImageOps.exif_transpose(pil_image)
        except Exception:
            pass

        orig_w, orig_h = pil_image.size
        if orig_w <= 0 or orig_h <= 0:
            raise ValueError("Invalid cover image dimensions.")

        aspect_ratio = orig_w / float(orig_h)

        # -----------------------------------------------------------------
        # Contain / Bleed Geometry for A4 Page
        # -----------------------------------------------------------------
        # If aspect ratio is within 5% of A4 ratio (0.707), use full bleed
        if abs(aspect_ratio - A4_RATIO) < 0.05:
            # Full A4 bleed
            pdf_w = A4_WIDTH_PT
            pdf_h = A4_HEIGHT_PT
            pdf_x = 0.0
            pdf_y = 0.0

            docx_w = A4_WIDTH_IN
            docx_h = A4_HEIGHT_IN
            docx_top_space_pt = 0.0

        elif aspect_ratio < A4_RATIO:
            # Narrower / Taller than A4
            pdf_h = A4_HEIGHT_PT
            pdf_w = A4_HEIGHT_PT * aspect_ratio
            pdf_x = (A4_WIDTH_PT - pdf_w) / 2.0
            pdf_y = 0.0

            docx_h = A4_HEIGHT_IN
            docx_w = A4_HEIGHT_IN * aspect_ratio
            docx_top_space_pt = 0.0

        else:
            # Wider than A4 (square or landscape)
            pdf_w = A4_WIDTH_PT
            pdf_h = A4_WIDTH_PT / aspect_ratio
            pdf_x = 0.0
            pdf_y = (A4_HEIGHT_PT - pdf_h) / 2.0

            docx_w = A4_WIDTH_IN
            docx_h = A4_WIDTH_IN / aspect_ratio
            docx_top_space_pt = max(0.0, (A4_HEIGHT_IN - docx_h) * 72.0 / 2.0)

        # Normalize image to PNG/JPEG bytes to preserve high quality
        # For WEBP or images with alpha, export to PNG bytes
        out_buf = io.BytesIO()
        if img_format == "WEBP" or pil_image.mode in ("RGBA", "LA", "P"):
            pil_image.save(out_buf, format="PNG", optimize=True)
            norm_format = "PNG"
        else:
            pil_image.save(out_buf, format="JPEG", quality=95)
            norm_format = "JPEG"

        processed_bytes = out_buf.getvalue()

        return {
            "image_bytes": processed_bytes,
            "format": norm_format,
            "width_px": orig_w,
            "height_px": orig_h,
            "aspect_ratio": aspect_ratio,
            "pdf_geometry": {
                "x": round(pdf_x, 2),
                "y": round(pdf_y, 2),
                "width": round(pdf_w, 2),
                "height": round(pdf_h, 2),
                "page_width": A4_WIDTH_PT,
                "page_height": A4_HEIGHT_PT
            },
            "docx_geometry": {
                "width_in": round(docx_w, 3),
                "height_in": round(docx_h, 3),
                "top_space_pt": round(docx_top_space_pt, 1),
                "page_width_in": A4_WIDTH_IN,
                "page_height_in": A4_HEIGHT_IN
            }
        }

import os
import io
from PIL import Image as PILImage
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.lib import colors

SAMPLE_IMG_PATH = r"C:\Users\DELL\.gemini\antigravity-ide\brain\c05ca666-e51a-4d59-ae55-14f6dbb97532\.user_uploaded\media_1791484946420.png"

class NumberedCanvasWithCover(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        self.cover_image_path = kwargs.pop("cover_image_path", None)
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        page_num = self.getPageNumber()
        if page_num == 1 and self.cover_image_path:
            # Draw full A4 cover
            page_w, page_h = A4
            # Determine image aspect ratio using PIL
            try:
                with PILImage.open(self.cover_image_path) as im:
                    im_w, im_h = im.size
                r_im = im_w / im_h
                r_page = page_w / page_h
                
                if abs(r_im - r_page) < 0.05:
                    # Near identical to A4 -> Full bleed
                    draw_x, draw_y = 0, 0
                    draw_w, draw_h = page_w, page_h
                elif r_im < r_page:
                    # Taller
                    draw_h = page_h
                    draw_w = page_h * r_im
                    draw_x = (page_w - draw_w) / 2
                    draw_y = 0
                else:
                    # Wider
                    draw_w = page_w
                    draw_h = page_w / r_im
                    draw_x = 0
                    draw_y = (page_h - draw_h) / 2
                
                self.saveState()
                self.drawImage(self.cover_image_path, draw_x, draw_y, width=draw_w, height=draw_h, preserveAspectRatio=True)
                self.restoreState()
            except Exception as e:
                print("Error drawing cover:", e)
            return

        # Suppress running header on title page if needed
        has_custom = bool(self.cover_image_path)
        title_page_num = 2 if has_custom else 1
        if page_num <= title_page_num:
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.setLineWidth(0.5)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.line(36, 796, 559, 796)
        self.drawString(36, 802, "SME360 AI — Strategic Business Plan")
        
        self.line(36, 45, 559, 45)
        self.drawString(36, 32, "Confidential — Prepared by SME360 AI Decision Support Engine")
        
        display_page = page_num - 1 if has_custom else page_num
        display_total = page_count - 1 if has_custom else page_count
        self.drawRightString(559, 32, f"Page {display_page} of {display_total}")
        self.restoreState()

def test_pdf():
    out_pdf = r"d:\SLIIT\Y4 S1\AI Driven Business  Lifecycle digital support system\AI-Driven-Business-Lifecycle-Decision-Support-System\scratch\test_cover_output.pdf"
    doc = SimpleDocTemplate(out_pdf, pagesize=A4, leftMargin=36, rightMargin=36, topMargin=54, bottomMargin=54)
    styles = getSampleStyleSheet()
    story = []
    
    # Custom cover
    has_cover = True
    if has_cover:
        # Page 1: Empty page break for the canvas to draw cover on page 1
        story.append(PageBreak())
    
    # Page 2: Title page
    story.append(Paragraph("STRATEGIC BUSINESS PLAN", styles["Title"]))
    story.append(Paragraph("Executive presentation and metadata card...", styles["Normal"]))
    story.append(PageBreak())
    
    # Page 3: Section 01
    story.append(Paragraph("SECTION 01 — BUSINESS & MARKET OVERVIEW", styles["Heading1"]))
    story.append(Paragraph("Section 1 content goes here...", styles["Normal"]))
    
    def canvas_maker(*args, **kwargs):
        kwargs["cover_image_path"] = SAMPLE_IMG_PATH if has_cover else None
        return NumberedCanvasWithCover(*args, **kwargs)
        
    doc.build(story, canvasmaker=canvas_maker)
    print("PDF generated successfully:", os.path.exists(out_pdf), "Size:", os.path.getsize(out_pdf))

if __name__ == "__main__":
    test_pdf()

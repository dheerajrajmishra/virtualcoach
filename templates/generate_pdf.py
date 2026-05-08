"""Generate a sample training deck PDF with 5 slides matching the Excel templates."""
from reportlab.lib.pagesizes import LETTER
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT

OUTPUT = "sample_deck.pdf"

SLIDES = [
    {
        "index": 1,
        "title": "Introduction to Product A",
        "subtitle": "Enterprise Sales Training — Module 1",
        "body": [
            "Welcome to the Product A training module.",
            "In this session you will learn:",
            "  • The core value proposition of Product A",
            "  • Key features and how they benefit customers",
            "  • Pricing structure and competitive positioning",
            "  • How to handle common objections",
        ],
    },
    {
        "index": 2,
        "title": "Key Features",
        "subtitle": "What makes Product A different",
        "body": [
            "Product A is built on three pillars:",
            "",
            "⚡ Speed",
            "  Sub-second response times — 40% faster than industry average.",
            "",
            "🛡 Reliability",
            "  99.9% uptime SLA with 24/7 support and automatic failover.",
            "",
            "📈 Scalability",
            "  Grows from 10 to 1,000,000 users with zero re-architecture.",
        ],
    },
    {
        "index": 3,
        "title": "Pricing Overview",
        "subtitle": "Flexible plans for every team size",
        "body": [
            "Starter    — INR 999/month     Up to 10 seats",
            "Growth     — INR 3,999/month   Up to 50 seats",
            "Enterprise — Custom pricing    Unlimited seats",
            "",
            "✅ 14-day free trial — no credit card required",
            "✅ Volume discounts available above 50 seats",
            "✅ Annual billing saves 20%",
            "",
            "Contact your account manager for a personalised quote.",
        ],
    },
    {
        "index": 4,
        "title": "Competitive Advantage",
        "subtitle": "Why customers choose Product A",
        "body": [
            "Versus Competitor X:",
            "  • 40% faster on standard benchmarks",
            "  • 20% lower total cost of ownership at equivalent tier",
            "  • Native multi-language support (6 Indian languages)",
            "",
            "Proof points to use in your pitch:",
            "  • Live speed demo (response time comparison)",
            "  • Customer case study: Acme Corp — 3× faster onboarding",
            "  • Independent analyst report (Q4 2025)",
        ],
    },
    {
        "index": 5,
        "title": "Summary & Next Steps",
        "subtitle": "You are ready for your assessment",
        "body": [
            "Congratulations on completing this module!",
            "",
            "Key takeaways:",
            "  1. Product A = Speed + Reliability + Scalability",
            "  2. Pricing starts at INR 999/month with a free trial",
            "  3. 40% speed advantage is your strongest objection-handler",
            "",
            "Your assessment will now begin.",
            "Answer each question clearly and confidently.",
            "Good luck! 🎯",
        ],
    },
]

BRAND_DARK = colors.HexColor("#1A1A2E")
BRAND_ACCENT = colors.HexColor("#E94560")
SLIDE_BG = colors.HexColor("#F7F7FA")


def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )

    styles = getSampleStyleSheet()

    slide_num = ParagraphStyle("SlideNum", fontSize=9, textColor=colors.grey, alignment=TA_RIGHT)
    title_style = ParagraphStyle("Title", fontSize=26, textColor=BRAND_DARK, fontName="Helvetica-Bold", spaceAfter=4)
    subtitle_style = ParagraphStyle("Sub", fontSize=13, textColor=BRAND_ACCENT, fontName="Helvetica-Oblique", spaceAfter=16)
    body_style = ParagraphStyle("Body", fontSize=11, textColor=colors.HexColor("#333333"), leading=18, spaceAfter=2)

    story = []

    for i, slide in enumerate(SLIDES):
        # Slide number
        story.append(Paragraph(f"Slide {slide['index']} of {len(SLIDES)}", slide_num))
        story.append(Spacer(1, 6))

        # Title
        story.append(Paragraph(slide["title"], title_style))

        # Accent line
        story.append(HRFlowable(width="100%", thickness=3, color=BRAND_ACCENT, spaceAfter=6))

        # Subtitle
        story.append(Paragraph(slide["subtitle"], subtitle_style))

        # Body lines
        for line in slide["body"]:
            story.append(Paragraph(line if line else "&nbsp;", body_style))

        # Page break between slides (except last)
        if i < len(SLIDES) - 1:
            story.append(Spacer(1, 0.4 * inch))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
            story.append(Spacer(1, 400))  # force page break via tall spacer

    doc.build(story)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    build_pdf()

"""
Generates training_data_template.xlsx — a single workbook with three sheets:
  • Transcripts
  • FAQs
  • Quizzes

Column layout matches what IngestionService expects:
  Transcripts : slide_index | slide_title | transcript_en | transcript_hi | transcript_ta | transcript_te | transcript_mr | transcript_bn
  FAQs        : faq_id | slide_index | question_en | answer_en | question_hi | answer_hi | tags | language_scope
  Quizzes     : quiz_id | slide_index | question_en | input_type | expected_answer_en | rubric_en | max_score | language_scope

Run: python generate_combined.py
Requires: pip install openpyxl
"""

from pathlib import Path
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUT = Path(__file__).parent / "training_data_template.xlsx"

# ── Style constants ────────────────────────────────────────────────────────────
HDR_FILL   = PatternFill("solid", fgColor="1A1A2E")
HDR_FONT   = Font(color="FFFFFF", bold=True, size=11)
HDR_ALIGN  = Alignment(horizontal="center", vertical="center", wrap_text=True)

SUB_FILL   = PatternFill("solid", fgColor="E8EAF6")   # light indigo tint for optional cols
SUB_FONT   = Font(color="5C6BC0", italic=True, size=10)

LOCK_FILL  = PatternFill("solid", fgColor="F3F4F6")   # greyed-out for auto-generated cols
LOCK_FONT  = Font(color="9CA3AF", italic=True, size=10)

ROW_FILL_A = PatternFill("solid", fgColor="FFFFFF")
ROW_FILL_B = PatternFill("solid", fgColor="F9FAFB")

THIN = Side(style="thin", color="D1D5DB")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

NOTE_FONT  = Font(color="6B7280", italic=True, size=9)


def style_header(cell, locked=False, optional=False):
    if locked:
        cell.fill = LOCK_FILL
        cell.font = LOCK_FONT
    elif optional:
        cell.fill = SUB_FILL
        cell.font = SUB_FONT
    else:
        cell.fill = HDR_FILL
        cell.font = HDR_FONT
    cell.alignment = HDR_ALIGN
    cell.border = BORDER


def style_row(cell, row_idx):
    cell.fill = ROW_FILL_A if row_idx % 2 == 0 else ROW_FILL_B
    cell.alignment = Alignment(vertical="top", wrap_text=True)
    cell.border = BORDER


def write_sheet(wb, title, headers, header_flags, rows, col_widths, validations=None):
    """
    header_flags: list of '' | 'optional' | 'locked' per column
    validations:  list of (col_idx_1based, formula_string) or None
    """
    ws = wb.create_sheet(title=title)
    ws.row_dimensions[1].height = 36

    # Headers
    for ci, (h, flag) in enumerate(zip(headers, header_flags), start=1):
        cell = ws.cell(row=1, column=ci, value=h)
        style_header(cell, locked=(flag == "locked"), optional=(flag == "optional"))

    # Data rows
    for ri, row in enumerate(rows, start=2):
        ws.row_dimensions[ri].height = 60
        for ci, val in enumerate(row, start=1):
            cell = ws.cell(row=ri, column=ci, value=val)
            style_row(cell, ri)

    # Column widths
    for ci, w in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(ci)].width = w

    # Freeze top row
    ws.freeze_panes = "A2"

    # Data validations (dropdowns)
    if validations:
        for col_idx, formula in validations:
            col_letter = get_column_letter(col_idx)
            dv = DataValidation(type="list", formula1=formula, allow_blank=True,
                                showDropDown=False)
            dv.sqref = f"{col_letter}2:{col_letter}500"
            ws.add_data_validation(dv)

    return ws


# ── Sheet 1: Transcripts ───────────────────────────────────────────────────────
TRANSCRIPTS_HEADERS = [
    "slide_index", "slide_title",
    "transcript_en",
    "transcript_hi", "transcript_ta", "transcript_te", "transcript_mr", "transcript_bn",
]
TRANSCRIPTS_FLAGS = [
    "", "",
    "",
    "optional", "optional", "optional", "optional", "optional",
]
TRANSCRIPTS_WIDTHS = [13, 28, 52, 42, 42, 42, 42, 42]

TRANSCRIPTS_ROWS = [
    [1, "Introduction to Product A",
     "Welcome to the Product A training module. In this session, you will learn the key features, pricing, and competitive advantages of our flagship product.",
     "", "", "", "", ""],
    [2, "Key Features",
     "Product A offers three core features: speed (sub-second response), reliability (99.9% SLA), and scalability (supports up to one million concurrent users).",
     "", "", "", "", ""],
    [3, "Pricing Overview",
     "Our pricing starts at INR 999 per month for up to 10 users. Flexible annual and enterprise plans are available with volume discounts for teams above 50 seats.",
     "", "", "", "", ""],
    [4, "Competitive Advantage",
     "Product A outperforms the nearest competitor by 40% on response-time benchmarks and costs 20% less at equivalent tier, making it the strongest value proposition in the segment.",
     "", "", "", "", ""],
    [5, "Objection Handling",
     "Common objections include price, integration effort, and switching costs. Address each with ROI data, our free migration service, and a 14-day no-risk trial.",
     "", "", "", "", ""],
    [6, "Summary & Next Steps",
     "Congratulations on completing this module. You will now take a short assessment to validate your understanding before being certified to sell Product A.",
     "", "", "", "", ""],
]


# ── Sheet 2: FAQs ──────────────────────────────────────────────────────────────
FAQS_HEADERS = [
    "faq_id", "slide_index",
    "question_en", "answer_en",
    "question_hi", "answer_hi",
    "tags", "language_scope",
]
FAQS_FLAGS = [
    "", "",
    "", "",
    "optional", "optional",
    "", "",
]
FAQS_WIDTHS = [12, 13, 48, 60, 48, 60, 24, 18]

FAQS_ROWS = [
    ["faq_001", 1, "What is Product A?",
     "Product A is an enterprise SaaS platform designed for mid-market and large sales teams to manage pipeline, track performance, and close deals faster.",
     "", "", "product,intro", "all"],
    ["faq_002", 1, "Who is the target audience for Product A?",
     "Sales managers, field sales reps, operations leads, and CXOs who need a unified, real-time view of their revenue pipeline.",
     "", "", "audience,intro", "all"],
    ["faq_003", 2, "What are the three core features?",
     "Speed (sub-second response times), Reliability (99.9% uptime SLA backed by a financial credit), and Scalability (tested up to 1 million concurrent users).",
     "", "", "features", "all"],
    ["faq_004", 2, "Does Product A integrate with existing CRM tools?",
     "Yes. Native integrations are available for Salesforce, HubSpot, Zoho CRM, and Microsoft Dynamics. Custom webhook support covers any other system.",
     "", "", "features,integration", "all"],
    ["faq_005", 3, "Is there a free trial?",
     "Yes. A 14-day free trial with full feature access is available — no credit card required. Your data is migrated for free during onboarding.",
     "", "", "pricing,trial", "all"],
    ["faq_006", 3, "Can we negotiate pricing?",
     "Volume discounts apply automatically above 50 seats. Contact your account manager for a custom enterprise quote including dedicated support and SLA upgrades.",
     "", "", "pricing,negotiation", "all"],
    ["faq_007", 4, "How does Product A compare to Competitor X?",
     "Product A is 40% faster on response-time benchmarks and 20% cheaper at the equivalent tier, with a stronger SLA and local data residency in India.",
     "", "", "competition", "all"],
    ["faq_008", 5, "What if the customer raises a switching-cost objection?",
     "Lead with the free migration service and a dedicated onboarding engineer for the first 30 days. Emphasise that the average time-to-value is under two weeks.",
     "", "", "objection,switching", "all"],
    ["faq_009", 5, "How do we handle a price objection?",
     "Reframe from cost to ROI: average customers see a 3× return within 90 days through faster deal cycles and reduced manual reporting effort.",
     "", "", "objection,pricing", "all"],
]


# ── Sheet 3: Quizzes ───────────────────────────────────────────────────────────
QUIZZES_HEADERS = [
    "quiz_id", "slide_index",
    "question_en", "input_type",
    "expected_answer_en", "rubric_en",
    "max_score", "language_scope",
    "question_hi", "expected_answer_hi",
]
QUIZZES_FLAGS = [
    "", "",
    "", "",
    "", "",
    "", "",
    "optional", "optional",
]
QUIZZES_WIDTHS = [12, 13, 52, 14, 60, 60, 12, 18, 52, 60]

QUIZZES_ROWS = [
    ["q_001", 2,
     "Explain the three core features of Product A and describe why each one matters to a typical enterprise customer.",
     "audio",
     "Speed enables faster decisions and shorter sales cycles; Reliability builds trust and reduces escalations; Scalability future-proofs the investment as the customer grows.",
     "Award 3 pts per feature (correct name + clear customer value). Deduct 1 pt for vague or incomplete explanations. Full marks require all three features with a customer-centric rationale.",
     10, "all", "", ""],
    ["q_002", 3,
     "A prospect says: 'Your product is too expensive compared to what we currently use.' Respond to this objection as you would in a real sales call.",
     "video",
     "Acknowledge the concern empathetically, pivot to ROI and total cost of ownership, offer the free trial or volume pricing as a risk-free entry point, and close with a concrete next step.",
     "Empathy opener (2 pts), ROI / TCO reframe with data (3 pts), concrete alternative offered — trial or discount (3 pts), confident close with a next-step ask (2 pts).",
     10, "all", "", ""],
    ["q_003", 4,
     "What is Product A's speed advantage over its nearest competitor, and how would you use that statistic in a live pitch?",
     "text",
     "Product A is 40% faster. In a pitch, lead with a live side-by-side demo showing response time, then reinforce with the benchmark report and a customer testimonial.",
     "Accurate stat cited (3 pts), specific demo or proof-point strategy described (4 pts), mention of a supporting artefact such as benchmark or testimonial (3 pts).",
     10, "all", "", ""],
    ["q_004", 5,
     "Role-play: a customer says they are worried about the effort required to switch from their existing tool. How do you respond?",
     "audio",
     "Validate the concern, introduce the free migration service and dedicated onboarding engineer, share a reference customer who migrated in under two weeks, and propose a discovery call to scope the effort.",
     "Validates concern without dismissing (2 pts), mentions free migration service (2 pts), references onboarding support or timeline (3 pts), proposes a clear next step (3 pts).",
     10, "all", "", ""],
]


# ── Build workbook ─────────────────────────────────────────────────────────────
def build():
    wb = openpyxl.Workbook()
    wb.remove(wb.active)   # remove default empty sheet

    write_sheet(wb, "Transcripts",
                TRANSCRIPTS_HEADERS, TRANSCRIPTS_FLAGS,
                TRANSCRIPTS_ROWS, TRANSCRIPTS_WIDTHS)

    write_sheet(wb, "FAQs",
                FAQS_HEADERS, FAQS_FLAGS,
                FAQS_ROWS, FAQS_WIDTHS,
                validations=[
                    (8, '"all,en,hi,ta,te,mr,bn"'),   # language_scope
                ])

    write_sheet(wb, "Quizzes",
                QUIZZES_HEADERS, QUIZZES_FLAGS,
                QUIZZES_ROWS, QUIZZES_WIDTHS,
                validations=[
                    (4, '"text,audio,video"'),          # input_type
                    (8, '"all,en,hi,ta,te,mr,bn"'),    # language_scope
                ])

    # Legend sheet
    legend = wb.create_sheet(title="README")
    legend.column_dimensions["A"].width = 22
    legend.column_dimensions["B"].width = 80
    notes = [
        ("SHEET", "PURPOSE"),
        ("Transcripts", "One row per presentation slide. transcript_en is required. Other locale columns are optional — leave blank to auto-translate."),
        ("FAQs", "Knowledge-base Q&A pairs anchored to a slide. question/answer_en required. Hindi columns optional."),
        ("Quizzes", "Assessment questions. input_type: text | audio | video. English columns required. Hindi columns optional."),
        ("", ""),
        ("COLUMN COLOURS", ""),
        ("Dark header", "Required column — must be filled."),
        ("Blue/italic header", "Optional — leave blank to auto-translate via Azure OpenAI GPT-4o."),
        ("", ""),
        ("LANGUAGE CODES", "en=English  hi=Hindi  ta=Tamil  te=Telugu  mr=Marathi  bn=Bengali"),
        ("language_scope", "Use 'all' to make this item available in every language, or comma-separate codes e.g. en,hi"),
        ("input_type", "text = typed answer  |  audio = voice recording  |  video = camera recording"),
    ]
    for ri, (a, b) in enumerate(notes, start=1):
        ca = legend.cell(row=ri, column=1, value=a)
        cb = legend.cell(row=ri, column=2, value=b)
        if ri == 1 or a in ("COLUMN COLOURS", "LANGUAGE CODES"):
            ca.font = Font(bold=True, size=11)
            cb.font = Font(bold=True, size=11)
        else:
            ca.font = Font(size=10)
            cb.font = Font(size=10, color="374151")
        cb.alignment = Alignment(wrap_text=True)
        legend.row_dimensions[ri].height = 20

    wb.save(OUT)
    print(f"Created: {OUT}")
    print(f"   Sheets : Transcripts ({len(TRANSCRIPTS_ROWS)} slides) | "
          f"FAQs ({len(FAQS_ROWS)} entries) | "
          f"Quizzes ({len(QUIZZES_ROWS)} questions) | README")


if __name__ == "__main__":
    build()

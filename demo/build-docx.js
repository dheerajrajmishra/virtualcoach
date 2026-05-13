const fs   = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, BorderStyle,
  WidthType, ShadingType, TableOfContents,
  PageBreak, HorizontalPositionRelativeFrom,
  LevelFormat, convertInchesToTwip, UnderlineType,
  Header, Footer, PageNumber, NumberFormat,
  ExternalHyperlink, TabStopPosition, TabStopType,
} = require('docx');

const MD_FILE  = path.join(__dirname, '..', 'VirtualCoach-Documentation.md');
const OUT_FILE = path.join(__dirname, '..', 'VirtualCoach-Documentation.docx');

// ── Brand colours ───────────────────────────────────────────────
const INDIGO   = '4F46E5';
const INDIGO_L = 'EEF2FF';
const SLATE    = '0F172A';
const SLATE_L  = '334155';
const SKY      = '0EA5E9';
const EMERALD  = '10B981';
const AMBER    = 'F59E0B';
const ROSE     = 'F43F5E';
const GRAY_100 = 'F1F5F9';
const GRAY_200 = 'E2E8F0';
const WHITE    = 'FFFFFF';
const CODE_BG  = '1E293B';
const CODE_FG  = 'E2E8F0';

// ── Helpers ──────────────────────────────────────────────────────
const pt  = n => n * 20;          // half-points (twips for font size)
const twip = convertInchesToTwip;

function runs(text) {
  // Parse inline **bold**, `code`, and plain text
  const parts = [];
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(new TextRun({ text: text.slice(last, m.index) }));
    if (m[2]) parts.push(new TextRun({ text: m[2], bold: true }));
    if (m[3]) parts.push(new TextRun({
      text: m[3], font: 'Consolas', size: pt(9.5),
      color: INDIGO, shading: { type: ShadingType.SOLID, fill: INDIGO_L, color: INDIGO_L },
    }));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(new TextRun({ text: text.slice(last) }));
  return parts;
}

function para(text, opts = {}) {
  return new Paragraph({
    children: runs(text),
    spacing: { after: 120 },
    ...opts,
  });
}

function h1(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(26), color: WHITE, font: 'Calibri' })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    shading: { type: ShadingType.SOLID, fill: SLATE, color: SLATE },
    indent: { left: twip(0.15), right: twip(0.15) },
  });
}

function h2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(17), color: INDIGO, font: 'Calibri' })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: INDIGO_L, space: 2 } },
  });
}

function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(13), color: SLATE_L, font: 'Calibri' })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
  });
}

function h4(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(11.5), color: SLATE })],
    spacing: { before: 160, after: 60 },
  });
}

function bullet(text, level = 0) {
  const clean = text.replace(/^[-*]\s+/, '').replace(/^\s+/, '');
  return new Paragraph({
    children: runs(clean),
    bullet: { level },
    spacing: { after: 80 },
    indent: { left: twip(0.25 + level * 0.25) },
  });
}

function codeBlock(lines) {
  return lines.map(line =>
    new Paragraph({
      children: [new TextRun({ text: line || ' ', font: 'Consolas', size: pt(9), color: CODE_FG })],
      spacing: { after: 0, before: 0, line: 240 },
      indent: { left: twip(0.2), right: twip(0.2) },
      shading: { type: ShadingType.SOLID, fill: CODE_BG, color: CODE_BG },
    })
  );
}

function spacer(sz = 1) {
  return new Paragraph({ children: [new TextRun('')], spacing: { after: sz * 80 } });
}

function hrule() {
  return new Paragraph({
    children: [new TextRun('')],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GRAY_200 } },
    spacing: { before: 80, after: 200 },
  });
}

function calloutBox(text, color = INDIGO, bgColor = INDIGO_L) {
  return new Paragraph({
    children: runs(text),
    shading: { type: ShadingType.SOLID, fill: bgColor, color: bgColor },
    border: { left: { style: BorderStyle.THICK, size: 12, color, space: 6 } },
    indent: { left: twip(0.2), right: twip(0.1) },
    spacing: { before: 120, after: 120 },
  });
}

// ── Table builder ────────────────────────────────────────────────
function makeTable(headers, rows) {
  const COL_W = Math.floor(9000 / headers.length);

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: WHITE, size: pt(10), font: 'Calibri' })],
          alignment: AlignmentType.LEFT,
          spacing: { after: 0 },
        })],
        shading: { type: ShadingType.SOLID, fill: SLATE, color: SLATE },
        width: { size: COL_W, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
      })
    ),
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) =>
        new TableCell({
          children: [new Paragraph({
            children: runs(cell.trim()),
            spacing: { after: 0 },
          })],
          shading: {
            type: ShadingType.SOLID,
            fill: ri % 2 === 0 ? GRAY_100 : WHITE,
            color: ri % 2 === 0 ? GRAY_100 : WHITE,
          },
          width: { size: COL_W, type: WidthType.DXA },
          margins: { top: 50, bottom: 50, left: 100, right: 100 },
          borders: {
            top:    { style: BorderStyle.SINGLE, size: 1, color: GRAY_200 },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: GRAY_200 },
            left:   { style: BorderStyle.SINGLE, size: 1, color: GRAY_200 },
            right:  { style: BorderStyle.SINGLE, size: 1, color: GRAY_200 },
          },
        })
      ),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 2, color: GRAY_200 },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: GRAY_200 },
      left:   { style: BorderStyle.SINGLE, size: 2, color: GRAY_200 },
      right:  { style: BorderStyle.SINGLE, size: 2, color: GRAY_200 },
      insideH:{ style: BorderStyle.SINGLE, size: 1, color: GRAY_200 },
      insideV:{ style: BorderStyle.SINGLE, size: 1, color: GRAY_200 },
    },
  });
}

// ── Markdown Parser ──────────────────────────────────────────────
function parseMd(mdText) {
  const lines  = mdText.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip YAML front-matter-style separator
    if (line.trim() === '---') { i++; blocks.push(hrule()); continue; }

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // closing ```
      if (codeLines.length) {
        blocks.push(spacer());
        blocks.push(...codeBlock(codeLines));
        blocks.push(spacer());
      }
      continue;
    }

    // Heading 1
    if (/^# /.test(line)) {
      const text = line.replace(/^# /, '').trim();
      if (!text.startsWith('VirtualCoach —')) {
        blocks.push(new Paragraph({ children: [new PageBreak()] }));
      }
      blocks.push(h1(text));
      i++; continue;
    }

    // Heading 2
    if (/^## /.test(line)) {
      blocks.push(h2(line.replace(/^## /, '').trim()));
      i++; continue;
    }

    // Heading 3
    if (/^### /.test(line)) {
      blocks.push(h3(line.replace(/^### /, '').trim()));
      i++; continue;
    }

    // Heading 4
    if (/^#### /.test(line)) {
      blocks.push(h4(line.replace(/^#### /, '').trim()));
      i++; continue;
    }

    // Table — detect header row
    if (/^\|/.test(line)) {
      const tableLines = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      // Filter out separator rows (|---|---|)
      const headerLine  = tableLines[0];
      const contentLines = tableLines.filter(l => !/^\|[-:\s|]+$/.test(l));
      const headers = headerLine.split('|').filter(c => c.trim()).map(c => c.trim());
      const dataRows = contentLines
        .slice(1)
        .map(l => l.split('|').filter(c => c.trim() !== undefined).slice(1, headers.length + 1).map(c => c.trim()));
      if (headers.length && dataRows.length) {
        blocks.push(spacer());
        blocks.push(makeTable(headers, dataRows));
        blocks.push(spacer());
      }
      continue;
    }

    // Bullet (- or *)
    if (/^(\s*)[-*] /.test(line)) {
      const indent = line.match(/^(\s*)/)[1].length;
      const level  = Math.floor(indent / 2);
      blocks.push(bullet(line, level));
      i++; continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line.trim())) {
      const text = line.replace(/^\d+\.\s+/, '').trim();
      blocks.push(new Paragraph({
        children: runs(text),
        numbering: { reference: 'numbering', level: 0 },
        spacing: { after: 80 },
      }));
      i++; continue;
    }

    // Blockquote
    if (/^> /.test(line)) {
      const text = line.replace(/^> /, '').trim();
      blocks.push(calloutBox(text, AMBER, 'FFFBEB'));
      i++; continue;
    }

    // Empty line
    if (!line.trim()) { blocks.push(spacer()); i++; continue; }

    // Regular paragraph
    const text = line.trim();
    if (text) blocks.push(para(text));
    i++;
  }

  return blocks;
}

// ── Title page ───────────────────────────────────────────────────
function titlePage() {
  return [
    new Paragraph({
      children: [new TextRun('')],
      spacing: { before: twip(1.2) },
    }),

    // Logo area
    new Paragraph({
      children: [new TextRun({ text: '🎯', size: pt(54) })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),

    // Title
    new Paragraph({
      children: [
        new TextRun({ text: 'Virtual', bold: true, size: pt(42), font: 'Calibri', color: SLATE }),
        new TextRun({ text: 'Coach', bold: true, size: pt(42), font: 'Calibri', color: INDIGO }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),

    // Subtitle
    new Paragraph({
      children: [new TextRun({
        text: 'Functional & Technical Documentation',
        size: pt(18), color: SLATE_L, font: 'Calibri',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),

    // Divider
    new Paragraph({
      children: [new TextRun({ text: '─────────────────────────────────────', color: GRAY_200 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
    }),

    // Meta info
    ...[
      ['Version', '1.0'],
      ['Branch', 'feat/sql'],
      ['Date', 'May 2026'],
      ['Organisation', 'Samsung GenAI Lab'],
      ['Contact', 'genailab.gem3@samsung.com'],
    ].map(([label, value]) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: pt(11.5), color: SLATE_L }),
          new TextRun({ text: value, size: pt(11.5), color: SLATE }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      })
    ),

    // Tech stack pills row
    spacer(3),
    new Paragraph({
      children: [
        new TextRun({ text: 'Spring Boot 3.3  ·  Next.js 16  ·  React Native Expo 54  ·  Azure GPT-4o  ·  SQL Server  ·  6 Languages', size: pt(9.5), color: GRAY_200 }),
      ],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, fill: SLATE, color: SLATE },
      spacing: { before: 120, after: 120 },
      indent: { left: twip(0.5), right: twip(0.5) },
    }),

    // Page break
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ── Main ─────────────────────────────────────────────────────────
const mdText = fs.readFileSync(MD_FILE, 'utf-8');
// Remove the first H1 line (title) — we have a dedicated title page
const mdBody = mdText.replace(/^# .+\n/, '');

const contentBlocks = parseMd(mdBody);

const doc = new Document({
  numbering: {
    config: [{
      reference: 'numbering',
      levels: [{
        level: 0, format: LevelFormat.DECIMAL,
        text: '%1.',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: twip(0.25), hanging: twip(0.25) } } },
      }],
    }],
  },
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: pt(11), color: SLATE },
        paragraph: { spacing: { after: 120, line: 276 } },
      },
    },
    paragraphStyles: [
      {
        id: 'Normal', name: 'Normal',
        run: { font: 'Calibri', size: pt(11), color: SLATE },
        paragraph: { spacing: { after: 120, line: 276 } },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        margin: { top: twip(1), bottom: twip(1), left: twip(1.15), right: twip(1.15) },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'VirtualCoach — Functional & Technical Documentation', size: pt(9), color: GRAY_200 }),
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: GRAY_200 } },
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'Samsung GenAI Lab  ·  May 2026  ·  Page ', size: pt(9), color: '94A3B8' }),
              new TextRun({ children: [PageNumber.CURRENT], size: pt(9), color: '94A3B8' }),
              new TextRun({ text: ' of ', size: pt(9), color: '94A3B8' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: pt(9), color: '94A3B8' }),
            ],
            alignment: AlignmentType.RIGHT,
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: GRAY_200 } },
          }),
        ],
      }),
    },
    children: [
      ...titlePage(),
      ...contentBlocks,
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUT_FILE, buffer);
  const kb = (buffer.length / 1024).toFixed(0);
  console.log(`✅ Saved: ${OUT_FILE}`);
  console.log(`   Size:  ${kb} KB`);
}).catch(err => {
  console.error('Error generating document:', err.message);
  process.exit(1);
});

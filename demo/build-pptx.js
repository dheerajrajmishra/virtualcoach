const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const SHOTS = path.join(__dirname, 'screenshots');
const OUT   = path.join(__dirname, 'VirtualCoach-Presentation.pptx');

// ── helpers ─────────────────────────────────────────────────────
function img(name) {
  const p = path.join(SHOTS, `${name}.png`);
  if (!fs.existsSync(p)) { console.warn(`  ! missing: ${name}.png`); return null; }
  return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
}

// Brand colours
const C = {
  brand:  '0f172a',
  brandL: '1e293b',
  brandA: '334155',
  p400:   '818cf8',
  p500:   '6366f1',
  p600:   '4f46e5',
  p700:   '4338ca',
  violet: '7c3aed',
  sky:    '0ea5e9',
  emerald:'10b981',
  rose:   'f43f5e',
  amber:  'f59e0b',
  white:  'FFFFFF',
  g50:    'f8fafc',
  g200:   'e2e8f0',
  g400:   '94a3b8',
  g500:   '64748b',
  g700:   '334155',
  g900:   '0f172a',
  ready:  '16a34a',
  readyBg:'dcfce7',
  err:    'b91c1c',
  errBg:  'fee2e2',
};

const pptx = new PptxGenJS();
pptx.layout  = 'LAYOUT_WIDE';   // 13.33 × 7.5 in
pptx.author  = 'VirtualCoach';
pptx.company = 'Samsung GenAI Lab';
pptx.subject = 'VirtualCoach Platform Presentation';
pptx.title   = 'VirtualCoach — AI-Powered Sales Training Platform';

// Slide dimensions (inches, WIDE layout)
const W = 13.33;
const H = 7.5;

// ── reusable: dark gradient background ──────────────────────────
function darkBg(slide, accent = false) {
  // base fill
  slide.background = { fill: C.brand };
  // subtle grid lines via a very light rect overlay (simulated)
  // radial glow top-left (indigo)
  slide.addShape(pptx.ShapeType.ellipse, {
    x: -1, y: -1, w: 7, h: 7,
    fill: { type: 'solid', color: C.p600, transparency: 80 },
    line: { type: 'none' },
  });
  // radial glow bottom-right (violet)
  slide.addShape(pptx.ShapeType.ellipse, {
    x: W - 5, y: H - 4, w: 7, h: 7,
    fill: { type: 'solid', color: C.violet, transparency: 84 },
    line: { type: 'none' },
  });
}

// light bg
function lightBg(slide) {
  slide.background = { fill: 'f0f4ff' };
}

// ── reusable: slide number ───────────────────────────────────────
function slideNum(slide, n, total) {
  slide.addText(`${n} / ${total}`, {
    x: W - 1.1, y: H - 0.38, w: 0.9, h: 0.25,
    fontSize: 9, color: 'FFFFFF', align: 'right', transparency: 60,
  });
}

// ── reusable: tag pill (top-left label) ─────────────────────────
function tag(slide, text, color, bgColor, x = 0.45, y = 0.3) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: text.length * 0.095 + 0.4, h: 0.28,
    fill: { type: 'solid', color: bgColor, transparency: 0 },
    line: { type: 'none' },
    rectRadius: 0.14,
  });
  slide.addText(text.toUpperCase(), {
    x, y, w: text.length * 0.095 + 0.4, h: 0.28,
    fontSize: 8, bold: true, color, align: 'center',
    charSpacing: 1.2,
  });
}

// ── reusable: bullet list ────────────────────────────────────────
function bullets(slide, items, x, y, w = 4.8) {
  items.forEach((item, i) => {
    slide.addText([
      { text: item.icon + '  ', options: { fontSize: 12 } },
      { text: item.text,        options: { fontSize: 12, color: C.g700 } },
    ], {
      x, y: y + i * 0.38, w, h: 0.36,
      valign: 'middle',
    });
  });
}

// ── reusable: browser chrome + screenshot ───────────────────────
function browserShot(slide, imgData, x, y, w, urlText = '') {
  const barH = 0.32;
  const r    = 0.15;
  // window shadow
  slide.addShape(pptx.ShapeType.roundRect, {
    x: x + 0.06, y: y + 0.1, w, h: (w * 0.63) + barH,
    fill: { type: 'solid', color: '000000', transparency: 70 },
    line: { type: 'none' }, rectRadius: r,
  });
  // frame
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: (w * 0.63) + barH,
    fill: { type: 'solid', color: 'f1f5f9' },
    line: { color: C.g200, pt: 1 }, rectRadius: r,
  });
  // bar
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h: barH,
    fill: { type: 'solid', color: 'f1f5f9' },
    line: { type: 'none' },
  });
  // traffic lights
  [['ef4444', 0.18], ['f59e0b', 0.38], ['22c55e', 0.58]].forEach(([col, dx]) => {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + dx * 0.25, y: y + 0.09, w: 0.1, h: 0.1,
      fill: { type: 'solid', color: col },
      line: { type: 'none' },
    });
  });
  // URL bar
  if (urlText) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.6, y: y + 0.06, w: w - 0.75, h: 0.2,
      fill: { type: 'solid', color: 'e2e8f0' },
      line: { type: 'none' }, rectRadius: 0.04,
    });
    slide.addText(urlText, {
      x: x + 0.65, y: y + 0.07, w: w - 0.85, h: 0.18,
      fontSize: 7.5, color: C.g500,
    });
  }
  // screenshot
  if (imgData) {
    slide.addImage({
      data: imgData,
      x, y: y + barH, w, h: w * 0.63,
      rounding: false,
    });
  }
}

// ── reusable: phone frame + screenshot ──────────────────────────
function phoneShot(slide, imgData, x, y, w) {
  const innerRatio = 2.16; // ~390×844
  const h = w * innerRatio + 0.28;
  const frameR = 0.5;
  // shadow
  slide.addShape(pptx.ShapeType.roundRect, {
    x: x + 0.08, y: y + 0.12, w, h,
    fill: { type: 'solid', color: '000000', transparency: 55 },
    line: { type: 'none' }, rectRadius: frameR,
  });
  // body
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { type: 'solid', color: C.brand },
    line: { color: '1e293b', pt: 1.5 }, rectRadius: frameR,
  });
  // screen cutout
  if (imgData) {
    slide.addImage({
      data: imgData,
      x: x + 0.07, y: y + 0.14, w: w - 0.14, h: (w - 0.14) * innerRatio,
      rounding: false,
    });
  }
  // notch
  slide.addShape(pptx.ShapeType.roundRect, {
    x: x + w / 2 - 0.25, y: y + 0.05, w: 0.5, h: 0.09,
    fill: { type: 'solid', color: C.brand },
    line: { type: 'none' }, rectRadius: 0.05,
  });
}

// ── reusable: info card (dark) ───────────────────────────────────
function infoCard(slide, title, body, x, y, w = 4.0, accent = C.p500) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.9,
    fill: { type: 'solid', color: 'FFFFFF', transparency: 92 },
    line: { color: 'FFFFFF', pt: 0.5, transparency: 75 },
    rectRadius: 0.14,
  });
  // accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 0.04, h: 0.9,
    fill: { type: 'solid', color: accent },
    line: { type: 'none' },
  });
  slide.addText(title, {
    x: x + 0.12, y: y + 0.07, w: w - 0.2, h: 0.22,
    fontSize: 10.5, bold: true, color: C.white,
  });
  slide.addText(body, {
    x: x + 0.12, y: y + 0.3, w: w - 0.2, h: 0.52,
    fontSize: 9.5, color: C.p400, wrap: true,
  });
}

// ── reusable: stat box ───────────────────────────────────────────
function statBox(slide, num, label, x, y, numColor = C.p400) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: 1.7, h: 0.9,
    fill: { type: 'solid', color: 'FFFFFF', transparency: 92 },
    line: { color: 'FFFFFF', pt: 0.5, transparency: 75 },
    rectRadius: 0.14,
  });
  slide.addText(num, {
    x, y: y + 0.08, w: 1.7, h: 0.42,
    fontSize: 26, bold: true, color: numColor, align: 'center',
  });
  slide.addText(label, {
    x, y: y + 0.52, w: 1.7, h: 0.28,
    fontSize: 9.5, color: C.g400, align: 'center',
  });
}

const TOTAL_SLIDES = 14;

// ══════════════════════════════════════════════════════════════
//  SLIDE 1 — HERO
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);

  // Live badge
  s.addShape(pptx.ShapeType.roundRect, {
    x: W/2 - 1.5, y: 0.65, w: 3.0, h: 0.32,
    fill: { type: 'solid', color: C.p600, transparency: 82 },
    line: { color: C.p500, pt: 0.75, transparency: 30 },
    rectRadius: 0.16,
  });
  s.addText('● LIVE PLATFORM DEMO · MAY 2026', {
    x: W/2 - 1.5, y: 0.65, w: 3.0, h: 0.32,
    fontSize: 8.5, color: C.p300, align: 'center', bold: true, charSpacing: 0.8,
  });

  // Main title
  s.addText('Virtual', {
    x: W/2 - 3.5, y: 1.1, w: 3.3, h: 1.4,
    fontSize: 88, bold: true, color: C.white, align: 'right',
    charSpacing: -2,
  });
  s.addText('Coach', {
    x: W/2 + 0.05, y: 1.1, w: 3.3, h: 1.4,
    fontSize: 88, bold: true,
    color: C.p400,
    glow: { size: 12, opacity: 0.4, color: C.p500 },
    charSpacing: -2,
  });

  // Subtitle
  s.addText('AI-powered multilingual sales training — from PowerPoint upload to scored quiz, in minutes.', {
    x: 2.5, y: 2.6, w: W - 5, h: 0.6,
    fontSize: 14, color: C.g400, align: 'center', wrap: true,
  });

  // Stat boxes
  const stats = [
    { num: '12',  label: 'Trainings',    col: C.p400 },
    { num: '65%', label: 'Avg Score',    col: C.emerald },
    { num: '6',   label: 'Languages',    col: C.sky },
    { num: '847', label: 'Learners',     col: C.amber },
  ];
  stats.forEach((st, i) => statBox(s, st.num, st.label, 2.8 + i * 2.0, 3.35, st.col));

  // Tech pills
  const pills = ['🖥️  CMS Portal', '📱  Mobile App', '🧠  GPT-4o Eval', '💬  RAG Chatbot', '🌐  6 Languages'];
  pills.forEach((p, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.9 + i * 2.38, y: 4.55, w: 2.15, h: 0.32,
      fill: { type: 'solid', color: 'FFFFFF', transparency: 92 },
      line: { color: 'FFFFFF', pt: 0.5, transparency: 75 },
      rectRadius: 0.16,
    });
    s.addText(p, {
      x: 0.9 + i * 2.38, y: 4.55, w: 2.15, h: 0.32,
      fontSize: 10, color: C.g400, align: 'center',
    });
  });

  // Company
  s.addText('Samsung GenAI Lab  ·  genailab.gem3@samsung.com', {
    x: 0, y: H - 0.45, w: W, h: 0.3,
    fontSize: 9, color: C.g500, align: 'center',
  });

  slideNum(s, 1, TOTAL_SLIDES);
  console.log('✓ Slide 1 — Hero');
}

// ══════════════════════════════════════════════════════════════
//  SLIDE 2 — ARCHITECTURE
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  tag(s, 'System Architecture', C.p300, C.p700);

  s.addText('Two apps. One shared AI brain.', {
    x: 1.2, y: 0.65, w: W - 2.4, h: 0.7,
    fontSize: 32, bold: true, color: C.white, align: 'center', charSpacing: -0.5,
  });
  s.addText('Content managers build on the CMS. Learners engage on mobile. Both share the same SQL Server database.', {
    x: 2, y: 1.35, w: W - 4, h: 0.4,
    fontSize: 12, color: C.g400, align: 'center',
  });

  // Three arch boxes
  const boxes = [
    {
      x: 0.4, color: C.p600, titleCol: C.p300, bg: C.p700,
      title: '🖥️  CMS Portal  ·  :3000',
      sub: 'Spring Boot :8080  ·  Next.js :3000',
      items: ['Upload PPTX + Excel', 'Ingestion Pipeline', 'Training & Assignment Mgmt', 'Dashboard Analytics', 'Missed FAQ Review'],
    },
    {
      x: 4.92, color: C.violet, titleCol: 'c4b5fd', bg: '5b21b6',
      title: '⚡  AI Services',
      sub: 'Azure OpenAI  ·  GCS  ·  ElevenLabs',
      items: ['GPT-4o (Eval + RAG)', 'Embeddings 3-small', 'TTS Audio Engine', 'Azure STT Transcription'],
    },
    {
      x: 8.5, color: C.sky, titleCol: '7dd3fc', bg: '0c4a6e',
      title: '📱  Mobile App  ·  :8083',
      sub: 'Spring Boot :8081  ·  Expo RN :8083',
      items: ['Slide Player + Audio', 'AI Quiz (text + voice)', 'FAQ Chatbot (RAG)', 'Progress Tracking', '6 Language Switcher'],
    },
  ];

  boxes.forEach((b, bi) => {
    const bw = bi === 1 ? 3.4 : 3.9;
    // box bg
    slide_box(s, b.x, 2.0, bw, 4.9, b.bg, b.color);
    // title bar
    s.addShape(pptx.ShapeType.rect, {
      x: b.x, y: 2.0, w: bw, h: 0.38,
      fill: { type: 'solid', color: b.color, transparency: 40 },
      line: { type: 'none' },
    });
    s.addText(b.title, {
      x: b.x + 0.14, y: 2.02, w: bw - 0.2, h: 0.34,
      fontSize: 10.5, bold: true, color: b.titleCol,
    });
    // items
    b.items.forEach((item, i) => {
      s.addShape(pptx.ShapeType.roundRect, {
        x: b.x + 0.14, y: 2.5 + i * 0.52, w: bw - 0.28, h: 0.4,
        fill: { type: 'solid', color: 'FFFFFF', transparency: 92 },
        line: { type: 'none' }, rectRadius: 0.06,
      });
      s.addShape(pptx.ShapeType.ellipse, {
        x: b.x + 0.24, y: 2.64 + i * 0.52, w: 0.1, h: 0.1,
        fill: { type: 'solid', color: b.color },
        line: { type: 'none' },
      });
      s.addText(item, {
        x: b.x + 0.4, y: 2.5 + i * 0.52, w: bw - 0.55, h: 0.4,
        fontSize: 10.5, color: C.white,
      });
    });
    // sub label
    s.addText(b.sub, {
      x: b.x + 0.12, y: 6.6, w: bw - 0.24, h: 0.22,
      fontSize: 8, color: C.g500,
    });
  });

  // Arrows between boxes
  ['⇄', '⇄'].forEach((a, i) => {
    s.addText(a, {
      x: 4.35 + i * 3.6, y: 4.0, w: 0.5, h: 0.5,
      fontSize: 22, color: C.g500, align: 'center',
    });
  });

  slideNum(s, 2, TOTAL_SLIDES);
  console.log('✓ Slide 2 — Architecture');
}

function slide_box(slide, x, y, w, h, bg, border) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { type: 'solid', color: bg, transparency: 88 },
    line: { color: border, pt: 1, transparency: 50 },
    rectRadius: 0.2,
  });
}

// ══════════════════════════════════════════════════════════════
//  SLIDES 3-10: SCREENSHOT SLIDES (split layout)
// ══════════════════════════════════════════════════════════════
const screenshotSlides = [
  {
    n: 3, tag: 'CMS · Step 1', tagCol: C.p300, tagBg: C.p700,
    title: 'Upload & Configure',
    sub: 'Drop a PowerPoint deck and an Excel data sheet. Select languages, then launch the ingestion pipeline with a single click.',
    img: img('cms-home'), url: 'localhost:3000/upload-training', bg: 'light',
    bullets: [
      { icon: '📊', text: 'PPTX → slides auto-extracted via Apache POI' },
      { icon: '📋', text: 'Excel → FAQ rows + quiz questions parsed' },
      { icon: '🌐', text: '6 locales: EN / HI / TA / TE / MR / BN' },
      { icon: '🚀', text: 'One click starts the full ingestion pipeline' },
    ],
  },
  {
    n: 4, tag: 'CMS · Ingestion Pipeline', tagCol: C.amber, tagBg: 'a16207',
    title: 'Real-time Processing Monitor',
    sub: 'Watch each training move through the AI synthesis pipeline. Five stages: Ingesting → Parsing → Translating → Voice Gen → Live.',
    img: img('cms-processing'), url: 'localhost:3000/processing', bg: 'light',
    bullets: [
      { icon: '📥', text: 'Ingesting — slides parsed from PPTX' },
      { icon: '🔤', text: 'Parsing — FAQ + quiz rows extracted' },
      { icon: '🌐', text: 'Translating — content localised per language' },
      { icon: '🎵', text: 'Voice Gen — TTS audio per locale' },
      { icon: '✅', text: 'Live — training published & assigned' },
    ],
  },
  {
    n: 5, tag: 'CMS · Content Library', tagCol: C.p300, tagBg: C.p700,
    title: 'Trainings Management',
    sub: 'Full inventory of training modules with status, locale badges, learner progress counts, and quick-action buttons.',
    img: img('cms-trainings'), url: 'localhost:3000/trainings', bg: 'light',
    bullets: [
      { icon: '🟢', text: 'PUBLISHED — live and assignable' },
      { icon: '🔴', text: 'ERROR — pipeline failed, one-click re-run' },
      { icon: '🟡', text: 'READY — processed, not yet published' },
      { icon: '🌐', text: 'Locale flags show which languages are live' },
      { icon: '👤', text: 'Assign User button inline per training' },
    ],
  },
  {
    n: 6, tag: 'CMS · Dashboard Overview', tagCol: C.p300, tagBg: C.p700,
    title: 'Platform Health at a Glance',
    sub: '12 trainings · 5 published · Learner queries · Actionable insights — all on one overview screen.',
    img: img('cms-dashboard'), url: 'localhost:3000/dashboard', bg: 'light',
    bullets: [
      { icon: '📊', text: '12 total trainings, 5 published & live' },
      { icon: '👥', text: '5 assignments tracked with status' },
      { icon: '❓', text: '5 total FAQ gaps, 5 unreviewed queries' },
      { icon: '⚠️', text: 'Actionable insights — 3 failed modules flagged' },
      { icon: '📅', text: 'Recent activity feed at bottom' },
    ],
  },
  {
    n: 7, tag: 'CMS · Dashboard → Trainings', tagCol: C.p300, tagBg: C.p700,
    title: 'All Trainings in One Table',
    sub: 'Filter by READY / PROCESSING / ERROR / DRAFT. See locale availability, publish date, and status at a glance.',
    img: img('cms-dash-trainings'), url: 'localhost:3000/dashboard → Trainings', bg: 'light',
    bullets: [
      { icon: '🟢', text: 'READY rows are live on the mobile app' },
      { icon: '🔴', text: 'ERROR rows show the failure reason inline' },
      { icon: '🌐', text: 'EN / HI / BN locale chips per training' },
      { icon: '📅', text: 'Published and created dates tracked' },
      { icon: '🔢', text: 'Slide count per training visible at a glance' },
    ],
  },
  {
    n: 8, tag: 'CMS · Dashboard → Missed FAQs', tagCol: 'fca5a5', tagBg: '991b1b',
    title: 'Closed Feedback Loop',
    sub: 'Every question the AI couldn\'t answer is logged here. Review, then add to Excel to enrich future training content.',
    img: img('cms-dash-faq'), url: 'localhost:3000/dashboard → Missed FAQs', bg: 'light',
    bullets: [
      { icon: '❓', text: 'Most-asked gaps surfaced at the top' },
      { icon: '🌐', text: 'Questions shown in original locale (HI, EN…)' },
      { icon: '📌', text: 'Slide number + training linked per question' },
      { icon: '✅', text: 'Mark Reviewed to clear the admin queue' },
    ],
  },
  {
    n: 9, tag: 'CMS · Dashboard → Quiz Answers', tagCol: '6ee7b7', tagBg: '065f46',
    title: 'AI-Scored Quiz Results',
    sub: '4 submissions · 65% avg score · GPT-4o evaluates free-text answers against a rubric. Pass / Excellent thresholds enforced.',
    img: img('cms-dash-quiz'), url: 'localhost:3000/dashboard → Quiz Answers', bg: 'light',
    bullets: [
      { icon: '📊', text: 'Score bars per training module' },
      { icon: '🏅', text: 'Pass / Excellent / Below 60% thresholds' },
      { icon: '👤', text: 'Per-learner score table with evaluation date' },
      { icon: '🤖', text: 'Evaluated by GPT-4o, not manual grading' },
      { icon: '🔢', text: '8/10 scores with 80% pass rate shown' },
    ],
  },
  {
    n: 10, tag: 'CMS · Assignments', tagCol: '7dd3fc', tagBg: '0c4a6e',
    title: 'Assign & Track',
    sub: 'Allocate any training to any learner with a deadline. Track status across the entire cohort from a single screen.',
    img: img('cms-assignments'), url: 'localhost:3000/assignments', bg: 'light',
    bullets: [
      { icon: '👥', text: '5 total assigned, sorted by deadline' },
      { icon: '📅', text: 'Due dates with urgency countdown shown' },
      { icon: '🔍', text: 'Filter by product, status, or learner' },
      { icon: '⚡', text: 'New Assignment modal — one click' },
      { icon: '📊', text: 'Completion rate tracked at top of page' },
    ],
  },
];

screenshotSlides.forEach(data => {
  const s = pptx.addSlide();
  lightBg(s);

  // tag
  tag(s, data.tag, data.tagCol, data.tagBg, 0.45, 0.25);

  // title
  s.addText(data.title, {
    x: 0.45, y: 0.6, w: 5.1, h: 0.7,
    fontSize: 24, bold: true, color: C.g900, charSpacing: -0.3,
  });

  // sub
  s.addText(data.sub, {
    x: 0.45, y: 1.3, w: 5.1, h: 0.8,
    fontSize: 11.5, color: C.g500, wrap: true,
  });

  // bullets on light bg
  if (data.bullets) {
    data.bullets.forEach((b, i) => {
      s.addShape(pptx.ShapeType.roundRect, {
        x: 0.45, y: 2.22 + i * 0.53, w: 5.1, h: 0.44,
        fill: { type: 'solid', color: 'FFFFFF' },
        line: { color: C.g200, pt: 0.75 }, rectRadius: 0.1,
      });
      s.addText(b.icon + '  ' + b.text, {
        x: 0.6, y: 2.22 + i * 0.53, w: 4.9, h: 0.44,
        fontSize: 11, color: C.g700,
      });
    });
  }

  // browser frame + screenshot
  if (data.img) {
    browserShot(s, data.img, 5.8, 0.2, 7.1, data.url);
  }

  slideNum(s, data.n, TOTAL_SLIDES);
  console.log(`✓ Slide ${data.n} — ${data.title}`);
});

// ══════════════════════════════════════════════════════════════
//  SLIDE 11 — MOBILE: MY TRAININGS
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  tag(s, 'Mobile App · Learner Home', C.sky, '0c4a6e');

  s.addText('Personalised Training Feed', {
    x: 0.45, y: 0.65, w: 6.0, h: 0.6,
    fontSize: 26, bold: true, color: C.white, charSpacing: -0.4,
  });
  s.addText('Smart-sorted assignments — In Progress first, then by deadline.\n3/4 completed · 75% overall done.',
    { x: 0.45, y: 1.3, w: 5.5, h: 0.6, fontSize: 12, color: C.g400, wrap: true }
  );

  // phone
  const mImg = img('mobile-home');
  if (mImg) phoneShot(s, mImg, 0.5, 1.9, 2.5);

  // info cards
  const mcards = [
    { title: 'Smart Sorting', body: 'In Progress → nearest deadline → Not Started → Completed. Urgent items always surface first.', col: C.p500 },
    { title: 'Resume in One Tap', body: 'Backend persists slide index. Learner resumes exactly where they left off across sessions.', col: C.sky },
    { title: 'Tab Filters', body: 'All (4) · Not Started · In Progress (1) · Completed (3). Instant filter without reload.', col: C.emerald },
    { title: 'Multi-locale Chips', body: 'EN · HI · BN locale availability shown per card. Switch language inside the player.', col: C.amber },
  ];
  mcards.forEach((c, i) => infoCard(s, c.title, c.body, 3.3, 1.9 + i * 1.1, 4.4, c.col));

  slideNum(s, 11, TOTAL_SLIDES);
  console.log('✓ Slide 11 — Mobile: My Trainings');
}

// ══════════════════════════════════════════════════════════════
//  SLIDE 12 — MOBILE: PROGRESS CARDS
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  tag(s, 'Mobile App · Training Cards', '6ee7b7', '065f46');

  s.addText('Completion & Progress Tracking', {
    x: 0.45, y: 0.65, w: 6.0, h: 0.6,
    fontSize: 24, bold: true, color: C.white, charSpacing: -0.4,
  });
  s.addText('Real-time progress synced from backend — survives app restarts and device switches.',
    { x: 0.45, y: 1.3, w: 5.5, h: 0.45, fontSize: 12, color: C.g400, wrap: true }
  );

  const mImg2 = img('mobile-home-scrolled');
  if (mImg2) phoneShot(s, mImg2, 0.5, 1.9, 2.5);

  const mcards2 = [
    { title: 'In Progress — Helpdesk Training', body: '17% · Slide 1 of 6 · Due in 3 days. Resume button takes learner straight to current slide.', col: C.amber },
    { title: 'Completed — Product Launch TV', body: '100% · All 6 slides done · Completed May 13, 2026. Review mode available.', col: C.emerald },
    { title: 'Completed — Product Launch', body: '100% · All 6 slides done · EN · HI · BN locales available.', col: C.emerald },
    { title: 'Progress Persistence', body: 'Progress ID = userId + "_" + trainingId. Stored in SQL Server via mobile backend.', col: C.sky },
  ];
  mcards2.forEach((c, i) => infoCard(s, c.title, c.body, 3.3, 1.9 + i * 1.1, 4.4, c.col));

  slideNum(s, 12, TOTAL_SLIDES);
  console.log('✓ Slide 12 — Mobile: Progress Cards');
}

// ══════════════════════════════════════════════════════════════
//  SLIDE 13 — KEY CAPABILITIES
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);
  tag(s, 'Platform Capabilities', C.p300, C.p700);

  s.addText('Everything in one platform', {
    x: 1, y: 0.6, w: W - 2, h: 0.65,
    fontSize: 30, bold: true, color: C.white, align: 'center', charSpacing: -0.5,
  });

  const caps = [
    { icon: '📤', title: 'Content Ingestion', body: 'PPTX + Excel → slides, FAQs, quizzes. Fully automated. Apache POI extraction, parallel embedding.', col: C.p500 },
    { icon: '🎵', title: 'Multilingual Audio', body: '6 languages auto-generated: EN, HI, TA, TE, MR, BN. Distinct AI voice per locale. Zero manual recording.', col: C.violet },
    { icon: '🧠', title: 'AI Quiz Evaluation', body: 'GPT-4o scores free-text and voice answers against rubrics. Pass/Excellent thresholds. Per-learner feedback.', col: C.sky },
    { icon: '💬', title: 'RAG FAQ Chatbot', body: 'Cosine similarity search over embedded FAQs. GPT-4o grounded answers. Unanswered questions logged.', col: C.emerald },
    { icon: '📊', title: 'Admin Analytics', body: 'Score distributions, completion rates, missed FAQ queue, assignment tracking — all in the CMS dashboard.', col: C.amber },
    { icon: '📱', title: 'Mobile Experience', body: 'Expo React Native. Slide player, audio switcher, AI chat, quiz modal. Progress persists across sessions.', col: C.rose },
  ];

  caps.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.45 + col * 4.22;
    const y = 1.55 + row * 2.4;
    const w = 3.95;
    const h = 2.1;

    slide_box(s, x, y, w, h, C.brandL, C.brandA);

    // icon circle
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.18, y: y + 0.2, w: 0.62, h: 0.62,
      fill: { type: 'solid', color: c.col, transparency: 80 },
      line: { type: 'none' },
    });
    s.addText(c.icon, {
      x: x + 0.18, y: y + 0.2, w: 0.62, h: 0.62,
      fontSize: 20, align: 'center', valign: 'middle',
    });

    s.addText(c.title, {
      x: x + 0.9, y: y + 0.24, w: w - 1.05, h: 0.34,
      fontSize: 12.5, bold: true, color: C.white,
    });
    s.addText(c.body, {
      x: x + 0.18, y: y + 0.7, w: w - 0.36, h: 1.2,
      fontSize: 10.5, color: C.g400, wrap: true,
    });
  });

  slideNum(s, 13, TOTAL_SLIDES);
  console.log('✓ Slide 13 — Key Capabilities');
}

// ══════════════════════════════════════════════════════════════
//  SLIDE 14 — CLOSING
// ══════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  darkBg(s);

  // Large decorative glow
  s.addShape(pptx.ShapeType.ellipse, {
    x: W/2 - 3, y: 1, w: 6, h: 6,
    fill: { type: 'solid', color: C.p600, transparency: 88 },
    line: { type: 'none' },
  });

  s.addText('VirtualCoach · 2026', {
    x: 1, y: 0.7, w: W - 2, h: 0.32,
    fontSize: 10, color: C.p400, align: 'center', bold: true,
    charSpacing: 2,
  });
  s.addText('Train smarter.', {
    x: 1, y: 1.1, w: W - 2, h: 1.0,
    fontSize: 58, bold: true, color: C.white, align: 'center', charSpacing: -1.5,
  });
  s.addText('Sell better.', {
    x: 1, y: 1.95, w: W - 2, h: 1.0,
    fontSize: 58, bold: true, color: C.p400, align: 'center', charSpacing: -1.5,
  });

  s.addText('Full-stack AI training platform — from PowerPoint upload to multilingual\ninteractive learning with measurable, AI-scored outcomes.', {
    x: 2.5, y: 3.1, w: W - 5, h: 0.75,
    fontSize: 13, color: C.g400, align: 'center', wrap: true,
  });

  // Contact pills
  const contacts = [
    '📧  genailab.gem3@samsung.com',
    '🖥️  CMS: localhost:3000',
    '📱  Mobile: localhost:8083',
  ];
  contacts.forEach((c, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 1.6 + i * 3.3, y: 4.1, w: 3.05, h: 0.38,
      fill: { type: 'solid', color: 'FFFFFF', transparency: 92 },
      line: { color: 'FFFFFF', pt: 0.5, transparency: 75 },
      rectRadius: 0.12,
    });
    s.addText(c, {
      x: 1.6 + i * 3.3, y: 4.1, w: 3.05, h: 0.38,
      fontSize: 10.5, color: C.g300, align: 'center',
    });
  });

  // Tech tags
  const tags2 = ['Spring Boot 3.3', 'Next.js 16', 'React Native Expo 54', 'Azure GPT-4o', 'SQL Server', 'RAG + Embeddings'];
  tags2.forEach((t, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.7 + i * 2.05, y: 4.75, w: 1.85, h: 0.28,
      fill: { type: 'solid', color: 'FFFFFF', transparency: 94 },
      line: { color: 'FFFFFF', pt: 0.5, transparency: 80 },
      rectRadius: 0.07,
    });
    s.addText(t, {
      x: 0.7 + i * 2.05, y: 4.75, w: 1.85, h: 0.28,
      fontSize: 8.5, color: C.g500, align: 'center',
    });
  });

  slideNum(s, 14, TOTAL_SLIDES);
  console.log('✓ Slide 14 — Closing');
}

// ══════════════════════════════════════════════════════════════
//  WRITE FILE
// ══════════════════════════════════════════════════════════════
pptx.writeFile({ fileName: OUT })
  .then(() => {
    const size = (require('fs').statSync(OUT).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅ Saved: ${OUT}`);
    console.log(`   Size:  ${size} MB`);
  })
  .catch(e => console.error('Error:', e));

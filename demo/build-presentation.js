const fs = require('fs');
const path = require('path');

const SHOTS_DIR = path.join(__dirname, 'screenshots');

function b64(name) {
  const p = path.join(SHOTS_DIR, `${name}.png`);
  if (!fs.existsSync(p)) return '';
  return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
}

const imgs = {
  cmsHome:          b64('cms-home'),
  cmsDash:          b64('cms-dashboard'),
  cmsDashTrainings: b64('cms-dash-trainings'),
  cmsDashFaq:       b64('cms-dash-faq'),
  cmsDashQuiz:      b64('cms-dash-quiz'),
  cmsTrainings:     b64('cms-trainings'),
  cmsAssignments:   b64('cms-assignments'),
  cmsProcessing:    b64('cms-processing'),
  mobileHome:       b64('mobile-home'),
  mobileScrolled:   b64('mobile-home-scrolled'),
};

const html = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>VirtualCoach — Platform Presentation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --p400:#818cf8;--p500:#6366f1;--p600:#4f46e5;--p700:#4338ca;
  --violet:#7c3aed;--sky:#0ea5e9;--emerald:#10b981;--rose:#f43f5e;--amber:#f59e0b;
  --brand:#0f172a;--brand-l:#1e293b;
  --g50:#f8fafc;--g100:#f1f5f9;--g200:#e2e8f0;--g300:#cbd5e1;
  --g400:#94a3b8;--g500:#64748b;--g600:#475569;--g700:#334155;--g800:#1e293b;--g900:#0f172a;
}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Inter',sans-serif;background:#000}

/* ── Stage ── */
#stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}
.slide{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  opacity:0;transform:translateY(32px) scale(.98);
  transition:opacity .55s cubic-bezier(.4,0,.2,1),transform .55s cubic-bezier(.4,0,.2,1);
  pointer-events:none;overflow:hidden;
}
.slide.active{opacity:1;transform:none;pointer-events:auto}
.slide.exit{opacity:0;transform:translateY(-32px) scale(.98);transition:opacity .35s,transform .35s}

/* ── Progress ── */
#pbar{position:fixed;bottom:0;left:0;height:3px;
  background:linear-gradient(90deg,var(--p500),var(--violet));
  transition:width .5s cubic-bezier(.4,0,.2,1);z-index:100}

/* ── Controls ── */
#ctrl{
  position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
  display:flex;gap:8px;align-items:center;z-index:100;
  background:rgba(15,23,42,.8);backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:7px 16px;
}
#ctrl button{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.65);
  font-size:13px;padding:4px 10px;border-radius:999px;transition:all .2s;font-family:'Inter',sans-serif}
#ctrl button:hover{background:rgba(255,255,255,.12);color:#fff}
#ctr{color:rgba(255,255,255,.45);font-size:12px;min-width:48px;text-align:center}

/* ── Backgrounds ── */
.bg-dark{background:var(--brand)}
.bg-dark-mesh{
  background:var(--brand);
  background-image:
    radial-gradient(ellipse at 20% 20%,rgba(99,102,241,.3) 0,transparent 55%),
    radial-gradient(ellipse at 80% 75%,rgba(124,58,237,.22) 0,transparent 55%),
    radial-gradient(ellipse at 75% 10%,rgba(14,165,233,.18) 0,transparent 50%);
}
.bg-light{background:linear-gradient(160deg,#f0f4ff 0%,#f8fafc 100%)}
.bg-grad{background:linear-gradient(135deg,var(--p700) 0%,var(--violet) 100%)}

/* ── Animations ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes wave{from{height:4px}to{height:var(--h,18px)}}
.a1{animation:fadeUp .6s .05s both}
.a2{animation:fadeUp .6s .18s both}
.a3{animation:fadeUp .6s .32s both}
.a4{animation:fadeUp .6s .46s both}
.a5{animation:fadeUp .6s .6s both}

/* ── Shared helpers ── */
.tag{display:inline-flex;align-items:center;gap:6px;
  font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
  padding:5px 13px;border-radius:999px;margin-bottom:14px}
.tag-p{background:rgba(99,102,241,.15);color:var(--p400);border:1px solid rgba(99,102,241,.25)}
.tag-g{background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.25)}
.tag-s{background:rgba(14,165,233,.15);color:#38bdf8;border:1px solid rgba(14,165,233,.25)}
.tag-a{background:rgba(245,158,11,.15);color:#fbbf24;border:1px solid rgba(245,158,11,.25)}
.tag-r{background:rgba(244,63,94,.15);color:#fb7185;border:1px solid rgba(244,63,94,.25)}

.headline{font-size:clamp(1.8rem,4vw,3.2rem);font-weight:800;line-height:1.1;letter-spacing:-.03em}
.sub{font-size:clamp(.85rem,1.6vw,1.15rem);line-height:1.6;opacity:.6;max-width:520px;text-align:center}

/* Screen wrapper — browser chrome effect */
.browser{
  background:#fff;border-radius:14px;
  box-shadow:0 24px 80px rgba(0,0,0,.28),0 0 0 1px rgba(0,0,0,.1);
  overflow:hidden;display:flex;flex-direction:column;
}
.browser-bar{
  height:36px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;
  display:flex;align-items:center;gap:6px;padding:0 14px;flex-shrink:0;
}
.bdot{width:11px;height:11px;border-radius:50%}
.burl{flex:1;margin:0 10px;background:#e2e8f0;border-radius:6px;height:20px;
  display:flex;align-items:center;padding:0 10px;font-size:11px;color:var(--g500)}
.browser img{width:100%;display:block;object-fit:cover;object-position:top}

/* Phone frame */
.phone-frame{
  background:#0f172a;border-radius:44px;padding:10px;
  box-shadow:0 32px 80px rgba(0,0,0,.45),0 0 0 2px rgba(255,255,255,.08);
  display:flex;flex-direction:column;
}
.phone-screen{border-radius:36px;overflow:hidden;background:#1e293b}
.phone-screen img{width:100%;display:block}

/* Callout chips */
.callout{
  display:inline-flex;align-items:center;gap:7px;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
  border-radius:10px;padding:9px 15px;font-size:13px;font-weight:500;
  color:rgba(255,255,255,.8);
}
.callout .icon{font-size:15px}

/* Two-column layout */
.cols{display:flex;gap:28px;align-items:flex-start;width:100%;max-width:1080px;padding:0 32px}
.col-screen{flex:1.6}
.col-info{flex:1;display:flex;flex-direction:column;gap:14px}

/* Info card */
.icard{
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
  border-radius:14px;padding:16px 18px;
}
.icard h4{font-size:13px;font-weight:700;color:#fff;margin-bottom:6px}
.icard p{font-size:12px;color:rgba(255,255,255,.55);line-height:1.65}
.icard .chip{display:inline-block;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:700;margin-top:7px}

/* Feature list */
.flist{display:flex;flex-direction:column;gap:8px}
.fitem{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:rgba(255,255,255,.75);line-height:1.55}
.fitem .fi{font-size:15px;flex-shrink:0;margin-top:1px}

/* Stats row */
.stats{display:flex;gap:20px;flex-wrap:wrap}
.stat-box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
  border-radius:12px;padding:14px 20px;text-align:center}
.stat-box .num{font-size:26px;font-weight:800;line-height:1}
.stat-box .lbl{font-size:11px;color:rgba(255,255,255,.45);margin-top:4px}

/* ── Slide-specific ── */

/* S1: Hero */
#s1 .grid{position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
  background-size:56px 56px}
#s1 h1{font-size:clamp(3.2rem,7.5vw,6.4rem);font-weight:900;line-height:.95;
  letter-spacing:-.05em;color:#fff;text-align:center}
#s1 .grad{
  background:linear-gradient(130deg,var(--p400) 0%,#a78bfa 45%,var(--sky) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
#s1 .pills{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:28px}
#s1 .pill{display:flex;align-items:center;gap:7px;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
  border-radius:999px;padding:8px 18px;font-size:13px;font-weight:500;color:rgba(255,255,255,.75)}
#s1 .badge-live{display:inline-flex;align-items:center;gap:8px;
  background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);
  border-radius:999px;padding:6px 16px;margin-bottom:26px}
#s1 .badge-live .dot{width:8px;height:8px;border-radius:50%;
  background:var(--p400);animation:pulse 2s infinite}
#s1 .badge-live span{font-size:12px;color:var(--p300);font-weight:600}

/* S2: Platform map */
#s2 .arch{display:flex;align-items:stretch;gap:0;max-width:960px;width:100%;padding:0 28px}
#s2 .abox{flex:1;border-radius:18px;padding:24px 20px}
#s2 .arr{width:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,.2);font-size:22px}
#s2 .atitle{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:14px}
#s2 .aitem{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;
  margin-bottom:7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}
#s2 .aitem span{font-size:12px;color:rgba(255,255,255,.78);font-weight:500}
#s2 .adot{width:7px;height:7px;border-radius:50%;flex-shrink:0}

/* Hint line at bottom */
.hint{position:absolute;bottom:56px;font-size:11px;
  color:rgba(255,255,255,.25);letter-spacing:.05em;animation:fadeIn 1s 2s both}
</style>
</head>
<body>
<div id="stage">

<!-- ═══════════════════════════════════════════════
  1. HERO
═══════════════════════════════════════════════ -->
<section class="slide bg-dark-mesh" id="s1">
  <div class="grid"></div>
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center">
    <div class="badge-live a1"><div class="dot"></div><span>Live Platform Demo · May 2026</span></div>
    <h1 class="a2">Virtual<span class="grad">Coach</span></h1>
    <p class="sub a3" style="color:rgba(255,255,255,.55);margin-top:18px">
      AI-powered multilingual sales training — from PowerPoint upload to scored quiz, in minutes.
    </p>
    <div class="pills a4">
      <div class="pill">🖥️ CMS Portal</div>
      <div class="pill">📱 Mobile App</div>
      <div class="pill">🧠 GPT-4o Evaluation</div>
      <div class="pill">💬 RAG FAQ Assistant</div>
      <div class="pill">🌐 6 Languages</div>
    </div>
    <div style="display:flex;gap:20px;margin-top:36px" class="a5">
      <div class="stat-box"><div class="num" style="color:var(--p400)">12</div><div class="lbl">Trainings</div></div>
      <div class="stat-box"><div class="num" style="color:#34d399">65%</div><div class="lbl">Avg Quiz Score</div></div>
      <div class="stat-box"><div class="num" style="color:var(--sky)">6</div><div class="lbl">Languages</div></div>
      <div class="stat-box"><div class="num" style="color:#fbbf24">847</div><div class="lbl">Learners</div></div>
    </div>
  </div>
  <div class="hint">SPACE / → to advance &nbsp;·&nbsp; ← back &nbsp;·&nbsp; P pause</div>
</section>

<!-- ═══════════════════════════════════════════════
  2. PLATFORM ARCHITECTURE
═══════════════════════════════════════════════ -->
<section class="slide bg-dark" id="s2">
  <div style="text-align:center;margin-bottom:28px">
    <div class="tag tag-p a1">System Architecture</div>
    <h2 class="headline a2" style="color:#fff">Two apps. One shared AI brain.</h2>
    <p class="sub a3" style="margin:12px auto 0;color:rgba(255,255,255,.5)">
      Content managers build on the CMS. Learners engage on mobile. Both read the same SQL Server database.
    </p>
  </div>
  <div class="arch a4">
    <div class="abox" style="background:rgba(79,70,229,.12);border:1px solid rgba(99,102,241,.22)">
      <div class="atitle" style="color:var(--p400)">🖥️  CMS Portal · :3000</div>
      <div class="aitem"><div class="adot" style="background:var(--p400)"></div><span>Upload PPTX + Excel</span></div>
      <div class="aitem"><div class="adot" style="background:var(--p400)"></div><span>Ingestion Pipeline</span></div>
      <div class="aitem"><div class="adot" style="background:var(--p400)"></div><span>Training & Assignment Mgmt</span></div>
      <div class="aitem"><div class="adot" style="background:var(--p400)"></div><span>Dashboard Analytics</span></div>
      <div class="aitem"><div class="adot" style="background:var(--p400)"></div><span>Missed FAQ Review</span></div>
      <div style="margin-top:12px;font-size:11px;color:rgba(255,255,255,.35)">Spring Boot :8080 · Next.js :3000</div>
    </div>
    <div class="arr">⇄</div>
    <div class="abox" style="background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.22);max-width:195px;flex-shrink:0">
      <div class="atitle" style="color:#a78bfa">⚡ AI Services</div>
      <div class="aitem"><div class="adot" style="background:#a78bfa"></div><span>GPT-4o (Eval + RAG)</span></div>
      <div class="aitem"><div class="adot" style="background:#a78bfa"></div><span>Embeddings 3-small</span></div>
      <div class="aitem"><div class="adot" style="background:#a78bfa"></div><span>TTS Audio Engine</span></div>
      <div class="aitem"><div class="adot" style="background:#a78bfa"></div><span>Azure STT</span></div>
      <div style="margin-top:12px;font-size:11px;color:rgba(255,255,255,.35)">SQL Server · GCS · Azure</div>
    </div>
    <div class="arr">⇄</div>
    <div class="abox" style="background:rgba(14,165,233,.1);border:1px solid rgba(14,165,233,.22)">
      <div class="atitle" style="color:var(--sky)">📱 Mobile App · :8083</div>
      <div class="aitem"><div class="adot" style="background:var(--sky)"></div><span>Slide Player + Audio</span></div>
      <div class="aitem"><div class="adot" style="background:var(--sky)"></div><span>AI Quiz (text + voice)</span></div>
      <div class="aitem"><div class="adot" style="background:var(--sky)"></div><span>FAQ Chatbot (RAG)</span></div>
      <div class="aitem"><div class="adot" style="background:var(--sky)"></div><span>Progress Tracking</span></div>
      <div class="aitem"><div class="adot" style="background:var(--sky)"></div><span>6 Language Switcher</span></div>
      <div style="margin-top:12px;font-size:11px;color:rgba(255,255,255,.35)">Spring Boot :8081 · Expo RN :8083</div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  3. CMS — UPLOAD TRAINING
═══════════════════════════════════════════════ -->
<section class="slide bg-light" id="s3">
  <div class="cols">
    <div class="col-screen a2">
      <div class="browser" style="max-width:640px">
        <div class="browser-bar">
          <div class="bdot" style="background:#ef4444"></div>
          <div class="bdot" style="background:#f59e0b"></div>
          <div class="bdot" style="background:#22c55e"></div>
          <div class="burl">localhost:3000/upload-training</div>
        </div>
        <img src="${imgs.cmsHome}" alt="CMS Upload">
      </div>
    </div>
    <div class="col-info" style="color:#fff">
      <div class="a1"><div class="tag tag-p" style="color:var(--p600);background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.2)">CMS · Step 1</div></div>
      <h2 class="headline a2" style="color:var(--g900)">Upload &amp; Configure</h2>
      <p style="font-size:14px;color:var(--g500);line-height:1.7" class="a3">
        Drop a PowerPoint deck and an Excel data sheet. Select training languages and hit start.
      </p>
      <div class="flist a4" style="gap:10px">
        <div class="fitem" style="color:var(--g700)"><span class="fi">📊</span>PPTX → slides auto-extracted via Apache POI</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">📋</span>Excel → FAQ rows + quiz questions parsed</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🌐</span>6 locales selectable: EN / HI / TA / TE / MR / BN</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🚀</span>Single click starts the full ingestion pipeline</div>
      </div>
      <div class="a5" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        <span style="padding:4px 11px;background:#ede9fe;color:#6d28d9;border-radius:7px;font-size:12px;font-weight:700">PPTX</span>
        <span style="padding:4px 11px;background:#dcfce7;color:#15803d;border-radius:7px;font-size:12px;font-weight:700">XLSX</span>
        <span style="padding:4px 11px;background:#e0f2fe;color:#0369a1;border-radius:7px;font-size:12px;font-weight:700">Max 100 MB</span>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  4. CMS — INGESTION PIPELINE
═══════════════════════════════════════════════ -->
<section class="slide bg-light" id="s4">
  <div class="cols">
    <div class="col-screen a2">
      <div class="browser" style="max-width:640px">
        <div class="browser-bar">
          <div class="bdot" style="background:#ef4444"></div>
          <div class="bdot" style="background:#f59e0b"></div>
          <div class="bdot" style="background:#22c55e"></div>
          <div class="burl">localhost:3000/processing</div>
        </div>
        <img src="${imgs.cmsProcessing}" alt="Processing Pipeline">
      </div>
    </div>
    <div class="col-info">
      <div class="a1"><div class="tag tag-a" style="color:#92400e;background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.2)">CMS · Ingestion Pipeline</div></div>
      <h2 class="headline a2" style="color:var(--g900)">Real-time Processing Monitor</h2>
      <p style="font-size:14px;color:var(--g500);line-height:1.7" class="a3">
        Watch each training move through the AI synthesis pipeline in real time.
      </p>
      <div class="flist a4" style="gap:10px">
        <div class="fitem" style="color:var(--g700)"><span class="fi">📥</span><strong>Ingesting</strong> — slides parsed from PPTX</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🔤</span><strong>Parsing</strong> — FAQ + quiz rows extracted from Excel</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🌐</span><strong>Translating</strong> — content localised per language</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🎵</span><strong>Voice Gen</strong> — TTS audio per locale via Audio Engine</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">✅</span><strong>Live</strong> — training published &amp; assigned</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px" class="a5">
        <span style="padding:5px 12px;background:#dcfce7;color:#15803d;border-radius:8px;font-size:12px;font-weight:700">STABLE</span>
        <span style="padding:5px 12px;background:#fef9c3;color:#854d0e;border-radius:8px;font-size:12px;font-weight:700">ACTIVE</span>
        <span style="padding:5px 12px;background:#fee2e2;color:#b91c1c;border-radius:8px;font-size:12px;font-weight:700">ERRORS</span>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  5. CMS — TRAININGS MANAGEMENT
═══════════════════════════════════════════════ -->
<section class="slide bg-light" id="s5">
  <div class="cols">
    <div class="col-screen a2">
      <div class="browser" style="max-width:640px">
        <div class="browser-bar">
          <div class="bdot" style="background:#ef4444"></div>
          <div class="bdot" style="background:#f59e0b"></div>
          <div class="bdot" style="background:#22c55e"></div>
          <div class="burl">localhost:3000/trainings</div>
        </div>
        <img src="${imgs.cmsTrainings}" alt="Trainings Management">
      </div>
    </div>
    <div class="col-info">
      <div class="a1"><div class="tag tag-p" style="color:var(--p600);background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.2)">CMS · Content Library</div></div>
      <h2 class="headline a2" style="color:var(--g900)">Trainings Management</h2>
      <p style="font-size:14px;color:var(--g500);line-height:1.7" class="a3">
        Full inventory of training modules with status, locale badges, learner progress, and quick actions.
      </p>
      <div class="flist a4" style="gap:10px">
        <div class="fitem" style="color:var(--g700)"><span class="fi">🟢</span>PUBLISHED — live and assignable to learners</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🔴</span>ERROR — pipeline failed, one-click re-run</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🟡</span>READY — processed, not yet published</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">👤</span>Assign User button inline per training</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🌐</span>Locale flags show which languages are live</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  6. CMS — DASHBOARD OVERVIEW
═══════════════════════════════════════════════ -->
<section class="slide bg-light" id="s6">
  <div style="text-align:center;margin-bottom:20px">
    <div class="tag tag-p a1" style="color:var(--p600);background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.2)">CMS · Dashboard — Overview</div>
    <h2 class="headline a2" style="color:var(--g900)">Platform Health at a Glance</h2>
    <p style="font-size:14px;color:var(--g500);max-width:520px;margin:10px auto 0;line-height:1.6" class="a3">
      12 trainings · 5 published · Learner queries · Actionable insights — all on one screen.
    </p>
  </div>
  <div class="a4" style="width:820px;max-width:95vw">
    <div class="browser">
      <div class="browser-bar">
        <div class="bdot" style="background:#ef4444"></div>
        <div class="bdot" style="background:#f59e0b"></div>
        <div class="bdot" style="background:#22c55e"></div>
        <div class="burl">localhost:3000/dashboard</div>
      </div>
      <img src="${imgs.cmsDash}" alt="Dashboard Overview" style="max-height:480px;object-fit:cover;object-position:top">
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  7. CMS — DASHBOARD: TRAININGS TAB
═══════════════════════════════════════════════ -->
<section class="slide bg-light" id="s7">
  <div class="cols">
    <div class="col-screen a2" style="flex:1.8">
      <div class="browser">
        <div class="browser-bar">
          <div class="bdot" style="background:#ef4444"></div>
          <div class="bdot" style="background:#f59e0b"></div>
          <div class="bdot" style="background:#22c55e"></div>
          <div class="burl">localhost:3000/dashboard → Trainings</div>
        </div>
        <img src="${imgs.cmsDashTrainings}" alt="Dashboard Trainings Tab">
      </div>
    </div>
    <div class="col-info">
      <div class="a1"><div class="tag tag-p" style="color:var(--p600);background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.2)">CMS · Dashboard → Trainings</div></div>
      <h2 class="headline a2" style="color:var(--g900);font-size:1.9rem">All trainings in one table</h2>
      <p style="font-size:13px;color:var(--g500);line-height:1.7" class="a3">
        Filter by READY / PROCESSING / ERROR / DRAFT. See locale availability, publish date, and status at a glance.
      </p>
      <div class="flist a4" style="gap:9px">
        <div class="fitem" style="color:var(--g700)"><span class="fi">🟢</span>READY rows are live on mobile</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🔴</span>ERROR rows show the failure reason inline</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🌐</span>EN / HI / BN locale chips per training</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">📅</span>Published and created dates tracked</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  8. CMS — DASHBOARD: MISSED FAQs
═══════════════════════════════════════════════ -->
<section class="slide bg-light" id="s8">
  <div class="cols">
    <div class="col-screen a2" style="flex:1.8">
      <div class="browser">
        <div class="browser-bar">
          <div class="bdot" style="background:#ef4444"></div>
          <div class="bdot" style="background:#f59e0b"></div>
          <div class="bdot" style="background:#22c55e"></div>
          <div class="burl">localhost:3000/dashboard → Missed FAQs</div>
        </div>
        <img src="${imgs.cmsDashFaq}" alt="Missed FAQs">
      </div>
    </div>
    <div class="col-info">
      <div class="a1"><div class="tag tag-r" style="color:#9f1239;background:rgba(244,63,94,.08);border-color:rgba(244,63,94,.18)">CMS · Missed FAQs</div></div>
      <h2 class="headline a2" style="color:var(--g900);font-size:1.9rem">Closed feedback loop</h2>
      <p style="font-size:13px;color:var(--g500);line-height:1.7" class="a3">
        Every question the AI couldn't answer is logged here. Admins review, then add them back to Excel to enrich future training.
      </p>
      <div class="flist a4" style="gap:9px">
        <div class="fitem" style="color:var(--g700)"><span class="fi">❓</span>Most-asked gaps surfaced at top</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🌐</span>Questions shown in original locale (HI, EN…)</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">📌</span>Slide number + training linked per question</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">✅</span>Mark Reviewed to clear the queue</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  9. CMS — DASHBOARD: QUIZ ANSWERS
═══════════════════════════════════════════════ -->
<section class="slide bg-light" id="s9">
  <div class="cols">
    <div class="col-screen a2" style="flex:1.8">
      <div class="browser">
        <div class="browser-bar">
          <div class="bdot" style="background:#ef4444"></div>
          <div class="bdot" style="background:#f59e0b"></div>
          <div class="bdot" style="background:#22c55e"></div>
          <div class="burl">localhost:3000/dashboard → Quiz Answers</div>
        </div>
        <img src="${imgs.cmsDashQuiz}" alt="Quiz Answers">
      </div>
    </div>
    <div class="col-info">
      <div class="a1"><div class="tag tag-g" style="color:#065f46;background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.18)">CMS · Quiz Analytics</div></div>
      <h2 class="headline a2" style="color:var(--g900);font-size:1.9rem">AI-scored results</h2>
      <p style="font-size:13px;color:var(--g500);line-height:1.7" class="a3">
        4 submissions · 65% avg score · 4 passed. GPT-4o evaluates free-text answers against a rubric.
      </p>
      <div class="flist a4" style="gap:9px">
        <div class="fitem" style="color:var(--g700)"><span class="fi">📊</span>Score bars per training module</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🏅</span>Pass / Excellent / Below 60% thresholds</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">👤</span>Per-learner score table with evaluation date</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🤖</span>Evaluated by GPT-4o, not manual grading</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  10. CMS — ASSIGNMENTS
═══════════════════════════════════════════════ -->
<section class="slide bg-light" id="s10">
  <div class="cols">
    <div class="col-screen a2">
      <div class="browser" style="max-width:640px">
        <div class="browser-bar">
          <div class="bdot" style="background:#ef4444"></div>
          <div class="bdot" style="background:#f59e0b"></div>
          <div class="bdot" style="background:#22c55e"></div>
          <div class="burl">localhost:3000/assignments</div>
        </div>
        <img src="${imgs.cmsAssignments}" alt="Assignments">
      </div>
    </div>
    <div class="col-info">
      <div class="a1"><div class="tag tag-s" style="color:#0c4a6e;background:rgba(14,165,233,.08);border-color:rgba(14,165,233,.18)">CMS · Assignments</div></div>
      <h2 class="headline a2" style="color:var(--g900)">Assign &amp; Track</h2>
      <p style="font-size:14px;color:var(--g500);line-height:1.7" class="a3">
        Allocate any training to any learner with a deadline. Track status across the entire cohort.
      </p>
      <div class="flist a4" style="gap:10px">
        <div class="fitem" style="color:var(--g700)"><span class="fi">👥</span>5 total assigned, deadline-sorted</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">📅</span>Due dates shown with urgency countdown</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">🔍</span>Filter by product, status, or learner</div>
        <div class="fitem" style="color:var(--g700)"><span class="fi">⚡</span>New Assignment modal — one click</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px" class="a5">
        <span style="padding:5px 12px;background:#e0f2fe;color:#0369a1;border-radius:8px;font-size:12px;font-weight:700">5 Assigned</span>
        <span style="padding:5px 12px;background:#dcfce7;color:#15803d;border-radius:8px;font-size:12px;font-weight:700">0 Completed</span>
        <span style="padding:5px 12px;background:#fef9c3;color:#854d0e;border-radius:8px;font-size:12px;font-weight:700">0 Overdue</span>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  11. MOBILE — MY TRAININGS
═══════════════════════════════════════════════ -->
<section class="slide bg-dark-mesh" id="s11">
  <div style="text-align:center;margin-bottom:28px;position:relative;z-index:1">
    <div class="tag tag-s a1">Mobile App · Learner Home</div>
    <h2 class="headline a2" style="color:#fff">Personalised Training Feed</h2>
    <p class="sub a3" style="color:rgba(255,255,255,.5);margin:10px auto 0">
      Smart-sorted assignments — In Progress first, then by deadline. 75% overall completion.
    </p>
  </div>
  <div style="display:flex;gap:40px;align-items:flex-start;position:relative;z-index:1" class="a4">
    <div class="phone-frame" style="width:260px">
      <div class="phone-screen">
        <img src="${imgs.mobileHome}" alt="Mobile Home">
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;max-width:300px">
      <div class="icard">
        <h4>Smart Sorting</h4>
        <p>In Progress → nearest deadline → Not Started → Completed. Learners see what needs attention first.</p>
      </div>
      <div class="icard">
        <h4>Progress at a Glance</h4>
        <p>Per-card progress bar, slide count, available locales, and due date with urgency badge.</p>
        <div class="chip" style="background:rgba(99,102,241,.2);color:var(--p400)">Resume → one tap</div>
      </div>
      <div class="icard">
        <h4>Tab Filters</h4>
        <p>All (4) · Not Started · In Progress (1) · Completed (3) — instant filter without reload.</p>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  12. MOBILE — TRAINING CARDS (SCROLLED)
═══════════════════════════════════════════════ -->
<section class="slide bg-dark-mesh" id="s12">
  <div style="text-align:center;margin-bottom:24px;position:relative;z-index:1">
    <div class="tag tag-g a1">Mobile App · Training Cards</div>
    <h2 class="headline a2" style="color:#fff">Completion &amp; Progress Tracking</h2>
    <p class="sub a3" style="color:rgba(255,255,255,.5);margin:10px auto 0">
      Each card shows real-time progress synced from the backend — survives app restarts and device switches.
    </p>
  </div>
  <div style="display:flex;gap:40px;align-items:flex-start;position:relative;z-index:1" class="a4">
    <div class="phone-frame" style="width:260px">
      <div class="phone-screen">
        <img src="${imgs.mobileScrolled}" alt="Mobile Scrolled">
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;max-width:300px">
      <div class="icard">
        <h4>In Progress</h4>
        <p>Helpdesk Training at 17% · Slide 1 of 6 · Due in 3 days. Resume button takes learner exactly where they left off.</p>
        <div class="chip" style="background:rgba(245,158,11,.15);color:#fbbf24">3d left — urgent</div>
      </div>
      <div class="icard">
        <h4>Completed</h4>
        <p>Product Launch TV and Product Launch both at 100%. Completion date recorded. Review mode available.</p>
        <div class="chip" style="background:rgba(16,185,129,.15);color:#34d399">✓ 100% · Completed</div>
      </div>
      <div class="icard">
        <h4>Multi-locale</h4>
        <p>EN · HI · BN locale chips shown per card — learner can switch audio language inside the player.</p>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  13. SUMMARY — KEY CAPABILITIES
═══════════════════════════════════════════════ -->
<section class="slide bg-dark" id="s13">
  <div style="text-align:center;margin-bottom:32px;position:relative;z-index:1">
    <div class="tag tag-p a1">Platform Capabilities</div>
    <h2 class="headline a2" style="color:#fff">Everything in one platform</h2>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:900px;width:100%;padding:0 28px;position:relative;z-index:1" class="a3">
    <div class="icard">
      <h4>📤 Content Ingestion</h4>
      <p>PPTX + Excel → slides, FAQs, quizzes. Fully automated. Apache POI extraction with async parallel embedding.</p>
    </div>
    <div class="icard">
      <h4>🎵 Multilingual Audio</h4>
      <p>6 languages auto-generated: EN, HI, TA, TE, MR, BN. Distinct AI voice per locale. Zero manual recording.</p>
    </div>
    <div class="icard">
      <h4>🧠 AI Quiz Evaluation</h4>
      <p>GPT-4o scores free-text and voice answers against rubrics. Pass/Excellent thresholds. Per-learner feedback.</p>
    </div>
    <div class="icard">
      <h4>💬 RAG FAQ Chatbot</h4>
      <p>Cosine similarity search over embedded FAQs. GPT-4o grounded answers. Unanswered questions logged for admins.</p>
    </div>
    <div class="icard">
      <h4>📊 Admin Analytics</h4>
      <p>Score distributions, completion rates, missed FAQ queue, assignment tracking — all in the CMS dashboard.</p>
    </div>
    <div class="icard">
      <h4>📱 Mobile Experience</h4>
      <p>Expo React Native. Slide player, audio switcher, AI chat, quiz modal. Progress persists across sessions.</p>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════
  14. CLOSING
═══════════════════════════════════════════════ -->
<section class="slide bg-dark-mesh" id="s14">
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center">
    <div class="tag tag-p a1">VirtualCoach · 2026</div>
    <h2 style="font-size:clamp(2.2rem,6vw,4.5rem);font-weight:900;letter-spacing:-.04em;color:#fff;line-height:1" class="a2">
      Train smarter.<br>
      <span style="background:linear-gradient(130deg,var(--p400),#a78bfa,var(--sky));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Sell better.</span>
    </h2>
    <p style="font-size:clamp(.9rem,1.8vw,1.15rem);color:rgba(255,255,255,.5);max-width:480px;margin:20px auto 0;line-height:1.7" class="a3">
      Full-stack AI training platform — from PowerPoint upload to multilingual interactive learning with measurable outcomes.
    </p>
    <div style="display:flex;gap:12px;margin-top:36px;flex-wrap:wrap;justify-content:center" class="a4">
      <div class="callout"><span class="icon">📧</span>genailab.gem3@samsung.com</div>
      <div class="callout"><span class="icon">🖥️</span>CMS: localhost:3000</div>
      <div class="callout"><span class="icon">📱</span>Mobile: localhost:8083</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:24px" class="a5">
      ${['Spring Boot 3.3','Next.js 16','React Native Expo 54','Azure GPT-4o','SQL Server','6 Languages','RAG + Embeddings','Apache POI'].map(t =>
        `<span style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:5px 13px;font-size:11px;font-weight:600;color:rgba(255,255,255,.45)">${t}</span>`
      ).join('')}
    </div>
  </div>
</section>

</div><!-- /stage -->

<div id="pbar"></div>
<div id="ctrl">
  <button id="pb" title="← back">&#8592;</button>
  <span id="ctr">1 / 14</span>
  <button id="pp" title="Pause P">⏸</button>
  <button id="pn" title="→ next">&#8594;</button>
</div>

<script>
const SLIDES = Array.from(document.querySelectorAll('.slide'));
const N = SLIDES.length;
let cur = 0, paused = false, timer = null;
const AUTO = 9000;

function show(idx) {
  const prev = cur;
  cur = ((idx % N) + N) % N;
  if (prev !== cur) {
    SLIDES[prev].classList.remove('active');
    SLIDES[prev].classList.add('exit');
    setTimeout(() => SLIDES[prev].classList.remove('exit'), 450);
  }
  SLIDES[cur].classList.add('active');
  // retrigger animations
  SLIDES[cur].querySelectorAll('.a1,.a2,.a3,.a4,.a5').forEach(el => {
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  });
  document.getElementById('ctr').textContent = (cur+1) + ' / ' + N;
  document.getElementById('pbar').style.width = ((cur+1)/N*100) + '%';
  document.getElementById('pp').textContent = paused ? '▶' : '⏸';
}

function tick() { clearTimeout(timer); if (!paused) timer = setTimeout(() => { show(cur+1); tick(); }, AUTO); }
function pause() { paused = !paused; document.getElementById('pp').textContent = paused?'▶':'⏸'; paused ? clearTimeout(timer) : tick(); }

document.getElementById('pn').onclick = () => { show(cur+1); tick(); };
document.getElementById('pb').onclick = () => { show(cur-1); tick(); };
document.getElementById('pp').onclick = pause;
document.addEventListener('keydown', e => {
  if (e.key==='ArrowRight'||e.key===' ') { e.preventDefault(); show(cur+1); tick(); }
  if (e.key==='ArrowLeft')               { e.preventDefault(); show(cur-1); tick(); }
  if (e.key==='p'||e.key==='P')          pause();
});
document.getElementById('stage').addEventListener('click', e => {
  if (!e.target.closest('#ctrl')) { show(cur+1); tick(); }
});

show(0); tick();
</script>
</body>
</html>`;

const outFile = path.join(__dirname, 'virtualcoach-presentation.html');
fs.writeFileSync(outFile, html, 'utf-8');
const sizeMB = (fs.statSync(outFile).size / 1024 / 1024).toFixed(1);
console.log(`✓ Written: ${outFile}`);
console.log(`  Size: ${sizeMB} MB`);

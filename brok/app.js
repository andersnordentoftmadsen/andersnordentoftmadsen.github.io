// Brøk Tutor: forklaringer, opgaver (laves og rettes her med præcis brøkregning) og Brøkhjælperen (prompt-helper).
"use strict";

// Brøkhjælperen kræver serveren (prompt-helper). På GitHub Pages er siden helt statisk og uden hjælper.
const HAS_LLM = !/\.github\.io$/.test(location.hostname);

// ---------- små hjælpere ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const lcm = (a, b) => a / gcd(a, b) * b;
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dk = x => String(Math.round(x * 10000) / 10000).replace(".", ",");
const store = {
  get(k, d) { try { const v = localStorage.getItem("brok:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("brok:" + k, JSON.stringify(v)); } catch { /* privat vindue */ } },
};

// Brøk med heltal. Forkortes kun, når man beder om det (s), så 6/8 kan vises som 6/8.
class Q {
  constructor(n, d = 1) { if (d < 0) { n = -n; d = -d; } this.n = n; this.d = d; }
  s() { const k = gcd(this.n, this.d) || 1; return new Q(this.n / k, this.d / k); }
  add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d).s(); }
  sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d).s(); }
  mul(o) { return new Q(this.n * o.n, this.d * o.d).s(); }
  div(o) { return new Q(this.n * o.d, this.d * o.n).s(); }
  eq(o) { return this.n * o.d === o.n * this.d; }
  cmp(o) { return Math.sign(this.n * o.d - o.n * this.d); }
  simplest() { return gcd(this.n, this.d) === 1; }
  v() { return this.n / this.d; }
  t() { return this.d === 1 ? String(this.n) : this.n + "/" + this.d; }
  m() { const s = this.s(); if (s.d === 1 || s.n < s.d) return s.t(); const w = Math.floor(s.n / s.d); return w + " " + (s.n - w * s.d) + "/" + s.d; }
}
const q = (n, d) => new Q(n, d);
const coprimeBelow = b => { const c = []; for (let a = 1; a < b; a++) if (gcd(a, b) === 1) c.push(a); return pick(c); };
const properFrac = (minD, maxD) => { const d = ri(minD, maxD); return q(coprimeBelow(d), d); };

// Tekst med brøkerne "3/4" og "1 1/2" -> pæne brøker. Også lidt markdown fra hjælperen (**fed**, lister).
function fracHTML(n, d) { return `<span class="fr"><span>${n}</span><span>${d}</span></span>`; }
function fmt(text) {
  let s = esc(text)
    .replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\[()[\]]|\$+/g, "")
    .replace(/\\cdot/g, "·").replace(/\\times/g, "·").replace(/\\div/g, ":").replace(/×/g, "·").replace(/÷/g, ":");
  s = s.replace(/(^|[^\d,./])(\d+) (\d+|\?)\/(\d+|\?)(?![\d/])/g, (_, p, w, n, d) => `${p}<span class="mx">${w}</span>${fracHTML(n, d)}`);
  s = s.replace(/(^|[^\d,./])(\d+|\?)\/(\d+|\?)(?![\d/])/g, (_, p, n, d) => p + fracHTML(n, d));
  s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,!?])/g, "$1<i>$2</i>");
  const lines = s.split("\n"); let out = "", inList = false;
  for (const l of lines) {
    const m = l.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)/);
    if (m) { if (!inList) { out += "<ul>"; inList = true; } out += `<li>${m[1]}</li>`; continue; }
    if (inList) { out += "</ul>"; inList = false; }
    const h = l.match(/^\s*#{1,4}\s+(.*)/);
    out += h ? `<p><b>${h[1]}</b></p>` : (l.trim() ? `<p>${l}</p>` : "");
  }
  return out + (inList ? "</ul>" : "");
}
const fmtLine = t => fmt(t).replace(/^<p>|<\/p>$/g, "");

// ---------- figurer ----------
function bars(k, n, wholes = 1, cls = "") {
  const W = 300, H = 40, gap = 12, h = wholes * (H + gap) - gap + 4;
  let s = `<svg class="vis bar ${cls}" viewBox="0 0 ${W + 4} ${h}" role="img" aria-label="${k} af ${n * wholes} dele farvet">`;
  for (let w = 0; w < wholes; w++) for (let i = 0; i < n; i++) {
    const idx = w * n + i;
    s += `<rect x="${2 + i * W / n}" y="${2 + w * (H + gap)}" width="${W / n}" height="${H}" class="${idx < k ? "on" : "off"}" data-i="${idx}"/>`;
  }
  return s + "</svg>";
}
function pie(k, n) {
  const r = 60, c = 64;
  let s = `<svg class="vis pie" viewBox="0 0 128 128" role="img" aria-label="${k} af ${n} dele farvet">`;
  if (n === 1) return s + `<circle cx="${c}" cy="${c}" r="${r}" class="${k ? "on" : "off"}"/></svg>`;
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
    const p = a => `${(c + r * Math.cos(a)).toFixed(2)},${(c + r * Math.sin(a)).toFixed(2)}`;
    s += `<path d="M${c},${c} L${p(a0)} A${r},${r} 0 0 1 ${p(a1)} Z" class="${i < k ? "on" : "off"}"/>`;
  }
  return s + "</svg>";
}
function pies(k, n) {
  const wholes = Math.max(1, Math.ceil(k / n));
  let s = '<div class="pies">';
  for (let w = 0; w < wholes; w++) s += pie(Math.max(0, Math.min(n, k - w * n)), n);
  return s + "</div>";
}

// ---------- emner ----------
const TOPICS = [
  { id: "hvad", title: "Hvad er en brøk?", short: "Tæller, nævner og dele af en hel" },
  { id: "forkort", title: "Forlænge og forkorte", short: "Samme størrelse, andre tal" },
  { id: "sammenlign", title: "Sammenligne brøker", short: "Hvilken er størst?" },
  { id: "blandet", title: "Blandede tal", short: "Uægte brøker og hele" },
  { id: "plusminus", title: "Plus og minus", short: "Fællesnævneren" },
  { id: "gange", title: "Gange", short: "Tæller gange tæller" },
  { id: "dividere", title: "Dividere", short: "Behold, vend og gang" },
  { id: "decimal", title: "Decimaltal og procent", short: "3/4 = 0,75 = 75 %" },
  { id: "afettal", title: "Brøkdel af et tal", short: "Hvad er 3/4 af 60?" },
  { id: "tekst", title: "Tekstopgaver", short: "Brøker i hverdagen" },
  { id: "prove", title: "Blandet træning", short: "Alle emner mellem hinanden" },
];
const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));

// ---------- opgaver ----------
// En opgave: {q (tekst med brøker), vis (svg), type frac|number|choice|color, ans, form exact|mixed|improper|plain,
//   simplest, unit, options, hints[], steps[], miss[{v, msg}] (typiske fejl)}
const G = {};

G.hvad = L => {
  if (L === 1) {
    const n = pick([2, 3, 4, 5, 6, 8]), k = ri(1, n - 1);
    return { q: "Hvor stor en brøkdel af figuren er farvet?", vis: Math.random() < 0.5 ? bars(k, n) : pies(k, n), type: "frac", ans: q(k, n),
      hints: ["Tæl, hvor mange lige store dele figuren er delt i. Det tal er nævneren (nederst).", "Tæl de farvede dele. Det tal er tælleren (øverst)."],
      steps: [`Figuren er delt i ${n} lige store dele, så nævneren er ${n}.`, `${k} af delene er farvet, så tælleren er ${k}.`, `Svar: ${k}/${n}`] };
  }
  if (L === 2) {
    const n = pick([4, 5, 6, 8, 10, 12]), k = ri(1, n - 1);
    return { q: `Farv ${k}/${n} af stangen. Tryk på felterne for at farve dem.`, type: "color", n, k, ans: q(k, n),
      hints: [`Nævneren ${n} fortæller, at stangen er delt i ${n} lige store dele.`, `Tælleren ${k} fortæller, hvor mange af dem du skal farve.`],
      steps: [`Stangen er delt i ${n} dele (nævneren).`, `Farv ${k} af delene (tælleren).`] };
  }
  const n = pick([3, 4, 5, 6]), k = ri(n + 1, 2 * n - 1);
  return { q: "Hver stang er én hel. Hvor meget er farvet i alt? Svar som brøk eller blandet tal.", vis: bars(k, n, 2), type: "frac", ans: q(k, n),
    hints: [`Hver stang er delt i ${n} dele, så hver del er 1/${n}.`, "Tæl alle de farvede dele i begge stænger. Det er tælleren."],
    steps: [`Hver del er 1/${n}.`, `Der er ${k} farvede dele i alt, så det er ${k}/${n}.`,
      `Den øverste stang er helt farvet (1 hel), og nederst er der ${k - n} dele, så det er også ${q(k, n).m()}.`] };
};

G.forkort = L => {
  const base = maxD => properFrac(2, maxD);
  if (L === 1) {
    const f = base(9), m = ri(2, 6);
    return { q: `Forlæng ${f.t()} med ${m}.`, type: "frac", form: "exact", ans: q(f.n * m, f.d * m),
      hints: ["At forlænge betyder at gange både tælleren og nævneren med det samme tal.", `Regn ${f.n} · ${m} og ${f.d} · ${m}.`],
      steps: [`Gang tælleren med ${m}: ${f.n} · ${m} = ${f.n * m}`, `Gang nævneren med ${m}: ${f.d} · ${m} = ${f.d * m}`,
        `Svar: ${f.n * m}/${f.d * m}. Den er lige så stor som ${f.t()}, den er bare delt i flere, mindre stykker.`] };
  }
  if (L === 2) {
    const f = base(9), m = ri(2, 8);
    if (Math.random() < 0.6) return { q: `Hvilket tal mangler? ${f.t()} = ?/${f.d * m}`, type: "number", ans: f.n * m,
      hints: [`Hvad er nævneren ${f.d} ganget med for at give ${f.d * m}?`, `Nævneren er ganget med ${m}. Så skal tælleren også ganges med ${m}.`],
      steps: [`${f.d} · ${m} = ${f.d * m}, så brøken er forlænget med ${m}.`, `Tælleren skal også ganges med ${m}: ${f.n} · ${m} = ${f.n * m}`,
        `Svar: ${f.t()} = ${f.n * m}/${f.d * m}`] };
    return { q: `Hvilket tal mangler? ${f.t()} = ${f.n * m}/?`, type: "number", ans: f.d * m,
      hints: [`Hvad er tælleren ${f.n} ganget med for at give ${f.n * m}?`, `Tælleren er ganget med ${m}. Så skal nævneren også ganges med ${m}.`],
      steps: [`${f.n} · ${m} = ${f.n * m}, så brøken er forlænget med ${m}.`, `Nævneren skal også ganges med ${m}: ${f.d} · ${m} = ${f.d * m}`,
        `Svar: ${f.t()} = ${f.n * m}/${f.d * m}`] };
  }
  const f = base(12), m = ri(2, 9);
  return { q: `Forkort ${f.n * m}/${f.d * m} mest muligt.`, type: "frac", form: "plain", simplest: true, ans: f,
    hints: [`Find et tal, der går op i både ${f.n * m} og ${f.d * m}. Prøv fx 2, 3 eller 5.`, `Det største tal, der går op i begge, er ${m}.`],
    steps: [`Det største tal, der går op i både ${f.n * m} og ${f.d * m}, er ${m}.`, `${f.n * m} : ${m} = ${f.n} og ${f.d * m} : ${m} = ${f.d}`,
      `Svar: ${f.t()}. Den kan ikke forkortes mere.`] };
};

function compareSteps(A, B) {
  const c = A.cmp(B), sign = c < 0 ? "<" : c === 0 ? "=" : ">";
  if (A.d === B.d) return [`Nævnerne er ens (${A.d}), så stykkerne er lige store. Sammenlign tællerne: ${A.n} og ${B.n}.`, `Svar: ${A.t()} ${sign} ${B.t()}`];
  if (A.n === B.n) return [`Tællerne er ens. Jo større nævner, jo mindre er hvert stykke (en pizza delt i ${Math.max(A.d, B.d)} stykker giver mindre stykker end en delt i ${Math.min(A.d, B.d)}).`,
    `Svar: ${A.t()} ${sign} ${B.t()}`];
  const L = lcm(A.d, B.d), x = A.n * L / A.d, y = B.n * L / B.d;
  return [`Find en fællesnævner, som begge nævnere går op i: ${L}.`, [[A, x], [B, y]].filter(([F]) => F.d !== L).map(([F, z]) => `${F.t()} = ${z}/${L}`).join(" og "),
    `Sammenlign tællerne: ${x} og ${y}.`, `Svar: ${A.t()} ${sign} ${B.t()}`];
}
G.sammenlign = L => {
  if (L === 3) {
    let fs;
    do { fs = [0, 1, 2].map(() => { const d = pick([2, 3, 4, 5, 6, 8, 10, 12]); return q(coprimeBelow(d), d); }); }
    while (new Set(fs.map(f => f.v())).size < 3 || new Set(fs.map(f => f.d)).size < 3 || fs.reduce((a, f) => lcm(a, f.d), 1) > 60);
    const best = fs.reduce((b, f, i) => f.v() > fs[b].v() ? i : b, 0);
    const Lc = fs.reduce((a, f) => lcm(a, f.d), 1);
    return { q: "Hvilken brøk er størst?", type: "choice", options: fs.map(f => f.t()), ans: best,
      hints: ["Lav dem om, så de har samme nævner, eller lav dem om til decimaltal.", `Alle nævnerne går op i ${Lc}.`],
      steps: [`Fællesnævner: ${Lc}.`, fs.map(f => `${f.t()} = ${f.n * Lc / f.d}/${Lc}`).join(",  "),
        `Den største tæller er ${fs[best].n * Lc / fs[best].d}, så ${fs[best].t()} er størst.`,
        `(Som decimaltal: ${fs.map(f => dk(Math.round(f.v() * 100) / 100)).join(" · ")})`] };
  }
  let A, B;
  if (L === 1) {
    if (Math.random() < 0.5) { const d = ri(3, 12); let a = ri(1, d - 1), b; do b = ri(1, d - 1); while (b === a); A = q(a, d); B = q(b, d); }
    else { const n = ri(1, 4); let d1 = ri(n + 1, 10), d2; do d2 = ri(n + 1, 10); while (d2 === d1); A = q(n, d1); B = q(n, d2); }
  } else {
    A = properFrac(2, 10);
    if (Math.random() < 0.25) { const m = ri(2, 4); B = q(A.n * m, A.d * m); }
    else do B = properFrac(2, 10); while (B.d === A.d || B.eq(A));
    if (Math.random() < 0.5) [A, B] = [B, A];
  }
  const c = A.cmp(B);
  return { q: `Sæt det rigtige tegn: ${A.t()} ☐ ${B.t()}`, type: "choice", options: ["<", "=", ">"], labels: ["mindre end", "lig med", "større end"],
    ans: c < 0 ? 0 : c === 0 ? 1 : 2,
    hints: A.d === B.d ? ["Nævnerne er ens. Så er stykkerne lige store.", "Den med flest stykker (størst tæller) er størst."]
      : A.n === B.n ? ["Tællerne er ens. Hvilken har de største stykker?", "Jo større nævner, jo mindre stykker."]
        : ["Lav dem om, så de har samme nævner.", `Begge nævnere går op i ${lcm(A.d, B.d)}.`],
    steps: compareSteps(A, B) };
};

G.blandet = L => {
  const f = properFrac(2, L === 1 ? 5 : L === 2 ? 8 : 12), d = f.d, r = f.n, w = ri(1, L === 1 ? 3 : L === 2 ? 5 : 9), n = w * d + r;
  if (L === 1 || (L === 3 && Math.random() < 0.5)) return { q: `Skriv ${n}/${d} som et blandet tal.`, type: "frac", form: "mixed", ans: q(n, d),
    hints: [`Hvor mange gange går ${d} op i ${n}? Det er antallet af hele.`, `${w} · ${d} = ${w * d}. Hvor meget er der så tilbage op til ${n}?`],
    steps: [`${n} : ${d} = ${w} med ${r} i rest, fordi ${w} · ${d} = ${w * d} og ${n} − ${w * d} = ${r}.`,
      `Der er ${w} hele, og resten ${r} bliver tælleren over ${d}.`, `Svar: ${w} ${r}/${d}`] };
  return { q: `Skriv ${w} ${r}/${d} som en uægte brøk.`, type: "frac", form: "improper", ans: q(n, d),
    hints: [`Hver hel er ${d}/${d}. Hvor mange dele er ${w} hele?`, `${w} · ${d} = ${w * d}. Læg så tælleren ${r} til.`],
    steps: [`${w} hele er ${w} · ${d} = ${w * d} dele.`, `Læg tælleren til: ${w * d} + ${r} = ${n}`, `Svar: ${n}/${d}`] };
};

function addSteps(A, B, op) {
  const res = op === "+" ? A.add(B) : A.sub(B), steps = [];
  const verb = op === "+" ? "lægger tællerne sammen" : "trækker tællerne fra hinanden";
  const imp = op === "+" ? "Læg tællerne sammen" : "Træk tællerne fra hinanden";
  let n, d;
  if (A.d === B.d) {
    d = A.d; n = op === "+" ? A.n + B.n : A.n - B.n;
    steps.push(`Nævnerne er ens (${d}), så du ${verb} og beholder nævneren.`, `${A.n} ${op} ${B.n} = ${n}, så det giver ${n}/${d}`);
  } else {
    d = lcm(A.d, B.d);
    const x = A.n * d / A.d, y = B.n * d / B.d; n = op === "+" ? x + y : x - y;
    steps.push(`Nævnerne er forskellige (${A.d} og ${B.d}). Find en fællesnævner, som begge går op i: ${d}.`);
    steps.push("Forlæng: " + [[A, x], [B, y]].filter(([F]) => F.d !== d).map(([F, z]) => `${F.t()} = ${z}/${d}`).join(" og "));
    steps.push(`${imp}: ${x} ${op} ${y} = ${n}, så det giver ${n}/${d}`);
  }
  if (n && !q(n, d).simplest()) steps.push(`Forkort: ${n}/${d} = ${res.t()}`);
  if (res.n > res.d && res.d !== 1) steps.push(`Som blandet tal: ${res.m()}`);
  return { res, steps };
}
G.plusminus = L => {
  let A, B, op = Math.random() < 0.55 ? "+" : "−", pre = [], qtxt;
  if (L === 1) {
    const d = ri(3, 12); let a = ri(1, d - 1), b = ri(1, d - 1);
    if (op === "−") { if (a === b) b = a === 1 ? (a = 2, 1) : a - 1; if (a < b) [a, b] = [b, a]; }
    A = q(a, d); B = q(b, d);
  } else if (L === 2) {
    const d1 = ri(2, 6), d2 = d1 * pick([2, 3]);
    A = properFrac(d1, d1); B = q(coprimeBelow(d2), d2);
    if (Math.random() < 0.5) [A, B] = [B, A];
    if (op === "−" && A.cmp(B) <= 0) [A, B] = [B, A];
    if (A.eq(B)) op = "+";
  } else {
    if (Math.random() < 0.35) {
      const f1 = properFrac(2, 6), f2 = properFrac(2, 6), w1 = ri(1, 4), w2 = ri(1, 3);
      A = q(w1 * f1.d + f1.n, f1.d); B = q(w2 * f2.d + f2.n, f2.d);
      if (op === "−" && A.cmp(B) <= 0) { [A, B] = [B, A]; }
      if (A.eq(B)) op = "+";
      qtxt = `Regn ${A.m()} ${op} ${B.m()}. Svar som brøk eller blandet tal.`;
      pre = [`Lav de blandede tal om til uægte brøker: ${A.m()} = ${A.t()} og ${B.m()} = ${B.t()}`];
    } else {
      let d1, d2;
      do { d1 = ri(2, 10); d2 = ri(2, 10); } while (d1 === d2 || d1 % d2 === 0 || d2 % d1 === 0);
      A = q(coprimeBelow(d1), d1); B = q(coprimeBelow(d2), d2);
      if (op === "−" && A.cmp(B) <= 0) [A, B] = [B, A];
    }
  }
  const { res, steps } = addSteps(A, B, op === "+" ? "+" : "−");
  const sameD = A.d === B.d;
  const miss = op === "+" ? [{ v: q(A.n + B.n, A.d + B.d), msg: sameD ? "Det ligner, at du har lagt nævnerne sammen. Når nævnerne er ens, beholder du nævneren og lægger kun tællerne sammen."
    : "Det ligner, at du har lagt nævnerne sammen. Nævnerne må ikke lægges sammen. Find først en fællesnævner, og læg så kun tællerne sammen." }]
    : (A.d !== B.d && A.n - B.n > 0 && A.d !== B.d ? [{ v: q(A.n - B.n, Math.abs(A.d - B.d) || 1), msg: "Det ligner, at du har trukket nævnerne fra hinanden. Find først en fællesnævner, og træk så kun tællerne fra hinanden." }] : []);
  return { q: qtxt || `Regn ${A.t()} ${op} ${B.t()}`, type: "frac", ans: res, miss,
    hints: sameD ? ["Nævnerne er ens. Så skal du kun regne med tællerne.", `Nævneren bliver ${A.d}. Regn ${A.n} ${op} ${B.n}.`]
      : [...(pre.length ? ["Lav først de blandede tal om til uægte brøker."] : []), "Brøkerne skal have samme nævner, før du kan lægge sammen eller trække fra.", `Prøv med ${lcm(A.d, B.d)} som fællesnævner.`],
    steps: pre.concat(steps) };
};

function mulSteps(A, B, pre = []) {
  const n = A.n * B.n, d = A.d * B.d, res = q(n, d).s(), steps = [...pre];
  steps.push(`Gang tæller med tæller: ${A.n} · ${B.n} = ${n}`, `Gang nævner med nævner: ${A.d} · ${B.d} = ${d}`, `Det giver ${n}/${d}`);
  if (!q(n, d).simplest()) steps.push(`Forkort: ${n}/${d} = ${res.t()}`);
  if (res.n > res.d && res.d !== 1) steps.push(`Som blandet tal: ${res.m()}`);
  return { res, steps };
}
G.gange = L => {
  if (L === 1) {
    const k = ri(2, 6), f = properFrac(2, 9), n = k * f.n, res = q(n, f.d).s();
    const steps = [`Når du ganger et helt tal med en brøk, ganger du kun tælleren: ${k} · ${f.n} = ${n}`, `Nævneren bliver ${f.d}, så det giver ${n}/${f.d}`];
    if (!q(n, f.d).simplest()) steps.push(`Forkort: ${n}/${f.d} = ${res.t()}`);
    if (res.n > res.d && res.d !== 1) steps.push(`Som blandet tal: ${res.m()}`);
    return { q: `Regn ${k} · ${f.t()}`, type: "frac", ans: res, steps,
      miss: [{ v: q(k * f.n, k * f.d), msg: `Du har ganget både tæller og nævner med ${k}. Det er at forlænge, og så bliver brøken ikke større. Gang kun tælleren.` }],
      hints: [`${k} · ${f.t()} er ${f.t()} lagt sammen ${k} gange.`, `Gang kun tælleren med ${k}. Nævneren bliver den samme.`] };
  }
  let A, B, pre = [], qtxt;
  if (L === 2) { A = properFrac(2, 9); B = properFrac(2, 9); }
  else if (Math.random() < 0.5) {
    const f = properFrac(2, 5), w = ri(1, 3); A = q(w * f.d + f.n, f.d); B = properFrac(2, 8);
    qtxt = `Regn ${A.m()} · ${B.t()}. Svar som brøk eller blandet tal.`;
    pre = [`Lav det blandede tal om til en uægte brøk: ${A.m()} = ${A.t()}`];
  } else { A = properFrac(3, 12); B = properFrac(3, 12); }
  const { res, steps } = mulSteps(A, B, pre);
  return { q: qtxt || `Regn ${A.t()} · ${B.t()}`, type: "frac", ans: res, steps,
    hints: [...(pre.length ? ["Lav først det blandede tal om til en uægte brøk."] : []), "Når du ganger brøker, behøver du ikke fællesnævner.", "Gang tæller med tæller og nævner med nævner."] };
};

G.dividere = L => {
  if (L === 1) {
    const k = ri(2, 5), f = properFrac(2, 8), d = f.d * k, res = q(f.n, d).s();
    const steps = [`At dele ${f.t()} i ${k} lige store dele gør stykkerne ${k} gange mindre: gang nævneren med ${k}.`, `${f.d} · ${k} = ${d}, så det giver ${f.n}/${d}`];
    if (!q(f.n, d).simplest()) steps.push(`Forkort: ${f.n}/${d} = ${res.t()}`);
    steps.push(`(Det er det samme som ${f.t()} · 1/${k})`);
    return { q: `Regn ${f.t()} : ${k}`, type: "frac", ans: res, steps,
      miss: [{ v: q(f.n * k, f.d), msg: "Du har ganget i stedet for at dividere. Når du deler en brøk med et helt tal, bliver den mindre." }],
      hints: ["Når du deler en brøk med et helt tal, bliver den mindre.", `Gang nævneren med ${k} (eller gang med 1/${k}).`] };
  }
  if (L === 2) {
    const k = ri(2, 6), f = Math.random() < 0.5 ? q(1, ri(2, 8)) : properFrac(3, 8), res = q(k * f.d, f.n).s();
    const steps = ["At dividere med en brøk er det samme som at gange med den omvendte brøk.",
      f.n === 1 ? `Den omvendte brøk af ${f.t()} er ${f.d}/1 = ${f.d}.` : `Den omvendte brøk af ${f.t()} er ${f.d}/${f.n}.`,
      f.n === 1 ? `${k} · ${f.d} = ${k * f.d}` : `${k} · ${f.d}/${f.n} = ${k * f.d}/${f.n}`];
    if (f.n !== 1 && !q(k * f.d, f.n).simplest()) steps.push(`Forkort: ${res.t()}`);
    if (res.n > res.d && res.d !== 1) steps.push(`Som blandet tal: ${res.m()}`);
    if (f.n === 1) steps.push(`Det giver mening: i ${k} hele er der ${k * f.d} stykker på ${f.t()}.`);
    return { q: `Regn ${k} : ${f.t()}`, type: "frac", ans: res, steps,
      miss: [{ v: q(k * f.n, f.d), msg: `Husk at vende brøken: ${k} : ${f.t()} = ${k} · ${f.d}/${f.n}.` }],
      hints: [`Spørg dig selv: hvor mange gange kan ${f.t()} være i ${k}?`, `Vend brøken og gang: ${k} · ${f.d}/${f.n}.`] };
  }
  let A = properFrac(2, 9), B, pre = [], qtxt;
  do B = properFrac(2, 9); while (B.eq(A));
  if (Math.random() < 0.3) { const w = ri(1, 3); A = q(w * A.d + A.n, A.d); qtxt = `Regn ${A.m()} : ${B.t()}. Svar som brøk eller blandet tal.`; pre = [`Lav det blandede tal om til en uægte brøk: ${A.m()} = ${A.t()}`]; }
  const Bi = q(B.d, B.n), { res, steps } = mulSteps(A, Bi, pre.concat(["Behold den første brøk, vend den anden, og gang.", `${A.t()} : ${B.t()} = ${A.t()} · ${Bi.t()}`]));
  return { q: qtxt || `Regn ${A.t()} : ${B.t()}`, type: "frac", ans: res, steps,
    miss: [{ v: A.mul(B), msg: "Du har ganget uden at vende den anden brøk. Ved division skal den anden brøk vendes." },
      { v: q(A.d, A.n).mul(B), msg: "Du har vendt den forkerte brøk. Behold den første, og vend den anden." }],
    hints: [...(pre.length ? ["Lav først det blandede tal om til en uægte brøk."] : []), "Behold, vend, gang: behold den første brøk, vend den anden.", `Regn ${A.t()} · ${Bi.t()}.`] };
};

G.decimal = L => {
  if (L === 1) {
    const [n, d] = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [7, 20], [1, 25], [4, 25], [1, 50], [9, 50]]);
    const p = n * 100 / d;
    return { q: `Hvor mange procent er ${n}/${d}?`, type: "number", unit: "%", ans: p,
      hints: ["Procent betyder hundrededele, altså “ud af 100”.", `Hvad skal ${d} ganges med for at give 100?`],
      steps: [`Forlæng, så nævneren bliver 100: ${d} · ${100 / d} = 100.`, `${n} · ${100 / d} = ${p}, så ${n}/${d} = ${p}/100`, `Svar: ${p} %`] };
  }
  if (L === 2) {
    if (Math.random() < 0.35) {
      const p = pick([10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 5, 15, 35, 45, 65]), f = q(p, 100).s(), g = 100 / f.d;
      return { q: `Skriv ${p} % som en brøk. Forkort mest muligt.`, type: "frac", form: "plain", simplest: true, ans: f,
        hints: ["Procent betyder hundrededele.", `${p} % = ${p}/100. Kan den forkortes?`],
        steps: [`${p} % = ${p}/100`, `Forkort med ${g}: ${f.t()}`] };
    }
    const tenth = Math.random() < 0.4, k = tenth ? pick([2, 4, 5, 6, 8]) : pick([5, 15, 25, 35, 45, 55, 75, 4, 8, 12, 16, 24, 36, 48, 64, 96, 85, 65]);
    const den = tenth ? 10 : 100, f = q(k, den).s(), dec = dk(k / den);
    return { q: `Skriv ${dec} som en brøk. Forkort mest muligt.`, type: "frac", form: "plain", simplest: true, ans: f,
      hints: [tenth ? "Ét ciffer efter kommaet er tiendedele." : "To cifre efter kommaet er hundrededele.", `${dec} = ${k}/${den}. Kan den forkortes?`],
      steps: [`${dec} er ${k} ${tenth ? "tiendedele" : "hundrededele"}: ${k}/${den}`, ...(f.d !== den ? [`Forkort med ${den / f.d}: ${f.t()}`] : [])] };
  }
  const d = pick([2, 4, 5, 8, 10, 20, 25, 40, 50]), n = coprimeBelow(d), P = [10, 100, 1000].find(p => p % d === 0), v = n / d;
  return { q: `Skriv ${n}/${d} som et decimaltal.`, type: "number", ans: v,
    hints: ["En brøk er en division: tælleren divideret med nævneren.", `Regn ${n} : ${d}, eller forlæng, så nævneren bliver ${P}.`],
    steps: [...(d !== P ? [`Forlæng, så nævneren bliver ${P}: ${n}/${d} = ${n * P / d}/${P}`] : []),
      `${n * P / d}/${P} = ${dk(v)} (${P === 10 ? "tiendedele: ét ciffer" : P === 100 ? "hundrededele: to cifre" : "tusindedele: tre cifre"} efter kommaet)`, `(Eller regn ${n} : ${d} = ${dk(v)})`] };
};

G.afettal = L => {
  if (L === 1) {
    const d = ri(2, 10), m = ri(2, 12), N = d * m;
    return { q: `Hvad er 1/${d} af ${N}?`, type: "number", ans: m,
      hints: [`1/${d} af ${N} betyder: del ${N} i ${d} lige store dele.`, `Regn ${N} : ${d}.`],
      steps: [`Del ${N} i ${d} lige store dele: ${N} : ${d} = ${m}`, `Svar: ${m}`] };
  }
  if (L === 2) {
    const d = ri(3, 10), a = coprimeBelow(d), m = ri(2, 12), N = d * m;
    return { q: `Hvad er ${a}/${d} af ${N}?`, vis: bars(a, d), type: "number", ans: a * m,
      hints: [`Find først 1/${d} af ${N}.`, `1/${d} af ${N} er ${m}. Hvor meget er ${a} af de dele?`],
      steps: [`Find 1/${d}: ${N} : ${d} = ${m}`, `${a}/${d} er ${a} af de dele: ${m} · ${a} = ${a * m}`, `Svar: ${a * m}`],
      missNum: a > 1 ? [{ v: m, msg: `Det er 1/${d} af ${N}. Du skal bruge ${a} af de dele.` }] : [] };
  }
  const d = ri(3, 10), a = coprimeBelow(d), m = ri(2, 12);
  if (a > 1 && Math.random() < 0.5) {
    const N = a * m;
    return { q: `${N} er ${a}/${d} af et tal. Hvilket tal?`, type: "number", ans: d * m,
      hints: [`${a}/${d} er ${a} dele. Hvor meget er én del (1/${d})?`, `Én del er ${N} : ${a} = ${m}. Hele tallet er ${d} dele.`],
      steps: [`${a}/${d} af tallet er ${N}, så 1/${d} af tallet er ${N} : ${a} = ${m}.`, `Hele tallet er ${d}/${d}: ${m} · ${d} = ${d * m}`, `Svar: ${d * m}`] };
  }
  return { q: `Hvor stor en brøkdel er ${a * m} af ${d * m}? Forkort mest muligt.`, type: "frac", form: "plain", simplest: true, ans: q(a, d),
    hints: [`Skriv det som en brøk: ${a * m}/${d * m}.`, `Forkort. Både ${a * m} og ${d * m} kan deles med ${m}.`],
    steps: [`Som brøk: ${a * m}/${d * m}`, `Forkort med ${m}: ${a}/${d}`] };
};

const TEKST = {
  1: [
    () => { const n = pick([6, 8, 10, 12]), k = ri(1, n - 1), a = q(k, n);
      return { q: `En pizza er skåret i ${n} lige store stykker. Du spiser ${k} stykker. Hvor stor en brøkdel af pizzaen har du spist?`, vis: pies(k, n), type: "frac", ans: a,
        hints: ["Nævneren er, hvor mange stykker pizzaen er skåret i.", "Tælleren er, hvor mange stykker du har spist."],
        steps: [`Pizzaen er skåret i ${n} stykker, så nævneren er ${n}.`, `Du har spist ${k}, så det er ${k}/${n}.`, ...(a.simplest() ? [] : [`Forkortet: ${a.s().t()}`])] }; },
    () => { const b = pick([2, 3, 4, 5, 6, 10, 12]), a = coprimeBelow(b), min = 60 * a / b;
      return { q: `Hvor mange minutter er ${a}/${b} time?`, type: "number", unit: "min", ans: min,
        hints: ["En time er 60 minutter.", `Find først 1/${b} time: 60 : ${b}.`],
        steps: [`1/${b} time = 60 : ${b} = ${60 / b} minutter.`, ...(a > 1 ? [`${a}/${b} time = ${60 / b} · ${a} = ${min} minutter.`] : [])] }; },
    () => { const d = pick([2, 3, 4, 5, 10]), N = d * ri(2, 12) * 5;
      return { q: `Du har ${N} kr. og bruger 1/${d} af pengene på en biografbillet. Hvad koster billetten?`, type: "number", unit: "kr.", ans: N / d,
        hints: [`1/${d} af ${N} betyder: del ${N} i ${d} lige store dele.`, `Regn ${N} : ${d}.`],
        steps: [`1/${d} af ${N} kr. = ${N} : ${d} = ${N / d} kr.`] }; },
  ],
  2: [
    () => { const b = pick([3, 4, 5, 7]), a = coprimeBelow(b), m = ri(Math.ceil(18 / b), Math.floor(30 / b)), N = b * m, girls = a * m;
      return { q: `I en klasse er der ${N} elever. ${a}/${b} af eleverne er piger. Hvor mange drenge er der i klassen?`, type: "number", ans: N - girls,
        hints: ["Find først, hvor mange piger der er.", `1/${b} af ${N} er ${N} : ${b} = ${m}.`],
        steps: [`1/${b} af ${N} = ${N} : ${b} = ${m}`, `Piger: ${m} · ${a} = ${girls}`, `Drenge: ${N} − ${girls} = ${N - girls}`],
        missNum: [{ v: girls, msg: "Det er antallet af piger. Spørgsmålet er, hvor mange drenge der er." }] }; },
    () => { const [a, b] = pick([[1, 2], [3, 4], [2, 3], [1, 4], [3, 8], [2, 5]]), p = pick([2, 4]), f = pick([2, 3]), res = q(a * f, b).s();
      return { q: `En opskrift til ${p} personer bruger ${a}/${b} liter mælk. Hvor meget mælk skal du bruge til ${p * f} personer? Svar i liter som brøk eller blandet tal.`, type: "frac", ans: res,
        hints: [`Hvor mange gange flere personer er ${p * f} end ${p}?`, `Gang ${a}/${b} med ${f}.`],
        steps: [`${p * f} personer er ${f} gange så mange som ${p}.`, `${f} · ${a}/${b} = ${a * f}/${b}`, ...(q(a * f, b).simplest() ? [] : [`Forkort: ${res.t()}`]),
          ...(res.n > res.d && res.d !== 1 ? [`Som blandet tal: ${res.m()} liter`] : [])] }; },
    () => { let A, B; do { const [d1, d2] = shuffle(pick([[4, 8], [3, 6], [2, 8], [2, 6], [4, 12], [3, 12], [2, 4]])); A = q(coprimeBelow(d1), d1); B = q(coprimeBelow(d2), d2); } while (A.add(B).v() > 1);
      const { res, steps } = addSteps(A, B, "+");
      return { q: `Du spiser ${A.t()} af en pizza, og din ven spiser ${B.t()}. Hvor stor en del af pizzaen har I spist tilsammen?`, type: "frac", ans: res, steps,
        miss: [{ v: q(A.n + B.n, A.d + B.d), msg: "Det ligner, at du har lagt nævnerne sammen. Find en fællesnævner først, og læg kun tællerne sammen." }],
        hints: ["“Tilsammen” betyder plus.", `Find en fællesnævner. Begge nævnere går op i ${lcm(A.d, B.d)}.`] }; },
    () => { const [a, b] = pick([[1, 2], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5], [7, 10], [9, 10], [3, 20], [17, 20], [13, 25], [1, 5]]), p = a * 100 / b;
      return { q: `Din telefons batteri er ${a}/${b} opladet. Hvor mange procent er det?`, type: "number", unit: "%", ans: p,
        hints: ["Procent betyder hundrededele.", `Forlæng ${a}/${b}, så nævneren bliver 100.`],
        steps: [`${a}/${b} = ${p}/100 (gang med ${100 / b})`, `Svar: ${p} %`] }; },
  ],
  3: [
    () => { const b = pick([3, 4, 5, 6, 8]), a = coprimeBelow(b), K = b * ri(1, 3), done = a * K / b, left = K - done;
      return { q: `Turen til skolen er ${K} km. Du har cyklet ${a}/${b} af vejen. Hvor mange km mangler du?`, type: "number", unit: "km", ans: left,
        hints: [`Find først 1/${b} af ${K} km.`, `Find, hvor langt du har cyklet, og træk det fra ${K}.`],
        steps: [`1/${b} af ${K} km = ${K} : ${b} = ${K / b} km`, `Du har cyklet ${K / b} · ${a} = ${done} km.`, `Der mangler ${K} − ${done} = ${left} km.`],
        missNum: [{ v: done, msg: "Det er, hvor langt du HAR cyklet. Hvor langt mangler du?" }] }; },
    () => { const b = pick([3, 4, 5, 8, 10]), a = coprimeBelow(b), u = ri(2, 9) * 10, P = b * u, saved = a * u;
      return { q: `Du vil købe et spil til ${P} kr. Du har sparet ${a}/${b} af prisen sammen. Hvor mange kr. mangler du?`, type: "number", unit: "kr.", ans: P - saved,
        hints: [`Find 1/${b} af ${P} kr.`, `Du mangler ${b - a}/${b} af prisen.`],
        steps: [`1/${b} af ${P} kr. = ${P} : ${b} = ${u} kr.`, `Du har sparet ${u} · ${a} = ${saved} kr.`, `Du mangler ${P} − ${saved} = ${P - saved} kr.`],
        missNum: [{ v: saved, msg: "Det er, hvad du HAR sparet. Hvor meget mangler du?" }] }; },
    () => { const d = pick([4, 5, 8, 10]), k = ri(3, 12), T = q(k, d).s();
      return { q: `Du har ${T.m()} liter saft. Hvert glas rummer 1/${d} liter. Hvor mange glas kan du fylde?`, type: "number", unit: "glas", ans: k,
        hints: [`Hvor mange gange kan 1/${d} liter være i ${T.m()} liter? Det er en division.`, `At dividere med 1/${d} er det samme som at gange med ${d}.`],
        steps: [`Det er en division: ${T.m()} : 1/${d}`, `At dividere med 1/${d} er det samme som at gange med ${d}.`, `${T.t()} · ${d} = ${k} glas`] }; },
    () => { const f = properFrac(3, 8), m = ri(2, 8);
      return { q: `Du har klaret ${f.n * m} af ${f.d * m} baner i et spil. Hvor stor en brøkdel af banerne har du klaret? Forkort mest muligt.`, type: "frac", form: "plain", simplest: true, ans: f,
        hints: [`Som brøk: klarede baner over alle baner.`, `${f.n * m}/${f.d * m}. Forkort med ${m}.`],
        steps: [`Som brøk: ${f.n * m}/${f.d * m}`, `Forkort med ${m}: ${f.t()}`] }; },
    () => { const [a, b] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]]), u = ri(3, 12) * 10, total = b * u, X = a * u;
      return { q: `Du har brugt ${a}/${b} af dine lommepenge på en hættetrøje til ${X} kr. Hvor mange lommepenge havde du?`, type: "number", unit: "kr.", ans: total,
        hints: [`${a}/${b} af pengene er ${X} kr. Hvad er så 1/${b}?`, `1/${b} er ${X} : ${a} = ${u} kr. Alle pengene er ${b}/${b}.`],
        steps: [`${a}/${b} af pengene er ${X} kr., så 1/${b} er ${X} : ${a} = ${u} kr.`, `Alle pengene er ${b}/${b}: ${u} · ${b} = ${total} kr.`] }; },
  ],
};
G.tekst = L => pick(TEKST[L])();

function makeExercise(topic, level) {
  let real = topic;
  if (topic === "prove") real = pick(TOPICS.filter(t => t.id !== "prove")).id;
  const L = topic === "prove" ? levelOf(real) : level;
  const ex = { miss: [], missNum: [], hints: [], ...G[real](L), topic: real, shownTopic: topic, level: L };
  if (ex.type === "frac") ex.miss = ex.miss.filter(m => !m.v.eq(ex.ans));     // en "typisk fejl" må aldrig være det rigtige svar
  if (ex.type === "number") ex.missNum = ex.missNum.filter(m => Math.abs(m.v - ex.ans) > 1e-9);
  return ex;
}

// ---------- tilstand ----------
const state = { me: { name: store.get("name", "") }, progress: store.get("progress", { topics: {}, days: {} }) };
state.progress.topics ||= {}; state.progress.days ||= {};
// Fremskridt gemmes kun i browseren (ingen login). Samme regler som før: op efter 4 rigtige i træk, ned efter 3 forkerte.
function localRecord(topic, level, correct) {
  const P = state.progress;
  const t = (P.topics[topic] ||= { level: 1, streak: 0, right: 0, total: 0, wrong_run: 0, mastered: false });
  let msg = null;
  t.total++;
  if (correct) {
    t.right++; t.streak++; t.wrong_run = 0;
    if (level >= t.level && t.streak >= 4) {
      if (t.level < 3) { t.level++; msg = `Niveau ${t.level}! Opgaverne bliver lidt sværere nu.`; }
      else if (!t.mastered) { t.mastered = true; msg = "Du har mestret emnet! ⭐"; }
      t.streak = 0;
    }
  } else {
    t.streak = 0; t.wrong_run++;
    if (t.wrong_run >= 3 && t.level > 1) { t.level--; t.wrong_run = 0; msg = `Vi tager lige et par lettere opgaver (niveau ${t.level}).`; }
  }
  const d = (P.days[today()] ||= { opgaver: 0, rigtige: 0 }); d.opgaver++; d.rigtige += correct ? 1 : 0;
  P.days = Object.fromEntries(Object.entries(P.days).sort().slice(-120));
  store.set("progress", P);
  return msg;
}
const levelOf = t => (state.progress.topics[t] || {}).level || 1;
const api = async (path, body) => {
  const r = await fetch(path, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", "X-Brok": "1" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || "Fejl " + r.status), { status: r.status, data: j });
  return j;
};
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10); setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3200);
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function streak() {
  const days = state.progress.days || {}; let n = 0; const d = new Date();
  if (!(days[today()] || {}).opgaver) d.setDate(d.getDate() - 1);
  for (;;) { const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!(days[k] || {}).opgaver) break; n++; d.setDate(d.getDate() - 1); }
  return n;
}
const stars = t => { const p = state.progress.topics[t] || {}; return p.mastered ? 3 : Math.max(0, (p.level || 1) - 1); };

// ---------- visninger ----------
const view = () => $("#view");
const NAV = [["#/", "Hjem", "home"], ["#/spoerg", "Spørg", "chat"], ["#/vaerksted", "Værksted", "tool"], ["#/huskeark", "Huskeark", "note"]];
const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  tool: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8h8"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h4"/>',
};
function renderNav() {
  const items = HAS_LLM ? NAV : NAV.filter(([h]) => h !== "#/spoerg");
  const here = location.hash || "#/";
  $("#nav").innerHTML = items.map(([h, t, i]) => `<a href="${h}" class="${(here === h || (h !== "#/" && here.startsWith(h))) ? "on" : ""}">` +
    `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[i]}</svg><span>${t}</span></a>`).join("");
}

function route() {
  if (!state.me) return;
  const [, a, b] = (location.hash || "#/").split("/");
  renderNav();
  window.scrollTo(0, 0);
  if (a === "laer" && TOPIC[b]) return showLesson(b);
  if (a === "oev" && TOPIC[b]) return showPractice(b);
  if (a === "spoerg" && HAS_LLM) return showChat();
  if (a === "vaerksted") return showWorkshop();
  if (a === "huskeark") return showSheet();
  showHome();
}

function showHome() {
  const d = (state.progress.days || {})[today()] || { opgaver: 0, rigtige: 0 }, goal = 10, s = streak();
  const last = store.get("last", null);
  const done = d.opgaver >= goal;
  view().innerHTML = `
    <section class="hero">
      <div class="hero-top">
        <div><p class="eyebrow">${done ? "Dagens mål er nået 🎉" : `Dagens mål: ${goal} opgaver`}</p>
          <h1>Hej${state.me.name ? " " + esc(state.me.name) : ""}!</h1></div>
        <div class="ring" style="--p:${Math.min(100, Math.round(d.opgaver / goal * 100))}" role="img" aria-label="${d.opgaver} af ${goal} opgaver i dag">
          <span><b>${d.opgaver}</b><small>af ${goal}</small></span></div>
      </div>
      <div class="pills"><span class="pill">✓ <b>${d.rigtige}</b> rigtige i dag</span><span class="pill">🔥 <b>${s}</b> ${s === 1 ? "dag" : "dage"} i træk</span></div>
      ${state.me.name ? "" : `<form class="namef" id="nf"><label for="nn">Hvad hedder du? <span class="muted small">(kun fornavn, gemmes kun her)</span></label>
        <input id="nn" maxlength="30" autocomplete="given-name" placeholder="Fornavn"><button class="btn small primary">Gem</button></form>`}
      ${last && TOPIC[last] ? `<a class="btn primary wide" href="#/oev/${last}">Fortsæt: ${esc(TOPIC[last].title)} →</a>` : `<a class="btn primary wide" href="#/laer/hvad">Start med det første emne →</a>`}
    </section>
    <div id="inst"></div>
    <h2>Emner</h2>
    <div class="tlist">${TOPICS.map((t, i) => `
      <div class="trow${t.id !== "prove" && stars(t.id) === 3 ? " done" : ""}">
        <a class="tmain" href="#/${LESSONS[t.id] ? "laer" : "oev"}/${t.id}">
          <span class="tnum">${t.id === "prove" ? "★" : i + 1}</span>
          <span class="tbody"><b>${esc(t.title)}</b><span class="muted small">${fmtLine(t.short)}</span>
            ${t.id === "prove" ? "" : `<span class="lvl" title="Niveau ${levelOf(t.id)}" aria-label="Niveau ${levelOf(t.id)}">${[0, 1, 2].map(k => `<i class="${k < stars(t.id) ? "on" : ""}"></i>`).join("")}</span>`}</span>
        </a>
        <a class="tgo" href="#/oev/${t.id}" aria-label="Øv ${esc(t.title.toLowerCase())}">Øv</a>
      </div>`).join("")}</div>
    <p class="small muted foot">Dine niveauer og dagens opgaver gemmes kun på denne enhed.${state.me.name ? ` Du hedder ${esc(state.me.name)} her. <button class="linkbtn" id="rename">Skift navn</button>` : ""}</p>`;
  renderInstall();
  const nf = $("#nf");
  if (nf) nf.onsubmit = e => { e.preventDefault(); state.me.name = $("#nn").value.trim().slice(0, 30); store.set("name", state.me.name); showHome(); };
  const rn = $("#rename");
  if (rn) rn.onclick = () => { state.me.name = ""; store.set("name", ""); showHome(); };
}

// ---------- forklaringer ----------
const P = t => `<p>${fmtLine(t)}</p>`;
const BOX = (t, cls = "tip") => `<div class="box ${cls}">${fmt(t)}</div>`;
const EX = (title, lines) => `<div class="example"><b>${esc(title)}</b>${lines.map(l => `<div>${fmtLine(l)}</div>`).join("")}</div>`;
const FIG = (...f) => `<div class="figs">${f.join("")}</div>`;
const LESSONS = {
  hvad: () => [
    ["En brøk er en del af noget hele", P("En brøk som 3/4 fortæller, hvor stor en del man har af noget, der er delt i **lige store** dele.") +
      FIG(bars(3, 4), pies(3, 4)) +
      P("**Nævneren** (tallet nederst) fortæller, hvor mange lige store dele det hele er delt i. Her 4.") +
      P("**Tælleren** (tallet øverst) tæller, hvor mange af delene man har. Her 3.") +
      BOX("Huskeregel: Nævneren **nævner**, hvilken slags dele det er (fjerdedele). Tælleren **tæller**, hvor mange der er.")],
    ["En brøk er en division", P("Brøkstregen betyder “divideret med”. 3/4 er det samme som 3 : 4 = 0,75.") +
      P("Derfor er 4/4 = 1 hel, og 8/4 = 2 hele.")],
    ["Brøker større end 1", P("Har man flere dele, end der er i én hel, er tælleren større end nævneren. 5/4 er 4 fjerdedele (1 hel) plus 1 fjerdedel.") +
      FIG(bars(5, 4, 2)) + P("Det kan også skrives som det blandede tal 1 1/4.")],
    ["Prøv selv", P("Åbn **Værkstedet** og skub på tæller og nævner. Se, hvad der sker med stangen og cirklen.") + `<a class="btn" href="#/vaerksted">Åbn værkstedet</a>`],
  ],
  forkort: () => [
    ["Samme størrelse, forskellige tal", P("1/2, 2/4 og 4/8 er præcis lige store. Stykkerne er bare skåret mindre.") +
      FIG(bars(1, 2), bars(2, 4), bars(4, 8))],
    ["Forlænge: gang oppe og nede", P("Man forlænger ved at gange tælleren **og** nævneren med det samme tal.") +
      EX("Eksempel: forlæng 2/3 med 4", ["2 · 4 = 8 og 3 · 4 = 12", "2/3 = 8/12"]) +
      P("Det bruger man fx, når to brøker skal have samme nævner.")],
    ["Forkorte: divider oppe og nede", P("Man forkorter ved at dividere tælleren **og** nævneren med det samme tal. Så bliver tallene mindre og nemmere at regne med.") +
      EX("Eksempel: forkort 18/24", ["Både 18 og 24 kan deles med 6.", "18 : 6 = 3 og 24 : 6 = 4", "18/24 = 3/4"]) +
      BOX("Tip: Kan du ikke se det største tal med det samme, så forkort i små trin: først med 2, så med 3 osv. 18/24 = 9/12 = 3/4.")],
    ["Pas på", BOX("Du må **aldrig** lægge det samme tal til eller trække det fra i tæller og nævner. 2/3 er ikke det samme som 3/4. Kun gange og dividere.", "warn")],
  ],
  sammenlign: () => [
    ["Samme nævner", P("Er nævnerne ens, er stykkerne lige store. Så vinder den med flest stykker: 5/7 > 3/7.") + FIG(bars(5, 7), bars(3, 7))],
    ["Samme tæller", P("Er tællerne ens, vinder den med de **største** stykker, altså den **mindste** nævner. 1/3 > 1/5: en pizza delt i 3 giver større stykker end en delt i 5.") + FIG(pies(1, 3), pies(1, 5))],
    ["Forskellige nævnere", P("Lav brøkerne om, så de har samme nævner, og sammenlign så tællerne.") +
      EX("Eksempel: 2/3 eller 3/4?", ["Fællesnævner 12: 2/3 = 8/12 og 3/4 = 9/12", "9 > 8, så 3/4 > 2/3"]) +
      BOX("Du kan også lave dem om til decimaltal: 2/3 ≈ 0,67 og 3/4 = 0,75.")],
    ["Tegnene", P("< betyder “mindre end”, > betyder “større end”. Den åbne side vender altid mod det største tal.")],
  ],
  blandet: () => [
    ["Uægte brøker og blandede tal", P("En **uægte brøk** har en tæller, der er større end (eller lig med) nævneren, fx 7/4.") +
      P("Et **blandet tal** skriver de hele for sig: 7/4 = 1 3/4 (1 hel og 3 fjerdedele).") + FIG(bars(7, 4, 2))],
    ["Fra uægte brøk til blandet tal", P("Divider tælleren med nævneren. Antal gange er de hele, resten er den nye tæller.") +
      EX("Eksempel: 11/4", ["11 : 4 = 2 med 3 i rest", "11/4 = 2 3/4"])],
    ["Fra blandet tal til uægte brøk", P("Gang de hele med nævneren, og læg tælleren til.") +
      EX("Eksempel: 2 1/3", ["2 hele = 2 · 3 = 6 tredjedele", "6 + 1 = 7", "2 1/3 = 7/3"]) +
      BOX("Når du skal gange eller dividere med blandede tal, så lav dem altid om til uægte brøker først.")],
  ],
  plusminus: () => [
    ["Samme nævner: regn kun med tællerne", P("Er nævnerne ens, lægger du tællerne sammen og **beholder** nævneren. Stykkerne er jo samme slags.") +
      EX("Eksempel", ["2/7 + 3/7 = 5/7", "6/9 − 2/9 = 4/9"]) + FIG(bars(2, 7), bars(5, 7))],
    ["Forskellige nævnere: find en fællesnævner", P("Man kan ikke lægge tredjedele og fjerdedele sammen direkte. Lav dem først om til samme slags stykker.") +
      EX("Eksempel: 1/2 + 1/3", ["Fællesnævner: 6 (både 2 og 3 går op i 6)", "1/2 = 3/6 og 1/3 = 2/6", "3/6 + 2/6 = 5/6"]) +
      BOX("Sådan finder du en fællesnævner: Gå op i den største nævners tabel, til du rammer et tal, den anden nævner også går op i. Eller gang de to nævnere med hinanden.")],
    ["Minus på samme måde", EX("Eksempel: 3/4 − 1/6", ["Fællesnævner: 12", "3/4 = 9/12 og 1/6 = 2/12", "9/12 − 2/12 = 7/12"])],
    ["Den typiske fejl", BOX("1/2 + 1/3 er **ikke** 2/5. Læg aldrig nævnerne sammen. (Tænk: en halv pizza plus en tredjedel er mere end en halv, men 2/5 er mindre end en halv.)", "warn") +
      BOX("Forkort svaret til sidst, hvis du kan. 2/6 + 1/6 = 3/6 = 1/2.")],
    ["Blandede tal", P("Lav dem om til uægte brøker, regn, og lav evt. svaret om til et blandet tal igen.") +
      EX("Eksempel: 1 1/2 + 2 1/4", ["1 1/2 = 3/2 = 6/4 og 2 1/4 = 9/4", "6/4 + 9/4 = 15/4 = 3 3/4"])],
  ],
  gange: () => [
    ["Helt tal gange brøk", P("Gang kun tælleren. 3 · 2/5 betyder 2/5 + 2/5 + 2/5.") + EX("Eksempel", ["3 · 2/5 = 6/5 = 1 1/5"]) + FIG(bars(6, 5, 2))],
    ["Brøk gange brøk", P("Gang tæller med tæller og nævner med nævner. Her skal du **ikke** finde en fællesnævner.") +
      EX("Eksempel: 2/3 · 3/4", ["2 · 3 = 6 og 3 · 4 = 12", "6/12 = 1/2"]) +
      BOX("“Af” betyder gange: 2/3 af 3/4 er 2/3 · 3/4.")],
    ["Forkort før du ganger", P("Går et tal i en tæller og et tal i en nævner op i det samme, kan du forkorte på kryds først. Så bliver tallene mindre.") +
      EX("Eksempel: 4/9 · 3/8", ["4 og 8 kan deles med 4: 1 og 2", "3 og 9 kan deles med 3: 1 og 3", "1/3 · 1/2 = 1/6"])],
    ["Blandede tal", P("Lav dem om til uægte brøker først.") + EX("Eksempel: 1 1/2 · 2/3", ["1 1/2 = 3/2", "3/2 · 2/3 = 6/6 = 1"])],
  ],
  dividere: () => [
    ["Brøk divideret med et helt tal", P("Deler du en brøk i flere dele, bliver hver del mindre. Gang nævneren med tallet.") +
      EX("Eksempel: 3/4 : 3", ["3/4 : 3 = 3/12 = 1/4"]) + P("Det giver mening: tre fjerdedele delt mellem 3 personer giver en fjerdedel hver.")],
    ["Divideret med en brøk: behold, vend, gang", P("At dividere med en brøk er det samme som at gange med den omvendte brøk (tæller og nævner bytter plads).") +
      EX("Eksempel: 2/3 : 4/5", ["Behold 2/3, vend 4/5 til 5/4, og gang", "2/3 · 5/4 = 10/12 = 5/6"])],
    ["Hvorfor virker det?", P("2 : 1/3 spørger: **hvor mange tredjedele er der i 2 hele?** Hver hel har 3 tredjedele, så i 2 hele er der 6. Og 2 · 3/1 = 6.") + FIG(bars(6, 3, 2)) +
      BOX("Dividerer du med en brøk mindre end 1, bliver resultatet **større**. Det er helt normalt.")],
  ],
  decimal: () => [
    ["Brøk til decimaltal", P("Divider tælleren med nævneren: 3/8 = 3 : 8 = 0,375.") +
      P("Eller forlæng, så nævneren bliver 10, 100 eller 1000: 3/5 = 6/10 = 0,6.")],
    ["Decimaltal til brøk", P("Ét ciffer efter kommaet er tiendedele, to cifre er hundrededele.") + EX("Eksempel: 0,35", ["0,35 = 35/100", "Forkort med 5: 7/20"])],
    ["Procent er hundrededele", P("Procent betyder “ud af 100”. 3/4 = 75/100 = 75 %.") +
      `<table class="tbl"><tr><th>Brøk</th><th>Decimaltal</th><th>Procent</th></tr>${[[1, 2], [1, 4], [3, 4], [1, 5], [1, 10], [1, 3], [2, 3], [1, 8]].map(([n, d]) =>
        `<tr><td>${fracHTML(n, d)}</td><td>${d === 3 ? "≈ " + dk(Math.round(n / d * 1000) / 1000) : dk(n / d)}</td><td>${d === 3 ? "≈ " + dk(Math.round(n / d * 1000) / 10) : dk(n / d * 100)} %</td></tr>`).join("")}</table>` +
      BOX("Lær de første fem udenad. Så kan du regne mange af de andre ud fra dem.")],
  ],
  afettal: () => [
    ["Del, og gang så", P("For at finde 3/4 af 60: del først med nævneren (find én fjerdedel), og gang så med tælleren.") +
      EX("Eksempel: 3/4 af 60", ["1/4 af 60 = 60 : 4 = 15", "3/4 af 60 = 15 · 3 = 45"]) + FIG(bars(3, 4))],
    ["“Af” betyder gange", P("3/4 af 60 er det samme som 3/4 · 60. Begge veje giver 45.")],
    ["Baglæns", P("Hvis 12 er 3/4 af et tal, så er 1/4 af tallet 12 : 3 = 4. Hele tallet er 4/4: 4 · 4 = 16.")],
  ],
  tekst: () => [
    ["Sådan løser du en tekstopgave", `<ol class="steps"><li>Læs opgaven langsomt, og find tallene.</li><li>Hvad bliver der spurgt om? Skriv det ned.</li>
      <li>Find regnearten: “af” = gange, “tilsammen” = plus, “tilbage”, “mangler” eller “forskel” = minus, “hvor mange gange” eller “fordel” = dividere.</li>
      <li>Regn, gerne trin for trin.</li><li>Tjek: giver svaret mening? Og svarer du på det, der blev spurgt om?</li></ol>`],
    ["Eksempel", EX("Turen til skolen er 6 km. Du har cyklet 2/3 af vejen. Hvor langt mangler du?", ["1/3 af 6 km = 6 : 3 = 2 km", "Du har cyklet 2 · 2 = 4 km", "Der mangler 6 − 4 = 2 km"]) +
      BOX("Pas på: Mange svarer på, hvor langt man HAR cyklet. Læs spørgsmålet igen til sidst.", "warn")],
  ],
};

function showLesson(id) {
  const t = TOPIC[id], idx = TOPICS.findIndex(x => x.id === id), next = TOPICS[idx + 1];
  view().innerHTML = `<a class="back" href="#/">← Emner</a><h1>${esc(t.title)}</h1>
    ${LESSONS[id]().map(([h, body]) => `<section class="card lesson"><h3>${fmtLine(h)}</h3>${body}</section>`).join("")}
    <div class="row sticky-cta"><a class="btn primary" href="#/oev/${id}">Øv ${esc(t.title.toLowerCase())}</a>
      ${HAS_LLM ? `<a class="btn" href="#/spoerg" data-ask="${esc(t.title)}">Spørg om emnet</a>` : ""}
      ${next && LESSONS[next.id] ? `<a class="btn ghost" href="#/laer/${next.id}">Næste emne →</a>` : ""}</div>`;
  if (HAS_LLM) $("[data-ask]").onclick = () => { chat.ctx = ""; chat.ctxLabel = ""; chat.draft = `Kan du forklare ${t.title.toLowerCase().replace("?", "")} på en anden måde?`; };
}

// ---------- øvelser ----------
let cur = null;
function answerText(ex) {
  if (ex.type === "frac" && ex.form === "mixed") return ex.ans.m();
  if (ex.type === "frac") return ex.form === "exact" ? ex.ans.t() : ex.ans.s().t() + (ex.ans.s().n > ex.ans.s().d && ex.ans.s().d > 1 ? ` (= ${ex.ans.m()})` : "");
  if (ex.type === "number") return dk(ex.ans) + (ex.unit ? " " + ex.unit : "");
  if (ex.type === "choice") return ex.options[ex.ans];
  return `${ex.k} af ${ex.n} felter farvet`;
}
function showPractice(topic, keepLevel) {
  store.set("last", topic);
  const level = topic === "prove" ? null : (keepLevel || levelOf(topic));
  const ex = makeExercise(topic, level);
  cur = { ex, wrong: 0, hints: 0, solved: false, shown: false, recorded: false, lastAns: "", chosenLevel: keepLevel || null };
  const t = TOPIC[topic];
  view().innerHTML = `<a class="back" href="#/">← Emner</a>
    <div class="ph"><h1>${esc(t.title)}</h1>
      ${topic === "prove" ? `<span class="chip">${esc(TOPIC[ex.topic].title)} · niveau ${ex.level}</span>` :
      `<div class="levels" role="group" aria-label="Niveau">${[1, 2, 3].map(l => `<button class="${l === ex.level ? "on" : ""}" data-l="${l}">Niveau ${l}</button>`).join("")}</div>`}</div>
    <section class="card ex">
      <div class="qtext">${fmt(ex.q)}</div>
      ${ex.vis || ""}${ex.type === "color" ? bars(0, ex.n, 1, "paint") + `<div class="small muted" id="paintc">0 farvet</div>` : ""}
      <form id="af" autocomplete="off">${answerUI(ex)}
        <div class="row"><button class="btn primary" id="check">Tjek</button><button type="button" class="btn" id="hint">Hint</button>
          <button type="button" class="btn ghost" id="sol">Vis løsning</button></div></form>
      <div id="fb" aria-live="polite"></div>
      <div id="hints"></div><div id="steps"></div>
      <div class="row after">${HAS_LLM ? `<button class="btn" id="ask">Spørg Brøkhjælperen om opgaven</button>` : "<span></span>"}
        <button class="btn primary" id="next" hidden>Næste opgave →</button></div>
    </section>
    ${LESSONS[ex.topic] ? `<p class="small muted center">Kører det ikke? <a href="#/laer/${ex.topic}">Læs forklaringen</a> igen.</p>` : ""}`;
  $$(".levels button").forEach(b => b.onclick = () => showPractice(topic, +b.dataset.l));
  if (ex.type === "color") $$(".paint rect").forEach(r => r.onclick = () => { r.classList.toggle("on"); r.classList.toggle("off"); $("#paintc").textContent = `${$$(".paint rect.on").length} farvet`; });
  if (ex.type === "choice") $$(".choice button").forEach(b => b.onclick = e => { e.preventDefault(); $$(".choice button").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); });
  $("#af").onsubmit = e => { e.preventDefault(); doCheck(); };
  $("#hint").onclick = showHint;
  $("#sol").onclick = showSolution;
  $("#next").onclick = () => showPractice(topic, cur.chosenLevel);
  if (HAS_LLM) $("#ask").onclick = () => {
    const ctx = `Emne: ${TOPIC[ex.topic].title} (niveau ${ex.level})\nOpgave: ${ex.q}` + (ex.type === "choice" ? `\nValgmuligheder: ${ex.options.join(", ")}` : "") +
      `\nElevens svar: ${cur.lastAns || "(har ikke svaret endnu)"}\nRigtigt svar: ${answerText(ex)}\nLøsning: ${ex.steps.join(" | ")}`;
    chat.ctx = ctx; chat.ctxLabel = ex.q;
    chat.draft = cur.lastAns && !cur.solved ? "Jeg fik det forkert. Kan du hjælpe mig med at forstå, hvordan man gør?" : "Jeg forstår ikke helt den her opgave. Kan du hjælpe mig i gang?";
    location.hash = "#/spoerg";
  };
  const first = $("#af input"); if (first && matchMedia("(pointer: fine)").matches) first.focus();
}
function answerUI(ex) {
  if (ex.type === "frac") {
    const hele = !["improper", "exact", "plain"].includes(ex.form);
    return `<div class="ans-frac">${hele ? `<label class="hele"><input id="a-w" inputmode="numeric" pattern="[0-9]*" aria-label="hele"><small>hele</small></label>` : ""}
      <div class="stack"><input id="a-n" inputmode="numeric" pattern="[0-9]*" aria-label="tæller"><i></i><input id="a-d" inputmode="numeric" pattern="[0-9]*" aria-label="nævner"></div>
      <span class="small muted hint-in">${ex.form === "mixed" ? "Skriv de hele i den lille boks." : hele ? "Den lille boks til hele kan du lade stå tom." : ""}</span></div>`;
  }
  if (ex.type === "number") return `<div class="ans-num"><input id="a-x" inputmode="decimal" aria-label="svar">${ex.unit ? `<span>${esc(ex.unit)}</span>` : ""}</div>`;
  if (ex.type === "choice") return `<div class="choice">${ex.options.map((o, i) => `<button type="button" data-i="${i}">${fmtLine(o)}${ex.labels ? `<small>${ex.labels[i]}</small>` : ""}</button>`).join("")}</div>`;
  return "";
}
function readAnswer(ex) {
  if (ex.type === "frac") {
    const w = ($("#a-w") || { value: "" }).value.trim(), n = $("#a-n").value.trim(), d = $("#a-d").value.trim();
    if (w && !n && !d) { if (!/^\d+$/.test(w)) return { err: "Skriv et helt tal." }; return { val: q(+w, 1), w: +w, n: 0, d: 1, text: w }; }
    if (!/^\d+$/.test(n) || !/^\d+$/.test(d)) return { err: "Skriv et tal i både tælleren (øverst) og nævneren (nederst)." };
    if (+d === 0) return { err: "Nævneren kan ikke være 0. Man kan ikke dele noget i 0 dele." };
    if (w && !/^\d+$/.test(w)) return { err: "De hele skal være et helt tal." };
    const W = w ? +w : 0;
    return { val: q(W * +d + +n, +d), w: W, n: +n, d: +d, text: (W ? W + " " : "") + n + "/" + d };
  }
  if (ex.type === "number") {
    const s = $("#a-x").value.trim().replace(/\s/g, "").replace(",", ".").replace(/%$/, "");
    if (!/^-?\d+(\.\d+)?$/.test(s)) return { err: "Skriv et tal (brug komma til decimaler)." };
    return { x: parseFloat(s), text: $("#a-x").value.trim() };
  }
  if (ex.type === "choice") { const b = $(".choice button.sel"); if (!b) return { err: "Vælg et af svarene." }; return { i: +b.dataset.i, text: ex.options[+b.dataset.i] }; }
  const c = $$(".paint rect.on").length; return { c, text: `${c} af ${ex.n} felter farvet` };
}
const PRAISE = ["Rigtigt! 🎉", "Flot!", "Sådan!", "Præcis!", "Godt regnet!", "Yes, det er rigtigt!"];
function judge(ex, a) {
  if (ex.type === "frac") {
    if (!a.val.eq(ex.ans)) {
      for (const m of ex.miss) if (a.val.eq(m.v)) return { ok: false, msg: m.msg };
      return { ok: false };
    }
    if (ex.form === "exact" && (a.w || a.n !== ex.ans.n || a.d !== ex.ans.d)) return { retry: "Brøken har den rigtige størrelse, men opgaven er at forlænge: gang både tælleren og nævneren med tallet, og skriv dem, du får." };
    if (ex.form === "mixed" && !(a.w > 0 && a.n < a.d && a.n > 0)) return { retry: "Rigtig størrelse! Men skriv det som et blandet tal: de hele i den lille boks og resten som brøk." };
    if (ex.simplest && !q(a.n, a.d).simplest()) return { retry: "Rigtig størrelse! Men den kan forkortes mere. Prøv igen." };
    if (a.n && !q(a.n, a.d).simplest()) return { ok: true, note: `Tip: ${a.text} kan forkortes til ${ex.ans.m()}. Husk at forkorte til sidst.` };
    if (a.n > a.d && a.d > 1 && !a.w && ex.form !== "improper") return { ok: true, note: `Som blandet tal er det ${ex.ans.m()}.` };
    return { ok: true };
  }
  if (ex.type === "number") {
    if (Math.abs(a.x - ex.ans) < 1e-9) return { ok: true };
    for (const m of ex.missNum || []) if (Math.abs(a.x - m.v) < 1e-9) return { ok: false, msg: m.msg };
    return { ok: false };
  }
  if (ex.type === "choice") return { ok: a.i === ex.ans };
  return a.c === ex.k ? { ok: true } : { ok: false, msg: a.c > ex.k ? "Du har farvet for mange felter." : "Du har farvet for få felter." };
}
async function record(correct) {
  if (cur.recorded) return; cur.recorded = true;
  const msg = localRecord(cur.ex.topic, cur.ex.level, correct);
  if (msg) toast(msg);
  if (HAS_LLM) api("api/result", {}).catch(() => {});
}
function feedback(cls, html) { $("#fb").innerHTML = `<div class="fb ${cls}">${html}</div>`; }
function doCheck() {
  if (cur.solved) return;
  const a = readAnswer(cur.ex);
  if (a.err) return feedback("info", esc(a.err));
  cur.lastAns = a.text;
  const r = judge(cur.ex, a);
  if (r.retry) return feedback("info", fmtLine(r.retry));
  if (r.ok) {
    cur.solved = true;
    feedback("good", `<b>${pick(PRAISE)}</b>${r.note ? " " + fmtLine(r.note) : ""}`);
    record(!cur.shown && cur.wrong < 2);
    finish();
    return;
  }
  cur.wrong++;
  feedback("bad", `<b>Ikke helt.</b> ${r.msg ? fmtLine(r.msg) : cur.wrong >= 2 ? "Se løsningen, eller spørg Brøkhjælperen." : "Prøv igen. Her er et hint:"}`);
  if (!r.msg && cur.wrong === 1) showHint();
  if (cur.wrong >= 2) { record(false); $("#sol").classList.add("primary"); }
}
function showHint() {
  const h = cur.ex.hints;
  if (cur.hints >= h.length) { if (!h.length || cur.hints === h.length) { $("#hints").insertAdjacentHTML("beforeend", `<div class="hint muted">Ikke flere hints. Prøv “Vis løsning”.</div>`); cur.hints++; } return; }
  $("#hints").insertAdjacentHTML("beforeend", `<div class="hint"><b>Hint ${cur.hints + 1}:</b> ${fmtLine(h[cur.hints])}</div>`);
  cur.hints++;
}
function showSolution() {
  cur.shown = true;
  if (!cur.solved) record(false);
  $("#steps").innerHTML = `<div class="solution"><b>Løsning</b><ol>${cur.ex.steps.map(s => `<li>${fmtLine(s)}</li>`).join("")}</ol>
    <div>Svar: <b>${fmtLine(answerText(cur.ex))}</b></div></div>`;
  if (cur.ex.type === "color") $$(".paint rect").forEach((r, i) => { r.classList.toggle("on", i < cur.ex.k); r.classList.toggle("off", i >= cur.ex.k); });
  finish();
}
function finish() {
  $("#next").hidden = false; $("#check").disabled = true; $("#sol").hidden = cur.shown; $("#hint").hidden = true;
  if (cur.solved && !cur.shown) $("#sol").textContent = "Se løsningen";
  $("#next").focus({ preventScroll: true });
}

// ---------- Brøkhjælperen ----------
const chat = { msgs: store.get("chat", []), ctx: "", ctxLabel: "", draft: "", busy: false };
const SUGGEST = ["Hvad er en fællesnævner?", "Hvordan forkorter man en brøk?", "Hvorfor vender man brøken, når man dividerer?", "Forklar 3/4 med en pizza",
  "Hvordan laver man 3/8 om til procent?", "Giv mig en opgave, jeg kan prøve"];
function showChat() {
  view().innerHTML = `<div class="chat">
    <div class="chat-head"><div><h1>Spørg Brøkhjælperen</h1><p class="small muted">Spørg om alt med brøker. Den forklarer trin for trin og kan tage fejl, ligesom alle andre.</p></div>
      <button class="btn small ghost" id="clear">Ny samtale</button></div>
    <div id="msgs" class="msgs"></div>
    <div class="composer">
      ${chat.ctx ? `<div class="ctx"><span>Om opgaven: ${fmtLine(chat.ctxLabel)}</span><button id="noctx" aria-label="Fjern opgaven">×</button></div>` : ""}
      <form id="cf"><textarea id="ci" rows="1" placeholder="Skriv dit spørgsmål …" maxlength="1000"></textarea><button class="btn primary" id="cs">Send</button></form>
    </div></div>`;
  $("#ci").value = chat.draft || ""; chat.draft = "";
  renderMsgs();
  $("#cf").onsubmit = e => { e.preventDefault(); const t = $("#ci").value.trim(); if (t && !chat.busy) { $("#ci").value = ""; autoSize(); sendChat(t); } };
  $("#ci").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer: fine)").matches) { e.preventDefault(); $("#cf").requestSubmit(); } });
  $("#ci").addEventListener("input", autoSize); autoSize();
  $("#clear").onclick = () => { chat.msgs = []; chat.ctx = ""; store.set("chat", []); showChat(); };
  const nc = $("#noctx"); if (nc) nc.onclick = () => { chat.ctx = ""; showChat(); };
  if (matchMedia("(pointer: fine)").matches) $("#ci").focus();
}
function autoSize() { const t = $("#ci"); if (!t) return; t.style.height = "auto"; t.style.height = Math.min(160, t.scrollHeight) + "px"; }
function renderMsgs() {
  const box = $("#msgs"); if (!box) return;
  if (!chat.msgs.length) {
    box.innerHTML = `<div class="empty"><p>Hej${state.me.name ? " " + esc(state.me.name) : ""}! Hvad vil du gerne vide? Du kan fx spørge:</p>
      <div class="sugg">${SUGGEST.map(s => `<button class="chip-btn">${fmtLine(s)}</button>`).join("")}</div></div>`;
    $$(".sugg button", box).forEach((b, i) => b.onclick = () => sendChat(SUGGEST[i]));
    return;
  }
  box.innerHTML = chat.msgs.map((m, i) => `<div class="msg ${m.role}">${m.role === "assistant" ? '<div class="who">Brøkhjælperen</div>' : ""}
    <div class="bubble" id="m${i}">${m.content ? fmt(m.content) : m.error ? "" : '<span class="dots"><i></i><i></i><i></i></span> <span class="small muted">tænker … (det kan tage op til et halvt minut)</span>'}
    ${m.error ? `<div class="err">${esc(m.error)}</div>` : ""}</div></div>`).join("");
  box.lastElementChild.scrollIntoView({ block: "end", behavior: "smooth" });
}
async function sendChat(text) {
  if (chat.busy) return;
  chat.busy = true; $("#cs") && ($("#cs").disabled = true);
  chat.msgs.push({ role: "user", content: text });
  const m = { role: "assistant", content: "" }; chat.msgs.push(m); renderMsgs();
  const history = chat.msgs.slice(0, -1).filter(x => x.content).map(({ role, content }) => ({ role, content }));
  try {
    const r = await fetch("api/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-Brok": "1" }, body: JSON.stringify({ messages: history, context: chat.ctx, name: state.me.name }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || "Hjælperen svarer ikke lige nu."); }
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = "", last = 0;
    for (;;) {
      const { done, value } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const ev = buf.slice(0, i); buf = buf.slice(i + 2);
        if (!ev.startsWith("data: ")) continue;
        const o = JSON.parse(ev.slice(6));
        if (o.t) m.content += o.t;
        if (o.error) m.error = o.error;
      }
      const el = $("#m" + (chat.msgs.length - 1));
      if (el && m.content && Date.now() - last > 120) { el.innerHTML = fmt(m.content); last = Date.now(); el.scrollIntoView({ block: "end" }); }
    }
  } catch (e) { m.error = e.message || "Hjælperen svarer ikke lige nu."; }
  if (!m.content && !m.error) m.error = "Der kom intet svar. Prøv igen.";
  chat.busy = false;
  chat.msgs = chat.msgs.slice(-30);
  store.set("chat", chat.msgs.filter(x => x.content));
  if ($("#msgs")) { renderMsgs(); $("#cs").disabled = false; }
}

// ---------- værksted ----------
function fracFacts(n, d) {
  const f = q(n, d), s = f.s(), fin = (() => { let x = s.d; while (x % 2 === 0) x /= 2; while (x % 5 === 0) x /= 5; return x === 1; })();
  const dec = fin ? dk(f.v()) : "≈ " + dk(Math.round(f.v() * 1000) / 1000), pct = fin ? dk(f.v() * 100) : "≈ " + dk(Math.round(f.v() * 1000) / 10);
  return [["Forkortet", n === 0 ? "0" : s.t()], ["Blandet tal", n >= d && n ? s.m() : "–"], ["Decimaltal", dec], ["Procent", pct + " %"]];
}
function showWorkshop() {
  const st = store.get("ws", { a: [3, 4], b: [2, 3] });
  view().innerHTML = `<h1>Værkstedet</h1><p class="muted">Skub på tælleren og nævneren, og se hvad der sker.</p>
    <section class="card ws">
      <div class="ws-grid"><div class="bigfrac" id="wa-f"></div><div id="wa-vis" class="ws-vis"></div></div>
      <label>Tæller <input type="range" id="wa-n" min="0" max="24" value="${st.a[0]}"></label>
      <label>Nævner <input type="range" id="wa-d" min="1" max="12" value="${st.a[1]}"></label>
      <table class="tbl facts" id="wa-t"></table>
    </section>
    <h2>Sammenlign to brøker</h2>
    <section class="card ws">
      <div class="cmp"><div class="bigfrac" id="c-a"></div><div class="sign" id="c-s"></div><div class="bigfrac" id="c-b"></div></div>
      <div id="c-vis"></div>
      <div class="two"><div><label>Tæller A <input type="range" id="ca-n" min="0" max="12" value="${st.a[0]}"></label><label>Nævner A <input type="range" id="ca-d" min="1" max="12" value="${st.a[1]}"></label></div>
        <div><label>Tæller B <input type="range" id="cb-n" min="0" max="12" value="${st.b[0]}"></label><label>Nævner B <input type="range" id="cb-d" min="1" max="12" value="${st.b[1]}"></label></div></div>
      <p class="small muted" id="c-why"></p>
    </section>`;
  const v = id => +$("#" + id).value;
  const upd = () => {
    const n = v("wa-n"), d = v("wa-d");
    $("#wa-f").innerHTML = fracHTML(n, d);
    const wh = Math.max(1, Math.ceil(n / d));
    $("#wa-vis").innerHTML = bars(n, d, wh) + pies(n, d);
    $("#wa-t").innerHTML = fracFacts(n, d).map(([k, x]) => `<tr><th>${k}</th><td>${fmtLine(x)}</td></tr>`).join("");
    const A = q(v("ca-n"), v("ca-d")), B = q(v("cb-n"), v("cb-d")), c = A.cmp(B);
    $("#c-a").innerHTML = fracHTML(A.n, A.d); $("#c-b").innerHTML = fracHTML(B.n, B.d); $("#c-s").textContent = c < 0 ? "<" : c > 0 ? ">" : "=";
    const w2 = Math.max(1, Math.ceil(A.v()), Math.ceil(B.v()));
    $("#c-vis").innerHTML = `<div class="lbl">A</div>${bars(A.n, A.d, w2, "a")}<div class="lbl">B</div>${bars(B.n, B.d, w2, "b")}`;
    const L = lcm(A.d, B.d);
    $("#c-why").innerHTML = A.d === B.d ? "Samme nævner: sammenlign bare tællerne." : fmtLine(`Med fællesnævner ${L}: ${A.t()} = ${A.n * L / A.d}/${L} og ${B.t()} = ${B.n * L / B.d}/${L}`);
    store.set("ws", { a: [n, d], b: [B.n, B.d] });
  };
  $$(".ws input").forEach(i => i.addEventListener("input", upd)); upd();
}

// ---------- huskeark ----------
function showSheet() {
  const rows = [
    ["Tæller og nævner", "I 3/4 er 3 tælleren (hvor mange dele) og 4 nævneren (hvor mange dele det hele er delt i)."],
    ["Forlænge", "Gang tæller og nævner med samme tal: 2/3 = 8/12"],
    ["Forkorte", "Divider tæller og nævner med samme tal: 18/24 = 3/4"],
    ["Sammenligne", "Samme nævner: størst tæller vinder. Ellers: find fællesnævner."],
    ["Blandet tal", "11/4 = 2 3/4 (11 : 4 = 2 rest 3), og 2 1/3 = 7/3 (2 · 3 + 1)"],
    ["Plus og minus", "Find fællesnævner, og regn kun med tællerne: 1/2 + 1/3 = 3/6 + 2/6 = 5/6"],
    ["Gange", "Tæller gange tæller, nævner gange nævner: 2/3 · 3/4 = 6/12 = 1/2"],
    ["Helt tal gange brøk", "Gang kun tælleren: 3 · 2/5 = 6/5"],
    ["Dividere", "Behold, vend, gang: 2/3 : 4/5 = 2/3 · 5/4 = 10/12 = 5/6"],
    ["Brøk til decimaltal", "Tæller divideret med nævner: 3/8 = 3 : 8 = 0,375"],
    ["Procent", "Forlæng til hundrededele: 3/4 = 75/100 = 75 %"],
    ["Brøkdel af et tal", "Del med nævneren, gang med tælleren: 3/4 af 60 = 15 · 3 = 45"],
    ["Husk", "Læg aldrig nævnerne sammen. Forkort svaret til sidst."],
  ];
  view().innerHTML = `<h1>Huskeark</h1><p class="muted">Alle reglerne samlet ét sted.</p>
    <section class="card"><table class="tbl sheet">${rows.map(([h, t]) => `<tr><th>${h}</th><td>${fmtLine(t)}</td></tr>`).join("")}</table></section>`;
}

// ---------- installér som app ----------
let installEvt = null;
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function renderInstall() {
  const can = !standalone() && (installEvt || isIOS());
  const box = $("#inst"), card = !!(box && can && !store.get("noinstall", false));
  $("#who").innerHTML = can && installEvt && !card ? `<button class="btn small" id="inst-top">Installér</button>` : "";
  const top = $("#inst-top");
  if (top) top.onclick = doInstall;
  if (!box) return;
  if (!card) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="install"><img src="icon.svg" alt="">
    <div><b>Få Brøk Tutor som app</b><span class="small muted">${installEvt ? "Den ligger på hjemmeskærmen og virker også uden internet."
      : "Tryk på Del-knappen (firkanten med pil op) i Safari, og vælg <b>Føj til hjemmeskærm</b>."}</span></div>
    ${installEvt ? `<button class="btn small primary" id="inst-go">Installér</button>` : ""}<button class="x" id="inst-x" aria-label="Skjul">×</button></div>`;
  const go = $("#inst-go");
  if (go) go.onclick = doInstall;
  $("#inst-x").onclick = () => { store.set("noinstall", true); renderInstall(); };
}
async function doInstall() {
  if (!installEvt) return;
  installEvt.prompt();
  try { await installEvt.userChoice; } catch (e) { /* ignorer */ }
  installEvt = null;
  renderInstall();
}
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; renderInstall(); });
window.addEventListener("appinstalled", () => { installEvt = null; renderInstall(); toast("Brøk Tutor er installeret 🎉"); });

// ---------- start ----------
function start() {
  route();
  renderInstall();
}
window.addEventListener("hashchange", route);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
start();

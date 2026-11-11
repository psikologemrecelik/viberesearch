// VibePsych + Okuma Atlası otomatik testleri. Çalıştır: node --test tests/
// Derleme adımı olmadığı için saf fonksiyonlar HTML dosyalarından satır olarak çıkarılıp yalıtılmış bir bağlamda çalıştırılır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
const INDEX = read('index.html');
const ATLAS = read('atlas.html');

// Bildirimi (function / const) satır satır çıkarır: tek satırlıksa o satır, değilse girintisiyle aynı hizadaki "}" satırına kadar
function extract(src, name) {
  const lines = src.split(/\r?\n/);
  const re = new RegExp(`^(\\s*)(?:async\\s+)?(?:function\\s+${name}\\s*\\(|const\\s+${name}\\s*=)`);
  const i = lines.findIndex(l => re.test(l));
  if (i < 0) throw new Error(`Bulunamadı: ${name}`);
  const indent = re.exec(lines[i])[1];
  const first = lines[i];
  const opens = (first.match(/\{/g) || []).length, closes = (first.match(/\}/g) || []).length;
  if (/^\s*const\s/.test(first) && !/=\s*\{\s*$/.test(first) && !/=>\s*\{\s*$/.test(first)) return first;
  if (opens > 0 && opens === closes) return first;
  const end = lines.findIndex((l, j) => j > i && l === `${indent}}`);
  if (end < 0) throw new Error(`Bitiş bulunamadı: ${name}`);
  return lines.slice(i, end + 1).join('\n');
}

function load(src, names, extra = {}) {
  const code = names.map(n => extract(src, n)).join('\n') + `\n;({${names.join(',')}})`;
  return vm.runInNewContext(code, { console, URL, ...extra });
}

const A = load(ATLAS, ['impAuthor', 'impDoi', 'impPage', 'parseRis', 'parseMedline', 'TEX_ACC', 'texClean', 'parseBib', 'parseRecords',
  'num', 'esConv', 'kappa2', 'cloudHash', 'impTitleKey', 'impDoiKey']);
const CURRENT_YEAR = new Date().getFullYear();
const V = load(INDEX, ['TR_MONTHS', 'shortPubDate', 'APA_PROPER', 'apaSentenceCase'], { CURRENT_YEAR });

// ---------- Sözdizimi ve kurallar ----------
const inlineScripts = html => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

test('satır içi betiklerin sözdizimi geçerli', () => {
  for (const [f, html] of [['index.html', INDEX], ['atlas.html', ATLAS]]) {
    inlineScripts(html).forEach((js, i) => assert.doesNotThrow(() => new vm.Script(js), `${f} betik ${i + 1}`));
  }
  for (const f of ['firebase-config.js', 'sw.js']) if (existsSync(join(ROOT, f))) assert.doesNotThrow(() => new vm.Script(read(f)), f);
});

test('yasaklı emoji ve metin glifleri yok', () => {
  for (const [f, html] of [['index.html', INDEX], ['atlas.html', ATLAS]]) {
    for (const g of ['🌐', '📁', '♥', '✓', '✕', '↵', '➔']) assert.ok(!html.includes(g), `${f} içinde ${g}`);
  }
});

test('atlas önbellek sürümü index içinde tek ve tutarlı', () => {
  const v = [...INDEX.matchAll(/atlas\.html\?v=(\d+)/g)].map(m => m[1]);
  assert.ok(v.length >= 2);
  assert.equal(new Set(v).size, 1, `karışık sürümler: ${v}`);
});

// ---------- Kayıt içe aktarma ----------
test('RIS: yazar, DOI, devam satırı, ilk sayfa', () => {
  const ris = 'TY  - JOUR\nTI  - Working memory and anxiety\nAU  - Moran, Tim P.\nPY  - 2016\nT2  - Psychological Bulletin\nSP  - 831\nDO  - 10.1037/bul0000051\nAB  - Anxiety is associated with\n  working memory deficits.\nDB  - Scopus\nER  - \n';
  const r = A.parseRecords(ris);
  assert.equal(r.fmt, 'RIS');
  assert.equal(r.recs.length, 1);
  const x = r.recs[0];
  assert.equal(x.authors, 'Moran, T. P.');
  assert.equal(x.year, '2016');
  assert.equal(x.doi, '10.1037/bul0000051');
  assert.equal(x.fpage, '831');
  assert.equal(x.abstract, 'Anxiety is associated with working memory deficits.');
  assert.equal(x.db, 'Scopus');
});

test('PubMed/MEDLINE: tam ad, çok satırlı başlık, [doi]', () => {
  const med = 'PMID- 123\nTI  - Attentional control theory: anxiety and cognitive\n      performance.\nFAU - Eysenck, Michael W\nAU  - Eysenck MW\nDP  - 2007 May\nJT  - Emotion\nPG  - 336-53\nLID - 10.1037/1528-3542.7.2.336 [doi]\n';
  const r = A.parseRecords(med);
  assert.equal(r.fmt, 'PubMed (MEDLINE)');
  const x = r.recs[0];
  assert.equal(x.title, 'Attentional control theory: anxiety and cognitive performance');
  assert.equal(x.authors, 'Eysenck, M. W.');
  assert.equal(x.doi, '10.1037/1528-3542.7.2.336');
  assert.equal(x.fpage, '336');
  assert.equal(x.year, '2007');
});

test('BibTeX: Türkçe LaTeX aksanları, @comment atlanır, sayfa', () => {
  const bib = '@article{g,\n title = {{\\"O}{\\u{g}}rencilerde kayg{\\i} ve {\\c{c}}al{\\i}{\\c{s}}ma belle{\\u{g}}i},\n author = {G{\\"u}ne{\\c{s}}, Ay{\\c{s}}e and Y{\\i}lmaz, Mehmet Ali},\n journal = "T{\\"u}rk Psikoloji Dergisi", year = 2021, pages = {12--30}\n}\n@comment{jabref-meta: x}';
  const r = A.parseRecords(bib);
  assert.equal(r.fmt, 'BibTeX');
  assert.equal(r.recs.length, 1);
  assert.equal(r.recs[0].title, 'Öğrencilerde kaygı ve çalışma belleği');
  assert.equal(r.recs[0].authors, 'Güneş, A.; Yılmaz, M. A.');
  assert.equal(r.recs[0].journal, 'Türk Psikoloji Dergisi');
  assert.equal(r.recs[0].fpage, '12');
});

test('yazar adı biçimleri', () => {
  assert.equal(A.impAuthor('Smith JA'), 'Smith, J. A.');
  assert.equal(A.impAuthor('John Smith'), 'Smith, J.');
  assert.equal(A.impAuthor('Doe, Jane-Marie'), 'Doe, J.-M.');
});

test('yinelenen anahtarları: DOI öneki ve başlık aksanı', () => {
  assert.equal(A.impDoiKey('https://doi.org/10.1/ABC'), '10.1/abc');
  assert.equal(A.impTitleKey('Çalışma Belleği: A Test!'), A.impTitleKey('calisma bellegi a test'));
});

// ---------- Etki büyüklüğü ve kappa ----------
test('etki büyüklüğü dönüşümleri', () => {
  const c1 = A.esConv({ type: 'r', value: '-0,30' });
  assert.ok(Math.abs(c1.d - (-0.629)) < 0.001);
  const c2 = A.esConv({ type: 'OR', value: '2.5' });
  assert.ok(Math.abs(c2.d - 0.5052) < 0.001);
  assert.ok(Math.abs(c2.r - 0.2449) < 0.001);
  const c3 = A.esConv({ type: 'd', value: '0.5' });
  assert.ok(Math.abs(c3.r - 0.2425) < 0.001);
  assert.equal(A.esConv({ type: 'other', value: '1' }).r, null);
});

test('Cohen kappa (ikili, belirsiz = dahil)', () => {
  const a = ['in', 'in', 'in', 'in', 'in', 'out', 'out', 'out', 'maybe'];
  const b = ['in', 'in', 'in', 'in', 'out', 'out', 'out', 'in', 'out'];
  const r = A.kappa2(a, b);
  assert.equal(r.n, 9);
  assert.ok(Math.abs(r.po - 6 / 9) < 1e-9);
  assert.ok(Math.abs(r.k - 0.3077) < 0.001);
  assert.equal(A.kappa2(['in', 'out'], ['in', 'out']).k, 1);
});

test('bulut özeti kararlı ve ayırt edici', () => {
  assert.equal(A.cloudHash('abc'), A.cloudHash('abc'));
  assert.notEqual(A.cloudHash('abc'), A.cloudHash('abd'));
});

// ---------- APA ve tarih ----------
test('APA başlık cümle düzeni', () => {
  const s = V.apaSentenceCase;
  assert.equal(s('The Effects of Mindfulness on Anxiety: A Meta-Analysis of Randomized Controlled Trials'),
    'The effects of mindfulness on anxiety: A meta-analysis of randomized controlled trials');
  assert.equal(s('Self-Esteem and Social Media Use Among Turkish Adolescents During COVID-19'),
    'Self-esteem and social media use among Turkish adolescents during COVID-19');
  assert.equal(s('fMRI Evidence for Prefrontal Contributions to Working Memory in ADHD'),
    'fMRI evidence for prefrontal contributions to working memory in ADHD');
  assert.equal(s('Working memory and anxiety: a meta-analysis'), 'Working memory and anxiety: a meta-analysis');
});

test('kart için kısa tarih', () => {
  assert.equal(V.shortPubDate(`${CURRENT_YEAR}-10-27`), '27 Eki');
  assert.equal(V.shortPubDate('2019-03-01'), '2019');
  assert.equal(V.shortPubDate('x'), 'x');
});

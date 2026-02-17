// ============================================================
//  NOVEL·LA IA — codigo.gs
//  Requereix: Script Properties → ANTHROPIC_API_KEY
// ============================================================

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-opus-4-6';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('info')
    .setTitle('Novel·la IA — Creador de contes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── Crida genèrica a l'API d'Anthropic ───────────────────
function callClaude(messages, systemPrompt, maxTokens) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('Falta la clau ANTHROPIC_API_KEY a les Script Properties.');

  const payload = {
    model: MODEL,
    max_tokens: maxTokens || 2048,
    system: systemPrompt || SYSTEM_DEFAULT,
    messages: messages
  };

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const raw      = UrlFetchApp.fetch(API_URL, options);
  const result   = JSON.parse(raw.getContentText());
  if (result.error) throw new Error(result.error.message);
  return result.content[0].text;
}

const SYSTEM_DEFAULT = `Ets un escriptor expert en narrativa catalana i castellana. 
Segueixes escrupolosament el format demanat en cada prompt. 
Respons SEMPRE en català, amb riquesa lingüística i coherència narrativa total respecte al context acumulat.`;

// ─── FASE 1: Genera 10 premisses ──────────────────────────
function fase1_premisses(tematica, history) {
  history = history || [];
  const userMsg = {
    role: 'user',
    content: `Genera 10 premisses narratives originals i ben diferenciades per a una obra del gènere: **${tematica}**.
Cada premissa és UNA sola frase que captura el conflicte central i el personatge.
Format ESTRICTE (res més, sense introduccions):
1. [premissa]
2. [premissa]
3. [premissa]
4. [premissa]
5. [premissa]
6. [premissa]
7. [premissa]
8. [premissa]
9. [premissa]
10. [premissa]`
  };

  const msgs     = [...history, userMsg];
  const response = callClaude(msgs);
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 2: 2 opcions d'estructura narrativa ─────────────
function fase2_estructura(premissaTriada, history) {
  const msgs = [
    ...history,
    { role: 'user', content: `He triat la premissa: "${premissaTriada}"` },
    { role: 'assistant', content: 'Perfecte, incorporo la premissa al context de la bíblia narrativa.' },
    { role: 'user', content: `Crea DUES propostes d'estructura narrativa completes per a aquesta obra.
Format ESTRICTE:
=== OPCIÓ 1 ===
Model narratiu: [ex: 3 actes / viatge de l'heroi / estructura en W...]
To general: [ex: fosc i reflexiu / àgil i humorístic...]
Acte 1 — Plantejament: [resum 2 línies]
Acte 2 — Desenvolupament: [resum 2 línies, incloent punt de gir]
Acte 3 — Resolució: [resum 2 línies]
Moment fosc del protagonista: [1 línia]

=== OPCIÓ 2 ===
Model narratiu: [diferent a l'opció 1]
To general: [diferent]
Acte 1 — Plantejament: [resum 2 línies]
Acte 2 — Desenvolupament: [resum 2 línies]
Acte 3 — Resolució: [resum 2 línies]
Moment fosc del protagonista: [1 línia]` }
  ];

  const response   = callClaude(msgs);
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 3: 2 opcions de personatges ────────────────────
function fase3_personatges(estructuraTriada, history) {
  const msgs = [
    ...history,
    { role: 'user', content: `He triat l'estructura: "${estructuraTriada}"` },
    { role: 'assistant', content: 'Estructura guardada. Continuo construint la bíblia narrativa.' },
    { role: 'user', content: `Crea DUES propostes de sistema de personatges coherents amb la premissa i l'estructura triades.
Format ESTRICTE:
=== OPCIÓ 1 ===
PROTAGONISTA
  Nom: | Edat: | Aspecte breu:
  Ferida del passat (wound):
  Allò que creu que vol (want):
  Allò que realment necessita (need):
  Defecte principal: | Virtut principal:
  Arc de transformació:
ANTAGONISTA / FORÇA OPOSADA
  Nom o naturalesa: | Motivació:
SECUNDARI 1: [nom — funció narrativa — relació amb el protagonista]
SECUNDARI 2: [nom — funció narrativa — relació amb el protagonista]

=== OPCIÓ 2 ===
[mateixa estructura, personatges completament diferents]` }
  ];

  const response   = callClaude(msgs, SYSTEM_DEFAULT, 2500);
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 4: 2 opcions de món i ambientació ───────────────
function fase4_mon(personatgesTriats, history) {
  const msgs = [
    ...history,
    { role: 'user', content: `He triat els personatges: "${personatgesTriats}"` },
    { role: 'assistant', content: 'Personatges incorporats. Ja tinc premissa, estructura i personatges.' },
    { role: 'user', content: `Crea DUES propostes de món i ambientació per a l'obra.
Format ESTRICTE:
=== OPCIÓ 1 ===
Època i lloc principal:
Atmosfera dominant:
LOCALITZACIÓ 1: [nom] — [descripció sensorial: vista, so, olor] — [càrrega emocional]
LOCALITZACIÓ 2: [nom] — [descripció sensorial] — [càrrega emocional]
LOCALITZACIÓ 3: [nom] — [descripció sensorial] — [càrrega emocional]
Simbolisme del món (1 línia):

=== OPCIÓ 2 ===
[mateixa estructura, ambientació completament diferent]` }
  ];

  const response   = callClaude(msgs, SYSTEM_DEFAULT, 2000);
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 5: Taula de capítols (1 sola opció) ─────────────
function fase5_capitols(monTriat, history) {
  const msgs = [
    ...history,
    { role: 'user', content: `He triat el món i ambientació: "${monTriat}"` },
    { role: 'assistant', content: 'La bíblia narrativa és completa: premissa, estructura, personatges i món.' },
    { role: 'user', content: `Genera la taula definitiva de capítols per a l'obra. Entre 10 i 14 capítols.
Format per a cada capítol:
**Capítol [N]: [Títol evocador]**
Objectiu narratiu: [1 línia]
Conflicte principal: [1 línia]
Personatges actius: [llista]
Escenari: [localització]
Ganxo final: [1 línia]
---` }
  ];

  const response   = callClaude(msgs, SYSTEM_DEFAULT, 3000);
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 6+: Escriptura de cada capítol (1 sola opció) ───
function fase6_escriureCapitol(numCapitol, titolCapitol, totalCapitols, history) {
  const msgs = [
    ...history,
    { role: 'user', content: `Escriu el **Capítol ${numCapitol}: ${titolCapitol}** complet.

Requisits:
- Coherència absoluta amb tota la bíblia narrativa (premissa, estructura, personatges, món)
- Narrador i veu consistents amb els capítols anteriors si n'hi ha
- Diàlegs naturals quan calgui
- Descripció sensorial de l'entorn (no només visual)
- Arc emocional del protagonista visible en aquest capítol
${numCapitol < totalCapitols ? '- Final que crea expectativa cap al capítol següent' : '- Final que tanca l\'arc complet de la novel·la de manera satisfactòria'}
- Extensió: entre 900 i 1300 paraules

Escriu directament el capítol, sense cap introducció prèvia.` }
  ];

  const response   = callClaude(msgs, SYSTEM_DEFAULT, 4000);
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── Parseig de premisses ──────────────────────────────────
function parsePremisses(text) {
  const lines = text.split('\n').filter(l => /^\d+\./.test(l.trim()));
  return lines.map(l => l.replace(/^\d+\.\s*/, '').trim());
}

// ─── Parseig de les 2 opcions ─────────────────────────────
function parseOpcions(text) {
  const parts = text.split(/===\s*OPCIÓ\s*[12]\s*===/i).filter(p => p.trim().length > 0);
  return parts.map(p => p.trim());
}

// ─── Parseig de la taula de capítols ──────────────────────
function parseCapitols(text) {
  const blocks = text.split('---').map(b => b.trim()).filter(b => b.length > 0);
  return blocks.map(block => {
    const titolMatch = block.match(/\*\*Capítol\s+(\d+):\s*(.+?)\*\*/i);
    return {
      num:   titolMatch ? parseInt(titolMatch[1]) : null,
      titol: titolMatch ? titolMatch[2].trim()   : 'Capítol',
      text:  block
    };
  }).filter(c => c.num !== null);
}

// ─── Funció d'exportació a Google Doc ─────────────────────
function exportarADoc(titol, contingut) {
  const doc    = DocumentApp.create(titol || 'Novel·la IA');
  const body   = doc.getBody();
  body.clear();
  body.appendParagraph(titol || 'Novel·la IA')
      .setHeading(DocumentApp.ParagraphHeading.TITLE);

  const seccions = contingut.split('\n\n');
  seccions.forEach(sec => {
    if (sec.trim()) {
      if (sec.startsWith('**Capítol')) {
        body.appendParagraph(sec.replace(/\*\*/g, ''))
            .setHeading(DocumentApp.ParagraphHeading.HEADING1);
      } else {
        body.appendParagraph(sec.trim());
      }
    }
  });

  doc.saveAndClose();
  return doc.getUrl();
}

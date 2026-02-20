// ============================================================
//  CONTE IA — codigo.gs
// ============================================================

const PROVIDER_DEFAULTS = {
  anthropic: {
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-opus-4-1'
  },
  openai: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o'
  },
  gemini: {
    apiUrlBase: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-1.5-pro'
  }
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Conte IA — Creador de contes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── Crida genèrica a LLM ──────────────────────────────────
function callLLM(messages, systemPrompt, config) {
  const safeConfig = config || {};
  const provider = String(safeConfig.provider || '').toLowerCase().trim();
  const apiKey = safeConfig.apiKey;
  const model = safeConfig.model;
  const maxTokens = safeConfig.maxTokens || 2048;

  if (!provider) throw new Error('Falta el provider al config.');
  if (!apiKey)   throw new Error("Falta l'apiKey al config.");

  if (provider === 'anthropic') return callAnthropic(messages, systemPrompt, apiKey, model, maxTokens);
  if (provider === 'openai')    return callOpenAI(messages, systemPrompt, apiKey, model, maxTokens);
  if (provider === 'gemini' || provider === 'google' || provider === 'google-gemini')
    return callGemini(messages, systemPrompt, apiKey, model, maxTokens);

  throw new Error('Provider no suportat: ' + provider);
}

function callAnthropic(messages, systemPrompt, apiKey, model, maxTokens) {
  const payload = {
    model: model || PROVIDER_DEFAULTS.anthropic.model,
    max_tokens: maxTokens,
    system: systemPrompt || SYSTEM_DEFAULT,
    messages: messages
  };
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const raw    = UrlFetchApp.fetch(PROVIDER_DEFAULTS.anthropic.apiUrl, options);
  const result = parseJsonResponse(raw, 'Anthropic');
  if (result.error) throw new Error(result.error.message || "Error desconegut d'Anthropic.");
  const text = Array.isArray(result.content)
    ? result.content.filter(p => p && p.type === 'text').map(p => p.text || '').join('\n')
    : '';
  return normalizeLLMText(text);
}

function callOpenAI(messages, systemPrompt, apiKey, model, maxTokens) {
  const payload = {
    model: model || PROVIDER_DEFAULTS.openai.model,
    messages: buildOpenAIMessages(messages, systemPrompt),
    max_tokens: maxTokens
  };
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const raw    = UrlFetchApp.fetch(PROVIDER_DEFAULTS.openai.apiUrl, options);
  const result = parseJsonResponse(raw, 'OpenAI');
  if (result.error) throw new Error(result.error.message || "Error desconegut d'OpenAI.");
  const firstChoice    = result.choices && result.choices[0];
  const messageContent = firstChoice && firstChoice.message ? firstChoice.message.content : '';
  return normalizeLLMText(extractContentText(messageContent));
}

function callGemini(messages, systemPrompt, apiKey, model, maxTokens) {
  const finalModel = model || PROVIDER_DEFAULTS.gemini.model;
  const endpoint   = PROVIDER_DEFAULTS.gemini.apiUrlBase + '/' +
    encodeURIComponent(finalModel) + ':generateContent?key=' + encodeURIComponent(apiKey);
  const payload = {
    contents: buildGeminiContents(messages),
    generationConfig: { maxOutputTokens: maxTokens }
  };
  if (systemPrompt || SYSTEM_DEFAULT) {
    payload.systemInstruction = { parts: [{ text: systemPrompt || SYSTEM_DEFAULT }] };
  }
  const options = {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const raw    = UrlFetchApp.fetch(endpoint, options);
  const result = parseJsonResponse(raw, 'Gemini');
  if (result.error) {
    throw new Error(
      (result.error.message || 'Error desconegut de Gemini.') +
      (result.error.status ? ' (' + result.error.status + ')' : '')
    );
  }
  const firstCandidate = result.candidates && result.candidates[0];
  const parts = firstCandidate && firstCandidate.content ? firstCandidate.content.parts : [];
  const text  = Array.isArray(parts) ? parts.map(p => (p && p.text) ? p.text : '').join('\n') : '';
  return normalizeLLMText(text);
}

function buildOpenAIMessages(messages, systemPrompt) {
  const base = [];
  if (systemPrompt || SYSTEM_DEFAULT) base.push({ role: 'system', content: systemPrompt || SYSTEM_DEFAULT });
  return base.concat((messages || []).map(msg => ({
    role: msg.role,
    content: extractContentText(msg.content)
  })));
}

function buildGeminiContents(messages) {
  return (messages || []).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: extractContentText(msg.content) }]
  }));
}

function extractContentText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item.text === 'string') return item.text;
    return '';
  }).join('\n');
  if (content && typeof content.text === 'string') return content.text;
  return content ? String(content) : '';
}

function normalizeLLMText(text) {
  return (text || '').replace(/^\s+|\s+$/g, '');
}

function parseJsonResponse(rawResponse, providerName) {
  const statusCode = rawResponse.getResponseCode();
  const rawText    = rawResponse.getContentText() || '';
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    throw new Error(
      providerName + ' ha retornat una resposta no JSON. Codi HTTP: ' +
      statusCode + '. Resposta: ' + rawText.slice(0, 500)
    );
  }
  if (statusCode >= 400) {
    const message = parsed && parsed.error
      ? (parsed.error.message || JSON.stringify(parsed.error))
      : rawText.slice(0, 500);
    throw new Error(providerName + ' error HTTP ' + statusCode + ': ' + message);
  }
  return parsed;
}

// ─── System prompt per a contes ────────────────────────────
const SYSTEM_DEFAULT = `Ets un mestre del conte literari breu en català.
Apliques el principi d'unitat d'efecte de Poe: cada paraula serveix un únic impacte emocional final.
Escrius amb economia de paraules, primera frase magnètica, tensió creixent i finals memorables que ressonen.
Mai desperdicies una frase. Prioritzes mostrar sobre explicar (show, don't tell).
Respons sempre en català, amb veu literària precisa i original.`;

// ─── FASE 1: 10 premisses per a contes ─────────────────────
function fase1_premisses(tematica, history, userConfig) {
  history = history || [];
  const userMsg = {
    role: 'user',
    content: `Genera 10 premisses originals per a contes breus del gènere: **${tematica}**.

Cada premissa ha de:
- Ser una sola frase que contingui una situació anòmala o conflicte inicial potent
- Tenir un ganxo implícit que faci preguntar "i llavors?"
- Suggerir potencial de twist o revelació inesperada al final
- Ser concreta, sorprenent, no òbvia ni genèrica

Afegeix (Recomanat) al final de la premissa que consideris més potent literàriament.

Format ESTRICTE (res més, sense cap introducció):
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
  const msgs       = [...history, userMsg];
  const response   = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens: 1800 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 3: 5 protagonistes rics ──────────────────────────
function fase3_personatges(premissaTriada, estilDesc, history, userConfig) {
  const msgs = [
    ...history,
    {
      role: 'user',
      content: `He triat la premissa: "${premissaTriada}". L'estil narratiu serà: ${estilDesc}.`
    },
    {
      role: 'assistant',
      content: "Perfecte. Proposo protagonistes rics en contradiccions, coherents amb la premissa i l'estil triat."
    },
    {
      role: 'user',
      content: `Genera 5 protagonistes possibles per a aquest conte. Cada un ha de tenir veu pròpia i tensió interna que el faci memorable.

Afegeix (Recomanat) al final del protagonista que millor encaixi amb la premissa i l'estil triat.

Format ESTRICTE (5 opcions, res més):
1. **[Nom, edat]** | Desig: [el que vol conscientment] | Temor: [el que l'aterroritza o amaga] | Contradicció: [la tensió interna que el fa humà] | Veu: [tret narratiu o tic que el fa distintiu]
2. **[Nom, edat]** | Desig: [...] | Temor: [...] | Contradicció: [...] | Veu: [...]
3. **[Nom, edat]** | Desig: [...] | Temor: [...] | Contradicció: [...] | Veu: [...]
4. **[Nom, edat]** | Desig: [...] | Temor: [...] | Contradicció: [...] | Veu: [...]
5. **[Nom, edat]** | Desig: [...] | Temor: [...] | Contradicció: [...] | Veu: [...]`
    }
  ];
  const response   = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens: 2200 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 4: 5 localitzacions ───────────────────────────────
function fase_localitzacions(protagonistaTriat, estilDesc, history, userConfig) {
  const msgs = [
    ...history,
    { role: 'user',      content: `He triat el protagonista: "${protagonistaTriat}".` },
    { role: 'assistant', content: "Perfecte. Proposo localitzacions que maximitzin el potencial narratiu de la premissa i el protagonista." },
    {
      role: 'user',
      content: `Genera 5 localitzacions possibles per a aquest conte, coherents amb el gènere, l'estil i el protagonista triat.

Cada localització ha de:
- Tenir una atmosfera concreta que reforci el to del conte
- Incloure un detall físic específic que pugui tenir rol narratiu
- Suggerir tensions o possibilitats implícites (no explicar-les)

Afegeix (Recomanat) al final de la localització que millor serveixi la premissa i l'estil.

Format ESTRICTE (5 opcions, res més):
1. **[Nom/tipus de lloc]** | Atmosfera: [adjectius sensorials] | Detall clau: [element físic concret] | Potencial: [possibilitat narrativa breu]
2. **[Nom/tipus de lloc]** | Atmosfera: [...] | Detall clau: [...] | Potencial: [...]
3. **[Nom/tipus de lloc]** | Atmosfera: [...] | Detall clau: [...] | Potencial: [...]
4. **[Nom/tipus de lloc]** | Atmosfera: [...] | Detall clau: [...] | Potencial: [...]
5. **[Nom/tipus de lloc]** | Atmosfera: [...] | Detall clau: [...] | Potencial: [...]`
    }
  ];
  const response   = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens: 1800 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 5: 5 finals possibles ─────────────────────────────
function fase4_finals(localitzacioTriada, estilDesc, history, userConfig) {
  const msgs = [
    ...history,
    { role: 'user',      content: `He triat la localització: "${localitzacioTriada}".` },
    { role: 'assistant', content: 'Perfecte. Amb totes les decisions preses, proposo possibles finals per al conte.' },
    {
      role: 'user',
      content: `Genera 5 finals possibles per a aquest conte, coherents amb la premissa, l'estil i el protagonista triats.

Cada final ha de:
- Ser diferent en to i resolució dels altres
- Tenir impacte emocional genuí
- Ser inevitable en retrospectiva però imprevist durant la lectura
- Explicar-se en 2-3 frases que capturin l'essència sense revelar massa

Afegeix (Recomanat) al final de l'opció que consideris més poderosa literàriament.

Format ESTRICTE (5 opcions, res més):
1. [descripció del final en 2-3 frases]
2. [descripció del final en 2-3 frases]
3. [descripció del final en 2-3 frases]
4. [descripció del final en 2-3 frases]
5. [descripció del final en 2-3 frases]`
    }
  ];
  const response   = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens: 1800 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── ESCRIPTURA: Generació per parts (anti-timeout GAS) ─────
// Cada crida genera UNA part del conte (~750-1200 paraules màx).
// El frontend encadena les crides i assembla el text final.
// Així cap crida individual supera els 2-3 min d'execució de GAS.
//
// partNum:       1, 2 o 3
// totalParts:    1 (microconte), 2 (curt), 3 (llarg)
// paraulesPerPart: objectiu de paraules per a aquesta part
// finalTriat:    el final escollit (s'inclou a l'última part)
// estilDesc:     descripció de l'estil narratiu
function escriureContePart(partNum, totalParts, paraulesPerPart, finalTriat, estilDesc, history, userConfig) {
  const pp = parseInt(paraulesPerPart) || 750;
  let userContent;

  if (totalParts === 1) {
    // ── Conte sencer en una sola crida (microconte ≤500 paraules) ──
    userContent =
`He triat el final: "${finalTriat}".

Escriu el CONTE COMPLET (~${pp} paraules). Estil: ${estilDesc}.
Final obligatori: "${finalTriat}"

OBERTURA: primera frase magnètica, tensió immediata. Primers 3 paràgrafs sense exposició directa.
ESTRUCTURA: unitat d'efecte, tensió creixent, punt d'inflexió a les 2/3 parts.
ESTIL: mostra no expliquis, detalls sensorials concrets, ritme variat, veu única, diàlegs que revelen caràcter.
FINAL: l'última frase ressona i tanca un cercle del principi.
Escriu directament el conte, sense títol ni nota de l'autor.`;

  } else if (partNum === 1) {
    // ── Primera part: obertura i plantejament ──
    userContent =
`He triat el final: "${finalTriat}".

Escriu la PRIMERA PART del conte (~${pp} paraules). Estil: ${estilDesc}.

Objectiu d'aquesta part:
→ Primera frase impossible de no llegir (pregunta o tensió immediata).
→ Establir la veu, l'atmosfera i el personatge sense exposició directa.
→ Plantar la tensió central i el conflicte que s'ha de resoldre.
→ Acabar en un punt de suspens que demani la continuació (NO resolguis res).
Mostra, no expliquis. Detalls sensorials concrets. Veu única.
Escriu directament, sense títol ni indicació de "Part 1".`;

  } else if (partNum < totalParts) {
    // ── Part central: desenvolupament i escalada ──
    userContent =
`Continua el conte amb la PART ${partNum} (~${pp} paraules).

Objectiu d'aquesta part:
→ Augmenta el conflicte i la pressió sobre el protagonista.
→ Introdueix el punt d'inflexió o la complicació principal.
→ Acaba quan la tensió arriba al màxim, just abans de la resolució.
Continua directament des d'on ha quedat el text. Sense cap indicació de part.`;

  } else {
    // ── Última part: clímax i resolució ──
    userContent =
`Finalitza el conte amb la PART FINAL (~${pp} paraules).

El desenllaç OBLIGATORI és: "${finalTriat}"

→ Executa el clímax i la resolució amb precisió literària.
→ El desenllaç ha de ser inevitable en retrospectiva però imprevist durant la lectura.
→ L'última frase ha de ressonar i tancar un cercle obert al principi.
Continua directament des d'on ha quedat el text. Sense cap indicació de part.`;
  }

  const msgs      = [...history, { role: 'user', content: userContent }];
  // Màxim ~2800 tokens per crida → ben per sota del timeout de GAS
  const maxTokens = Math.min(Math.round(pp * 1.9) + 400, 2800);
  const response   = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── MILLORA: Regenera el conte amb instrucció específica ───
function millorarConte(instruccio, conteActual, estilDesc, history, userConfig) {
  const msgs = [
    ...history,
    {
      role: 'user',
      content: `Aquí tens el conte actual:\n\n${conteActual}\n\n---\nReescriu el conte complet aplicant aquesta millora: "${instruccio}".\n\nMantén tot el que funciona bé. Millora específicament el que es demana. Mantén la mateixa extensió aproximada i l'estil: ${estilDesc}.\n\nEscriu directament el conte millorat, sense cap comentari previ.`
    }
  ];
  const maxTokens  = Math.min(Math.round(conteActual.split(' ').length * 2.5) + 600, 8000);
  const response   = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── Export a Google Doc (format literari) ──────────────────
function exportarADoc(titol, contingut) {
  const doc  = DocumentApp.create(titol || 'Conte');
  const body = doc.getBody();
  body.clear();

  // Títol centrat
  const titolPar = body.appendParagraph(titol || 'Conte');
  titolPar.setHeading(DocumentApp.ParagraphHeading.TITLE);

  // Separador
  body.appendParagraph('');

  // Cos del conte: un paràgraf per bloc, sagna primera línia (format literari)
  const paragraphs = contingut.split(/\n\n+/).filter(p => p.trim().length > 0);
  paragraphs.forEach((par, i) => {
    const p = body.appendParagraph(par.trim());
    p.setLineSpacing(1.5);
    if (i > 0) p.setIndentFirstLine(28.35); // ~1cm
  });

  doc.saveAndClose();
  return doc.getUrl();
}

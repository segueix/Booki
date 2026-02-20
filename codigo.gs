// ============================================================
//  NOVEL·LA IA — codigo.gs
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
    .setTitle('Novel·la IA — Creador de contes')
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
  if (!apiKey) throw new Error('Falta l\'apiKey al config.');

  if (provider === 'anthropic') {
    return callAnthropic(messages, systemPrompt, apiKey, model, maxTokens);
  }

  if (provider === 'openai') {
    return callOpenAI(messages, systemPrompt, apiKey, model, maxTokens);
  }

  if (provider === 'gemini' || provider === 'google' || provider === 'google-gemini') {
    return callGemini(messages, systemPrompt, apiKey, model, maxTokens);
  }

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

  const raw = UrlFetchApp.fetch(PROVIDER_DEFAULTS.anthropic.apiUrl, options);
  const result = parseJsonResponse(raw, 'Anthropic');
  if (result.error) throw new Error(result.error.message || 'Error desconegut d\'Anthropic.');

  const text = Array.isArray(result.content)
    ? result.content
        .filter(part => part && part.type === 'text')
        .map(part => part.text || '')
        .join('\n')
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

  const raw = UrlFetchApp.fetch(PROVIDER_DEFAULTS.openai.apiUrl, options);
  const result = parseJsonResponse(raw, 'OpenAI');
  if (result.error) throw new Error(result.error.message || 'Error desconegut d\'OpenAI.');

  const firstChoice = result.choices && result.choices[0];
  const messageContent = firstChoice && firstChoice.message ? firstChoice.message.content : '';
  const text = extractContentText(messageContent);

  return normalizeLLMText(text);
}

function callGemini(messages, systemPrompt, apiKey, model, maxTokens) {
  const finalModel = model || PROVIDER_DEFAULTS.gemini.model;
  const endpoint = PROVIDER_DEFAULTS.gemini.apiUrlBase + '/' + encodeURIComponent(finalModel) + ':generateContent?key=' + encodeURIComponent(apiKey);

  const payload = {
    contents: buildGeminiContents(messages),
    generationConfig: {
      maxOutputTokens: maxTokens
    }
  };

  if (systemPrompt || SYSTEM_DEFAULT) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt || SYSTEM_DEFAULT }]
    };
  }

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const raw = UrlFetchApp.fetch(endpoint, options);
  const result = parseJsonResponse(raw, 'Gemini');
  if (result.error) {
    throw new Error((result.error.message || 'Error desconegut de Gemini.') + (result.error.status ? ' (' + result.error.status + ')' : ''));
  }

  const firstCandidate = result.candidates && result.candidates[0];
  const parts = firstCandidate && firstCandidate.content ? firstCandidate.content.parts : [];
  const text = Array.isArray(parts)
    ? parts.map(part => (part && part.text) ? part.text : '').join('\n')
    : '';

  return normalizeLLMText(text);
}

function buildOpenAIMessages(messages, systemPrompt) {
  const base = [];
  if (systemPrompt || SYSTEM_DEFAULT) {
    base.push({ role: 'system', content: systemPrompt || SYSTEM_DEFAULT });
  }

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
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item.text === 'string') return item.text;
      return '';
    }).join('\n');
  }
  if (content && typeof content.text === 'string') return content.text;
  return content ? String(content) : '';
}

function normalizeLLMText(text) {
  return (text || '').replace(/^\s+|\s+$/g, '');
}

function parseJsonResponse(rawResponse, providerName) {
  const statusCode = rawResponse.getResponseCode();
  const rawText = rawResponse.getContentText() || '';

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    throw new Error(providerName + ' ha retornat una resposta no JSON. Codi HTTP: ' + statusCode + '. Resposta: ' + rawText.slice(0, 500));
  }

  if (statusCode >= 400) {
    const message = parsed && parsed.error
      ? (parsed.error.message || JSON.stringify(parsed.error))
      : rawText.slice(0, 500);
    throw new Error(providerName + ' error HTTP ' + statusCode + ': ' + message);
  }

  return parsed;
}

const SYSTEM_DEFAULT = `Ets un escriptor expert en narrativa catalana i castellana.
Treballes en flux en cadena i proposes opcions clares, breus i seleccionables.
Respectes SEMPRE el format numèric sol·licitat i respons en català amb coherència narrativa.`;

// ─── FASE 1: Genera 10 premisses ──────────────────────────
function fase1_premisses(tematica, history, userConfig) {
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

  const msgs = [...history, userMsg];
  const response = callLLM(msgs, SYSTEM_DEFAULT, userConfig);
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 2: 10 trames / nussos narratius ──────────────────
function fase2_estructura(premissaTriada, history, userConfig) {
  const msgs = [
    ...history,
    { role: 'user', content: `He triat la premissa: "${premissaTriada}"` },
    { role: 'assistant', content: 'Perfecte. Generaré possibles trames breus a partir d'aquesta premissa.' },
    { role: 'user', content: `Genera 10 possibles trames/nussos narratius, breus i diferenciats, basats en la premissa triada.

Format ESTRICTE (res més):
1. [trama breu en 1-2 frases]
2. [trama breu en 1-2 frases]
3. [trama breu en 1-2 frases]
4. [trama breu en 1-2 frases]
5. [trama breu en 1-2 frases]
6. [trama breu en 1-2 frases]
7. [trama breu en 1-2 frases]
8. [trama breu en 1-2 frases]
9. [trama breu en 1-2 frases]
10. [trama breu en 1-2 frases]` }
  ];

  const response = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens: 1800 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 3: 10 arquetips de protagonista ──────────────────
function fase3_personatges(tramaTriada, history, userConfig) {
  const msgs = [
    ...history,
    { role: 'user', content: `He triat aquesta trama: "${tramaTriada}"` },
    { role: 'assistant', content: 'Trama fixada. Proposo possibles protagonistes per continuar el flux en cadena.' },
    { role: 'user', content: `Genera 10 possibles arquetips de protagonista coherents amb la trama triada.
Cada ítem ha de contenir: Nom + Rol + Defecte principal.

Format ESTRICTE (res més):
1. Nom: [nom] | Rol: [rol narratiu/social] | Defecte: [defecte]
2. Nom: [nom] | Rol: [rol narratiu/social] | Defecte: [defecte]
3. Nom: [nom] | Rol: [rol narratiu/social] | Defecte: [defecte]
4. Nom: [nom] | Rol: [rol narratiu/social] | Defecte: [defecte]
5. Nom: [nom] | Rol: [rol narratiu/social] | Defecte: [defecte]
6. Nom: [nom] | Rol: [rol narratiu/social] | Defecte: [defecte]
7. Nom: [nom] | Rol: [rol narratiu/social] | Defecte: [defecte]
8. Nom: [nom] | Rol: [rol narratiu/social] | Defecte: [defecte]
9. Nom: [nom] | Rol: [rol narratiu/social] | Defecte: [defecte]
10. Nom: [nom] | Rol: [rol narratiu/social] | Defecte: [defecte]` }
  ];

  const response = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens: 1800 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 4: 10 finals / desenllaços ───────────────────────
function fase4_desenllac(protagonistaTriat, history, userConfig) {
  const msgs = [
    ...history,
    { role: 'user', content: `He triat aquest protagonista: "${protagonistaTriat}"` },
    { role: 'assistant', content: 'Perfecte. Amb trama i protagonista triats, generaré possibles finals.' },
    { role: 'user', content: `Genera 10 possibles finals/desenllaços per a la història, coherents amb la trama i el protagonista triats.
Els finals han de ser diferenciats entre ells i explicats en 1-2 frases cadascun.

Format ESTRICTE (res més):
1. [final/desenllaç en 1-2 frases]
2. [final/desenllaç en 1-2 frases]
3. [final/desenllaç en 1-2 frases]
4. [final/desenllaç en 1-2 frases]
5. [final/desenllaç en 1-2 frases]
6. [final/desenllaç en 1-2 frases]
7. [final/desenllaç en 1-2 frases]
8. [final/desenllaç en 1-2 frases]
9. [final/desenllaç en 1-2 frases]
10. [final/desenllaç en 1-2 frases]` }
  ];

  const response = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens: 2000 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 5: Compila bíblia + escaleta de capítols ─────────
function fase5_compilarBiblia(desenllacTriat, history, userConfig) {
  const msgs = [
    ...history,
    { role: 'user', content: `He triat aquest desenllaç final: "${desenllacTriat}"` },
    { role: 'assistant', content: 'Ja tinc premissa, trama, protagonista i desenllaç. Compilo la bíblia narrativa.' },
    { role: 'user', content: `Compila la història completa i genera l'escaleta definitiva de capítols (entre 10 i 14 capítols), coherent amb totes les seleccions prèvies.

Format per a cada capítol:
**Capítol [N]: [Títol evocador]**
Objectiu narratiu: [1 línia]
Conflicte principal: [1 línia]
Personatges actius: [llista]
Escenari: [localització]
Ganxo final: [1 línia]
---` }
  ];

  const response = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens: 3200 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 6+: Escriptura de cada capítol (1 sola opció) ───
function fase6_escriureCapitol(numCapitol, titolCapitol, totalCapitols, history, userConfig) {
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

  const response = callLLM(msgs, SYSTEM_DEFAULT, Object.assign({}, userConfig, { maxTokens: 4000 }));
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
      num: titolMatch ? parseInt(titolMatch[1]) : null,
      titol: titolMatch ? titolMatch[2].trim() : 'Capítol',
      text: block
    };
  }).filter(c => c.num !== null);
}

// ─── Funció d'exportació a Google Doc ─────────────────────
function exportarADoc(titol, contingut) {
  const doc = DocumentApp.create(titol || 'Novel·la IA');
  const body = doc.getBody();
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

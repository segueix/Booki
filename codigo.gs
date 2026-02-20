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
  const response   = callLLM(msgs, SYSTEM_DEFAULT, userConfig);
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
      content: `Genera 5 protagonistes possibles per a aquest conte. Cada un ha de tenir veu pròpia i tensió interna que el faci memorables.

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

// ─── ESCRIPTURA: Conte complet en un sol bloc ───────────────
function escriureConte(protagonistaTriat, estilDesc, paraules, history, userConfig) {
  const paraulesNum = parseInt(paraules) || 1500;
  const msgs = [
    ...history,
    { role: 'user',      content: `He triat el protagonista: "${protagonistaTriat}".` },
    { role: 'assistant', content: 'Perfecte. Ara escric el conte complet amb màxima qualitat literària.' },
    {
      role: 'user',
      content: `Escriu el CONTE COMPLET. Extensió aproximada: ${paraulesNum} paraules. Estil: ${estilDesc}.

═══ REQUISITS DE QUALITAT MÀXIMA ═══

OBERTURA:
→ La primera frase ha de ser impossible de no llegir. Ha de plantar una pregunta o tensió immediata en la ment del lector.
→ Els primers 3 paràgrafs estableixen el to, el món i el personatge sense cap exposició directa.

ESTRUCTURA:
→ Unitat d'efecte: cada escena, diàleg i detall serveix l'impacte emocional final únic.
→ Tensió creixent sense caigudes de ritme. El lector no ha de trobar cap excusa per parar.
→ Un punt d'inflexió clar i sorprenent a les 2/3 parts del conte.

ESTIL:
→ Mostra, no expliquis. Mai "estava trist" → mostra com es comporta, com li tremola la veu, com mira el terra.
→ Detalls sensorials concrets i inesperats (olfacte, tacte, so), mai genèrics ni decoratius.
→ Ritme variat: frases curtes per a tensió i impacte; frases llargues per a immersió i atmosfera.
→ Veu narrativa única i consistent de principi a fi.
→ Diàlegs que revelen caràcter i avancen el conflicte, mai que expliquen ni informen.

FINAL:
→ L'última frase ha de ressonar, sorprendre o tancar un cercle obert al principi.
→ El desenllaç ha de ser inevitable en retrospectiva però imprevist durant la lectura.

Escriu directament el conte, sense títol, sense cap introducció ni nota de l'autor.`
    }
  ];
  // ~1.8 tokens per paraula catalana + marge de seguretat
  const maxTokens  = Math.min(Math.round(paraulesNum * 1.9) + 600, 8000);
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

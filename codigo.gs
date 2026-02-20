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

// ─── System prompt base ────────────────────────────────────
const SYSTEM_DEFAULT = `Ets un mestre del conte literari breu en català.
Apliques el principi d'unitat d'efecte de Poe: cada paraula serveix un únic impacte emocional final.
Escrius amb economia de paraules, primera frase magnètica, tensió creixent i finals memorables que ressonen.
Mai desperdicies una frase. Prioritzes mostrar sobre explicar.
Escrius EXCLUSIVAMENT en català. Mai inclous paraules, frases ni comentaris en anglès o cap altra llengua. Mai afegeixes notes meta, indicacions de número de part ni cap text fora de la narració literària. Escriu directament el text.`;

// ─── System prompt dinàmic per gènere ──────────────────────
function getSystemPrompt(tematica) {
  const isNoir    = tematica && /noir|negr[ae]|nòrdi/i.test(tematica);
  const isTolkien = tematica && /fantàstic|fantastic/i.test(tematica);

  if (isNoir) {
    return SYSTEM_DEFAULT + `

── ESTIL NORDIC NOIR (Stieg Larsson) ──
Prosa crua, directa i atmosfèrica: frases netes sense ornaments, carregades de tensió latent.
To fred i opressiu: l'entorn nòrdic (hivern, foscor, aïllament geogràfic) actua com a personatge.
Temàtiques centrals: corrupció institucional, violència sistèmica, secrets familiars soterrats, fallades de l'estat.
Procediments detallats i creïbles: investigació policial o periodística amb lògica interna sòlida.
Crítica social integrada a la trama, mai com a discurs extern o didàctic.
Protagonistes durs i traumatitzats amb una tenacitat quasi obsessiva: la ferida personal impulsa la investigació.
Estructura de revelació progressiva: el que semblava un cas puntual destapa un sistema podrit.
Ritme pausat i metòdic en la investigació, però amb pics d'acció breu i brutal.`;
  }

  if (isTolkien) {
    return SYSTEM_DEFAULT + `

── ESTIL J.R.R. TOLKIEN ──
Prosa èpica, lírica i detallada: les descripcions del paisatge i el món transmeten profunditat i antiguitat immemorial.
Univers tolkienià: situa la història a la Terra Mitjana o en un món de fantasia directament inspirat en el seu llegat. Incorpora races com els Eldar (elfs), els Khazad (nans), els hobits, els homes, els orcs, els ents o altres criatures del bestiari tolkienià. Els noms propis han de tenir la fonologia i el registre del corpus tolkienià.
Temes centrals: la corrupció del poder, el pes de la responsabilitat, la camaraderia i la lleialtat, la lluita entre la llum i les tenebres, la bellesa efímera davant el pas implacable del temps i l'oblit.
Llenguatge solemne però accessible: frases llargues i rítmiques, ús mesurat de construccions arcaiques, incorporació de cançons, rimes o fragments en llengua inventada quan l'escena ho demana.
Ambientació concreta i grandiosa: paisatges amb nom i caràcter propi (boscos immòbils, muntanyes impassibles, torres de pedra negra, planes interminables), detalls arquitectònics i culturals que evoquen civilitzacions antigues amb història pròpia.
La natura com a presència viva: arbres, rius i terres no són decorat sinó actors amb memòria, voluntat i opinió.
El mal té pes físic: no s'explica, es percep en l'aire que s'espesseix, en la llum que s'apaga, en el silenci sobtat dels ocells i la por als ulls dels animals.`;
  }

  return SYSTEM_DEFAULT;
}

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
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 4096 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 3: 5 protagonistes rics ──────────────────────────
function fase3_personatges(premissaTriada, estilDesc, history, userConfig, tematica) {
  const isNoir = tematica && /noir|negr[ae]|nòrdi/i.test(tematica);

  const protagonistePrompt = isNoir
    ? `Genera 5 protagonistes possibles per a aquest conte NEGRE NÒRDIC. Han de ser arquetips propis del gènere.

Usa exclusivament aquests tipus: detectiu/investigador traumatitzat, periodista d'investigació obstinada, hacker antisocial, advocat incorruptible en un sistema corrupte, o personatge marginal amb accés a informació perillosa.

Cada protagonista ha de tenir veu pròpia i la ferida personal que el fa avançar quan tot indica que ha de parar.`
    : `Genera 5 protagonistes possibles per a aquest conte. Cada un ha de tenir veu pròpia i tensió interna que el faci memorable.`;

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
      content: `${protagonistePrompt}

Afegeix (Recomanat) al final del protagonista que millor encaixi amb la premissa i l'estil triat.

Format ESTRICTE (5 opcions, res més):
1. **[Nom, edat]** | Desig: [el que vol conscientment] | Temor: [el que l'aterroritza o amaga] | Contradicció: [la tensió interna que el fa humà] | Veu: [tret narratiu o tic que el fa distintiu]
2. **[Nom, edat]** | Desig: [...] | Temor: [...] | Contradicció: [...] | Veu: [...]
3. **[Nom, edat]** | Desig: [...] | Temor: [...] | Contradicció: [...] | Veu: [...]
4. **[Nom, edat]** | Desig: [...] | Temor: [...] | Contradicció: [...] | Veu: [...]
5. **[Nom, edat]** | Desig: [...] | Temor: [...] | Contradicció: [...] | Veu: [...]`
    }
  ];
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 4096 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 4: 5 localitzacions ───────────────────────────────
function fase_localitzacions(protagonistaTriat, estilDesc, history, userConfig, tematica) {
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
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 4096 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 5: 5 finals possibles ─────────────────────────────
function fase4_finals(localitzacioTriada, estilDesc, history, userConfig, tematica) {
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
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 4096 }));
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
// tematica:      gènere triat (per activar estil Nordic Noir si escau)
function escriureContePart(partNum, totalParts, paraulesPerPart, finalTriat, estilDesc, history, userConfig, tematica) {
  const pp     = parseInt(paraulesPerPart) || 750;
  const isNoir = tematica && /noir|negr[ae]|nòrdi/i.test(tematica);

  // Instruccions addicionals per al Nordic Noir
  const noirExtra = isNoir
    ? `\nESTIL NORDIC NOIR OBLIGATORI per a aquesta part:
→ Descripcions minucioses i procedimentals: cada acció d'investigació s'explica amb lògica creïble.
→ Integra detalls de procediment policial, forense o periodístic de forma natural a la narració.
→ Pinzellades de crítica social concreta (noms d'institucions, mecanismes de poder) sense discurs explícit.
→ L'entorn nòrdic (fred, silenci, llum escassa) present com a pressió constant sobre els personatges.`
    : '';

  let userContent;

  if (totalParts === 1) {
    userContent =
`He triat el final: "${finalTriat}".

Escriu el CONTE COMPLET (~${pp} paraules). Estil: ${estilDesc}.
Final obligatori: "${finalTriat}"

OBERTURA: primera frase magnètica, tensió immediata. Primers 3 paràgrafs sense exposició directa.
ESTRUCTURA: unitat d'efecte, tensió creixent, punt d'inflexió a les 2/3 parts.
ESTIL: mostra no expliquis, detalls sensorials concrets, ritme variat, veu única, diàlegs que revelen caràcter.
FINAL: l'última frase ressona i tanca un cercle del principi.${noirExtra}
Escriu directament el conte en català, sense títol ni nota de l'autor. Cap paraula en anglès ni cap altra llengua.`;

  } else if (partNum === 1) {
    userContent =
`He triat el final: "${finalTriat}".

Escriu la PRIMERA PART del conte (~${pp} paraules). Estil: ${estilDesc}.

Objectiu d'aquesta part:
→ Primera frase impossible de no llegir (pregunta o tensió immediata).
→ Establir la veu, l'atmosfera i el personatge sense exposició directa.
→ Plantar la tensió central i el conflicte que s'ha de resoldre.
→ Acabar en un punt de suspens que demani la continuació (NO resolguis res).
Mostra, no expliquis. Detalls sensorials concrets. Veu única.${noirExtra}
Escriu directament en català, sense títol ni cap indicació de "Part 1". Cap paraula en anglès ni cap altra llengua.`;

  } else if (partNum < totalParts) {
    userContent =
`Continua el conte amb la PART ${partNum} (~${pp} paraules).

Objectiu d'aquesta part:
→ Augmenta el conflicte i la pressió sobre el protagonista.
→ Introdueix el punt d'inflexió o la complicació principal.
→ Acaba quan la tensió arriba al màxim, just abans de la resolució.
→ Mantén exactament la mateixa veu narrativa, to i registre de les parts anteriors.${noirExtra}
Continua directament la narració en català, des d'on s'ha aturat el text anterior. Sense cap indicació de número de part ni comentari fora de la ficció. Cap paraula en anglès ni cap altra llengua.`;

  } else {
    userContent =
`Finalitza el conte amb la PART FINAL (~${pp} paraules).

El desenllaç OBLIGATORI és: "${finalTriat}"

→ Executa el clímax i la resolució amb precisió literària.
→ El desenllaç ha de ser inevitable en retrospectiva però imprevist durant la lectura.
→ L'última frase ha de ressonar i tancar un cercle obert al principi.
→ Mantén exactament la mateixa veu narrativa i to de les parts anteriors.${noirExtra}
Continua directament la narració en català, des d'on s'ha aturat el text anterior. Sense cap indicació de número de part ni comentari fora de la ficció. Cap paraula en anglès ni cap altra llengua.`;
  }

  const msgs      = [...history, { role: 'user', content: userContent }];
  const maxTokens = Math.min(Math.round(pp * 4) + 1000, 8192);
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── MILLORA: Regenera el conte amb instrucció específica ───
function millorarConte(instruccio, conteActual, estilDesc, history, userConfig, tematica) {
  const msgs = [
    ...history,
    {
      role: 'user',
      content: `Aquí tens el conte actual:\n\n${conteActual}\n\n---\nReescriu el conte complet aplicant aquesta millora: "${instruccio}".\n\nMantén tot el que funciona bé. Millora específicament el que es demana. Mantén la mateixa extensió aproximada i l'estil: ${estilDesc}.\n\nEscriu directament el conte millorat, sense cap comentari previ.`
    }
  ];
  const maxTokens  = Math.min(Math.round(conteActual.split(' ').length * 2.5) + 600, 8000);
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 16: Millorar un capítol amb context adjacent ──────
// Igual que millorarConte però amb bíblia + últimes 300 paraules del capítol
// anterior i primeres 300 del posterior per mantenir transicions.
// capsAdjacents: {ant: string|null, post: string|null}
function millorarCapitol(numCapitol, instruccio, capitolActual, biblia, outlineCapitol, capsAdjacents, estilDesc, userConfig, tematica) {
  var systemForCap = getSystemPrompt(tematica) +
    '\n\n=== BÍBLIA DE LA NOVEL·LA ===\n' + (biblia || '');

  var contextAdj = '';
  if (capsAdjacents) {
    if (capsAdjacents.ant) {
      contextAdj += '=== FINAL DEL CAPÍTOL ANTERIOR (últimes 300 paraules, referència de continuïtat) ===\n' +
        capsAdjacents.ant + '\n\n';
    }
    if (capsAdjacents.post) {
      contextAdj += '=== INICI DEL CAPÍTOL POSTERIOR (primeres 300 paraules, referència de continuïtat) ===\n' +
        capsAdjacents.post + '\n\n';
    }
  }

  var userContent =
    '=== CAPÍTOL ' + numCapitol + ' — OUTLINE ===\n' + (outlineCapitol || '') + '\n\n' +
    contextAdj +
    '=== CAPÍTOL ACTUAL ===\n' + (capitolActual || '') + '\n\n---\n' +
    'Reescriu el capítol complet aplicant aquesta millora: "' + (instruccio || '') + '".\n\n' +
    '→ Mantén tot el que funciona bé. Millora específicament el que es demana.\n' +
    '→ Mantén la mateixa extensió aproximada i l\'estil: ' + (estilDesc || '') + '.\n' +
    '→ Assegura la coherència de transicions amb els capítols adjacents.\n' +
    '→ Escriu directament el capítol millorat en català, sense cap comentari previ ni títol.';

  var msgs      = [{ role: 'user', content: userContent }];
  var maxTokens = Math.min(Math.round((capitolActual || '').split(' ').length * 2.5) + 800, 8000);
  var response  = callLLM(msgs, systemForCap, Object.assign({}, userConfig, { maxTokens: maxTokens }));
  return { response: response };
}

// ─── FASE 7: Worldbuilding — Extracció d'elements de món ───
function fase7_worldbuilding(conteActual, tematica, estilDesc, history, userConfig) {
  const msgs = [
    ...history,
    {
      role: 'user',
      content: `Has escrit el conte següent:\n\n${conteActual}\n\n---\nAra, com a arquitecte de mons, analitza el conte i proposa 8 elements del món que es podrien expandir per convertir-lo en una novel·la. Els elements han de ser:\n\n1. Geografia — el territori i els seus llocs rellevants\n2. Política — el sistema de poder i les seves tensions\n3. Màgia/Tecnologia — el sistema màgic o tecnològic que regeix el món\n4. Religions — les creences, rituals i institucions religioses\n5. Faccions — els grups, bandes o organitzacions en conflicte\n6. Història pregressa — els esdeveniments passats que expliquen el present\n7. Economia — els recursos, el comerç i les desigualtats\n8. Cultura quotidiana — els costums, l'art, la gastronomia, les festes\n\nMarca amb "(Recomanat)" els 4 elements més rellevants per expandir basant-te en el que ja apareix al conte. Cada element: nom + descripció d'1 línia del que caldria definir.\n\nFormat ESTRICTE (res més, sense cap introducció):\n1. **Geografia** — [descripció d'1 línia] (Recomanat)\n2. **Política** — [descripció d'1 línia]\n3. **Màgia/Tecnologia** — [descripció d'1 línia] (Recomanat)\n4. **Religions** — [descripció d'1 línia]\n5. **Faccions** — [descripció d'1 línia] (Recomanat)\n6. **Història pregressa** — [descripció d'1 línia]\n7. **Economia** — [descripció d'1 línia] (Recomanat)\n8. **Cultura quotidiana** — [descripció d'1 línia]`
    }
  ];
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 2048 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 7: Worldbuilding — Expansió dels elements triats ──
function fase7_expandirElements(elementsTriats, conteActual, tematica, history, userConfig) {
  const llistaElements = elementsTriats.join('\n');
  const msgs = [
    ...history,
    {
      role: 'user',
      content: `A partir del conte i dels elements de món proposats, desenvolupa una bíblia de món per als elements seleccionats.\n\nElements a expandir:\n${llistaElements}\n\nPer a cada element, escriu una descripció de 3-5 línies que:\n- Defineixi l'element amb precisió i profunditat\n- Connecti amb el que ja apareix al conte\n- Suggereixi tensions narratives implícites\n- Sigui útil per a un escriptor que vol expandir el món\n\nFormat ESTRICTE per a cada element:\n**[Nom de l'element]**\n[descripció de 3-5 línies]\n\nSepara els elements amb una línia en blanc. Escriu exclusivament en català.`
    }
  ];
  const maxTokens  = Math.min(400 * elementsTriats.length + 800, 4096);
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 8: Elenc de personatges per a la novel·la ─────────
function fase8_elenc(conteActual, worldbuilding, tematica, estilDesc, history, userConfig) {
  const contextMon = worldbuilding
    ? `\n\nBíblia de món disponible:\n${worldbuilding}`
    : '';
  const msgs = [
    ...history,
    {
      role: 'user',
      content: `A partir del conte i del món creat, genera l'elenc de 8 personatges per a la novel·la. Inclou els personatges que ja apareixen al conte (adaptats a la seva versió novel·lística) i afegeix-ne de nous necessaris per a una trama de major abast.${contextMon}\n\nCada personatge ha de tenir:\n- Una funció clara a la trama principal o a les subtrames\n- Un desig conscient i un temor ocult que generin tensió\n- Un arc de transformació creïble (on comença → on acaba)\n- Relacions concretes amb altres personatges de l'elenc\n\nMarca amb (Recomanat) els 5 personatges més essencials per a la novel·la.\n\nFormat ESTRICTE (8 personatges, res més, sense cap introducció):\n1. **[Nom, edat]** | Rol: [funció a la trama] | Desig: [el que vol conscientment] | Temor: [el que l'aterroritza o amaga] | Arc: [on comença → on acaba] | Relacions: [amb qui i com]\n2. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Relacions: [...]\n3. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Relacions: [...]\n4. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Relacions: [...]\n5. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Relacions: [...]\n6. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Relacions: [...]\n7. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Relacions: [...]\n8. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Relacions: [...]`
    }
  ];
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 4096 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── Context compacte (reutilitzable per a Fase 9+) ─────────
// Genera un resum de ~600 paraules màxim amb tot el decidit.
// Evita enviar textos llargs bruts al LLM: comprimeix worldbuilding
// i elenc a 1 línia per element/personatge.
function comprimirContext(tematica, estilDesc, worldbuilding, elencPersonatges) {
  const parts = [];

  parts.push(`GÈNERE: ${tematica || '—'}`);
  parts.push(`ESTIL: ${estilDesc || '—'}`);

  if (elencPersonatges && elencPersonatges.length > 0) {
    parts.push('\nPERSONATGES:');
    elencPersonatges.forEach(function(p) {
      var nomM = p.match(/\*\*(.+?)\*\*/);
      var rolM = p.match(/Rol:\s*([^|]+)/);
      var arcM = p.match(/Arc:\s*([^|]+)/);
      var nom  = nomM ? nomM[1].trim() : p.substring(0, 25).trim();
      var rol  = rolM ? rolM[1].trim().substring(0, 70) : '—';
      var arc  = arcM ? arcM[1].trim().substring(0, 80) : '—';
      parts.push('• ' + nom + ' — ' + rol + ' | Arc: ' + arc);
    });
  }

  if (worldbuilding && worldbuilding.trim()) {
    parts.push('\nMÓN:');
    worldbuilding.split(/\n\n+/).filter(function(b) { return b.trim(); }).forEach(function(bloc) {
      var linies = bloc.trim().split('\n');
      var titol  = linies[0].replace(/\*\*/g, '').trim();
      var desc   = (linies[1] || '').trim().substring(0, 100);
      if (titol) parts.push('• ' + titol + (desc ? ': ' + desc : ''));
    });
  }

  return parts.join('\n');
}

// ─── FASE 9: Estructura narrativa en actes ───────────────────
function fase9_estructura(conteActual, worldbuilding, elencPersonatges, tematica, estilDesc, history, userConfig) {
  const ctx = comprimirContext(tematica, estilDesc, worldbuilding, elencPersonatges);

  const msgs = [
    ...history,
    {
      role: 'user',
      content: `Tenim definits el món i l'elenc de la novel·la. Aquí el resum:\n\n${ctx}\n\n---\nGenera 4 opcions d'estructura narrativa per a la novel·la. Cada opció ha de ser diferent en forma i filosofia (per exemple: estructura de 3 actes clàssica, estructura de 4 actes, estructura circular, estructura de trames paral·leles).\n\nPer a cada opció inclou:\n- Nom de l'estructura\n- Resum de cada acte en 2 línies: quins esdeveniments, quin personatge lidera, quin canvi es produeix\n- 2-3 punts de gir principals que articulen la tensió\n- 1 línia sobre com encaixa amb els personatges i el món definits\n\nMarca amb (Recomanat) l'opció que millor aprofiti les tensions dels personatges i el potencial del món.\n\nFormat ESTRICTE (4 opcions numerades, res més, sense cap introducció):\n1. **[Nom de l'estructura]**\nActe I: [2 línies]\nActe II: [2 línies]\nActe III: [2 línies]\nPunts de gir: [2-3 punts separats per " / "]\nEncaix: [1 línia]\n\n2. **[Nom de l'estructura]**\n...\n\n3. ...\n\n4. ... (Recomanat)`
    }
  ];
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 3000 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 10: Outline de capítols ───────────────────────────
// contextComprimit: string ja comprimida pel frontend (sense cost extra)
function fase10_outline(contextComprimit, estructuraTriada, history, userConfig, tematica) {
  const msgs = [
    ...history,
    {
      role: 'user',
      content: `Tenim definits el món, els personatges i l'estructura de la novel·la:\n\n${contextComprimit}\n\nESTRUCTURA TRIADA:\n${estructuraTriada}\n\n---\nGenera l'outline complet de capítols de la novel·la. El nombre de capítols ha d'estar entre 12 i 25, ajustat a la complexitat de l'estructura triada.\n\nCada capítol en una sola línia, format ESTRICTE:\nCap. N — [Títol breu] | POV: [Nom] | [Objectiu narratiu en 10 paraules màxim] | Descobriment: [Què sap el lector de nou al final del capítol]\n\nEl conjunt ha de:\n- Cobrir tots els actes de l'estructura triada de manera proporcional\n- Distribuir els POVs estratègicament entre els personatges de l'elenc\n- Mantenir tensió creixent amb punts de gir als capítols clau\n- Cada capítol ha de tenir un objectiu narratiu clar i diferent dels altres\n\nFormat ESTRICTE (res més, sense introducció ni resum final):\nCap. 1 — [Títol] | POV: [Nom] | [Objectiu 10 paraules] | Descobriment: [text breu]\nCap. 2 — [Títol] | POV: [Nom] | [Objectiu 10 paraules] | Descobriment: [text breu]\n...`
    }
  ];
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 4096 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 13: Compilar bíblia de consistència (sense LLM) ───
// dades: objecte amb tots els camps acumulats de l'ESTAT frontend.
// Objectiu: document de ~800-1200 paraules que serà el context
// injectat a cada crida de generació de capítol.
function fase13_compilarBiblia(dades) {
  var d = dades || {};
  var seccions = [];

  // PREMISSA
  seccions.push('## PREMISSA\n' + (d.premissa || '—'));

  // ESTIL
  seccions.push('## ESTIL\n' + (d.estilDesc || '—') + '\nGènere: ' + (d.tematica || '—'));

  // MÓN
  if (d.worldbuilding && d.worldbuilding.trim()) {
    var monLines = [];
    d.worldbuilding.split(/\n\n+/).filter(function(b) { return b.trim(); }).forEach(function(bloc) {
      var linies = bloc.trim().split('\n');
      var titol  = linies[0].replace(/\*\*/g, '').trim();
      var desc   = (linies[1] || '').trim().substring(0, 120);
      if (titol) monLines.push('• ' + titol + (desc ? ': ' + desc : ''));
    });
    seccions.push('## MÓN\n' + monLines.join('\n'));
  }

  // PERSONATGES
  if (d.elencPersonatges && d.elencPersonatges.length > 0) {
    var persList = d.elencPersonatges.map(function(p) {
      var nomM = p.match(/\*\*(.+?)\*\*/);
      var arcM = p.match(/Arc:\s*([^|]+)/);
      var relM = p.match(/Relacions:\s*(.+)/);
      var nom  = nomM ? nomM[1].trim() : p.substring(0, 25).trim();
      var arc  = arcM ? arcM[1].trim().substring(0, 100) : '—';
      var rel  = relM ? relM[1].trim().substring(0, 80) : '';
      return '• ' + nom + ' — Arc: ' + arc + (rel ? ' | Rel: ' + rel : '');
    });
    seccions.push('## PERSONATGES\n' + persList.join('\n'));
  }

  // ESTRUCTURA
  if (d.estructuraTriada && d.estructuraTriada.trim()) {
    var estructLines = d.estructuraTriada.trim().split('\n').slice(0, 10).join('\n');
    seccions.push('## ESTRUCTURA\n' + estructLines);
  }

  // OUTLINE
  if (d.outline && d.outline.length > 0) {
    var outLines = d.outline.map(function(c) {
      return 'Cap. ' + c.num + ' — ' + (c.text || '').substring(0, 110);
    });
    seccions.push('## OUTLINE\n' + outLines.join('\n'));
  }

  // SUBTRAMES
  if (d.subtrames && d.subtrames.length > 0) {
    var subLines = d.subtrames.map(function(s) {
      return '• ' + s.replace(/\*\*/g, '').substring(0, 130);
    });
    seccions.push('## SUBTRAMES\n' + subLines.join('\n'));
  }

  // CRONOLOGIA (primeres 10 entrades comprimides)
  if (d.cronologia && d.cronologia.trim()) {
    var cronoLines = d.cronologia.trim().split('\n')
      .filter(function(l) { return /^(Dia\/moment\s+\d+|\d+)\s*[—\-]/i.test(l.trim()); })
      .slice(0, 10)
      .map(function(l) {
        var parts = l.split(/\s+[—\-]\s+/);
        // Mantenir: temps — esdeveniment — capítols (eliminar personatges si hi ha 4 segments)
        return parts.length >= 4
          ? parts[0] + ' — ' + parts[1] + ' — ' + parts[3]
          : l.substring(0, 140);
      });
    seccions.push('## CRONOLOGIA\n' + cronoLines.join('\n'));
  }

  // VOCABULARI: noms propis del conte original (heurística per regex)
  if (d.conteText && d.conteText.trim()) {
    var paraules = d.conteText.match(/\b[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜ][a-záéíóúàèìòùäëïöü]{2,}\b/g) || [];
    var excloses = /^(Els?|Les?|Una?|Uns?|Tot|Però|Quan|Com|Qui|Que|Per|Del?|Als?|Era|Ser|Fou|Havia|Molt|Cada|Aquell?|Aquesta?|Aquí|Entre|Fins|Sobre|Encara|Sempre|Ara|Ja|Tant|Sense|Amb|Cap|Des|Mai|Seus?|Seves?|Nostre|Vostre|Davant|Dintre|Mentre|Després|Abans|Sense|Sense)$/i;
    var vistos   = {};
    var unics    = paraules.filter(function(w) {
      if (excloses.test(w) || vistos[w]) return false;
      vistos[w] = true;
      return true;
    }).slice(0, 30);
    if (unics.length > 0) seccions.push('## VOCABULARI\n' + unics.join(', '));
  }

  return seccions.join('\n\n');
}

// ─── FASE 13: Context per a la generació d'un capítol ────────
// Assembla la bíblia completa + detall del capítol actual +
// les darreres ~500 paraules del capítol anterior.
// No crida LLM; retorna un string de context per a callLLM.
function fase13_bibliaPerCapitol(biblia, outlineDetallat, numCapitol, textCapAnterior) {
  var context = '=== BÍBLIA DE LA NOVEL·LA ===\n' + (biblia || '') + '\n\n';
  context += '=== CAPÍTOL A ESCRIURE: ' + numCapitol + ' ===\n' + (outlineDetallat || '') + '\n\n';
  if (textCapAnterior && textCapAnterior.trim()) {
    var paraules = textCapAnterior.trim().split(/\s+/);
    var darreres = paraules.slice(-500).join(' ');
    context += '=== FINAL DEL CAPÍTOL ANTERIOR (per continuïtat de to) ===\n' + darreres;
  }
  return context;
}

// ─── FASE 17: Elements paratextuals ─────────────────────────
// Una sola crida: 5 títols, divisió en parts (si >15 caps),
// epígraf i sinopsi de contraportada (~100 paraules).
// outline: array de {num, text, titol} per a cada capítol.
function fase17_paratextos(biblia, outline, tematica, userConfig) {
  var caps  = outline || [];
  var total = caps.length;

  var outlineResumen = caps.map(function(cap) {
    var titol = (cap.titol || cap.text || '').split('|')[0].trim().substring(0, 80);
    return 'Cap. ' + (cap.num || '?') + ' — ' + titol;
  }).join('\n');

  var divisioInstr = total > 15
    ? '\n## DIVISIÓ EN PARTS\nProposa una divisió en 2-4 parts o llibres. Per a cada part: nom evocador i rang de capítols.\n'
    : '';
  var divisioHeader = total > 15 ? ', ## DIVISIÓ EN PARTS' : '';

  var msgs = [{
    role: 'user',
    content:
      '=== BÍBLIA (resum) ===\n' + (biblia || '').substring(0, 1500) + '\n\n' +
      '=== OUTLINE (' + total + ' capítols) ===\n' + outlineResumen + '\n\n---\n' +
      'Genera els elements paratextuals per a aquesta novel·la.\n\n' +
      '## TÍTOLS\n' +
      'Proposa 5 títols originals, evocadors i comercialment atractius. Marca el més potent amb (Recomanat).\n' +
      'Format: 1. [títol]\n2. [títol]\n... un per línia.\n' +
      divisioInstr +
      '\n## EPÍGRAF\n' +
      'Epígraf breu (màxim 3 línies) que capturi l\'essència de la novel·la. Pot ser una cita real o atribuïble a un autor/obra fictícia. Inclou l\'atribució.\n\n' +
      '## SINOPSI\n' +
      'Sinopsi de contraportada (~100 paraules). Presenta el protagonista i el conflicte central, crea intriga, no revela el final. To engrescador i directe.\n\n' +
      'IMPORTANT: Respon ÚNICAMENT en català. Respecta l\'ordre i els encapçalaments exactes: ## TÍTOLS' + divisioHeader + ', ## EPÍGRAF, ## SINOPSI. Sense cap altra secció ni comentari.'
  }];

  var response = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 2500 }));
  return { response: response };
}

// ─── System prompt d'Editor IA (reutilitzable) ──────────────
const EDITOR_SYSTEM = `Ets un editor literari expert i minuciós. La teva tasca és analitzar textos narratius i identificar problemes de coherència interna: contradiccions factuals, canvis de to injustificats, fils narratius abandonats i inconsistències de personatges.
Respons exclusivament en català. No alibies el text. Identifica problemes reals i proposa correccions concretes i accionables. Si no trobes cap problema, digues-ho clarament.`;

// ─── Funció genèrica d'anàlisi amb l'Editor IA ──────────────
// Infraestructura reutilitzable: missatges mínims, sense historial de conversa.
function analitzarAmbEditor(userPrompt, userConfig) {
  var msgs = [{ role: 'user', content: userPrompt }];
  return callLLM(msgs, EDITOR_SYSTEM, Object.assign({}, userConfig, { maxTokens: 3000 }));
}

// ─── FASE 15: Revisió de coherència inter-capítols ───────────
// capitolsData: array de {num, outlineText, text} per als capítols generats.
// biblia:       string (bíblia de consistència compilada).
// userConfig:   configuració del LLM de l'usuari.
function fase15_revisioCoherencia(capitolsData, biblia, userConfig) {
  var d = capitolsData || [];

  // Comprimir cada capítol: primeres i últimes 200 paraules + outline
  var resumCapitols = d.map(function(cap) {
    var words     = (cap.text || '').trim().split(/\s+/).filter(function(w) { return w; });
    var primer200 = words.slice(0, 200).join(' ');
    var ultim200  = words.length > 200 ? '\n[…]\n' + words.slice(-200).join(' ') : '';
    return '=== CAPÍTOL ' + cap.num + ' ===\n' +
      'OUTLINE: ' + (cap.outlineText || '').substring(0, 160) + '\n' +
      'INICI:\n' + primer200 + ultim200;
  }).join('\n\n');

  var bibliaRef = biblia
    ? '=== BÍBLIA DE REFERÈNCIA ===\n' + biblia.substring(0, 1200) + '\n\n'
    : '';

  var userPrompt =
    bibliaRef + resumCapitols + '\n\n---\n' +
    'Analitza la coherència dels ' + d.length + ' capítols anteriors. Identifica:\n' +
    '1. Contradiccions factuals (noms, dates, llocs, fets que canvien)\n' +
    '2. Canvis de to o veu narrativa injustificats\n' +
    '3. Fils narratius o detalls plantats que han quedat abandonats\n' +
    '4. Inconsistències de personatges (comportament, coneixements, relacions)\n\n' +
    'Per cada problema, proposa una correcció específica al capítol corresponent.\n\n' +
    'Format ESTRICTE per a cada problema (sense cap variació):\n' +
    'PROBLEMA: [descripció clara i breu]\n' +
    'CORRECCIÓ: [Cap. N] [instrucció concreta i directa per a la millora]\n\n' +
    'Si no trobes cap problema real, escriu únicament: "Cap inconsistència detectada."\n' +
    'Cap comentari addicional fora d\'aquest format.';

  var response = analitzarAmbEditor(userPrompt, userConfig);
  return { response: response };
}

// ─── FASE 14: Escriure un capítol (patró anti-timeout, 2 parts) ──
// partNum:      1 (primera meitat) o 2 (segona meitat)
// historialPart: null per Part 1; historial retornat per Part 1 per a Part 2
function escriureCapitol(partNum, numCapitol, totalCapitols, biblia, outlineCapitol, textCapAnterior, estilDesc, userConfig, tematica, historialPart) {
  var systemForCap = getSystemPrompt(tematica) +
    '\n\n=== BÍBLIA DE LA NOVEL·LA ===\n' + (biblia || '');

  var contextAnterior = '';
  if (textCapAnterior && textCapAnterior.trim()) {
    var words    = textCapAnterior.trim().split(/\s+/);
    var darreres = words.slice(-500).join(' ');
    contextAnterior = '\n\n=== FINAL DEL CAPÍTOL ANTERIOR (per continuïtat de to) ===\n' + darreres;
  }

  var isNoir    = tematica && /noir|negr[ae]|nòrdi/i.test(tematica);
  var noirExtra = isNoir
    ? '\n→ Aplica l\'estil Nordic Noir: prosa crua, procediments detallats, crítica social integrada, entorn nòrdic opressiu.'
    : '';

  if (partNum === 1) {
    var part1Content =
      '=== CAPÍTOL ' + numCapitol + ' DE ' + totalCapitols + ' ===\n' +
      (outlineCapitol || '') + contextAnterior + '\n\n' +
      'Escriu la PRIMERA MEITAT d\'aquest capítol (~1500 paraules). Estil: ' + (estilDesc || '') + '.\n' +
      '→ Comença directament la narració, sense títol ni encapçalament.\n' +
      '→ Estableix l\'atmosfera i el conflicte central del capítol.\n' +
      '→ Planta la tensió creixent fins a un punt d\'inflexió.\n' +
      '→ Acaba en tensió màxima: talla quan la situació sigui més crítica, sense resoldre res.' + noirExtra + '\n' +
      'Escriu directament en català. Cap paraula en anglès. Cap comentari fora de la narració literària.';

    var msgs1      = [{ role: 'user', content: part1Content }];
    var resp1      = callLLM(msgs1, systemForCap, Object.assign({}, userConfig, { maxTokens: 6000 }));
    var newHistory = msgs1.concat([{ role: 'assistant', content: resp1 }]);
    return { response: resp1, history: newHistory };

  } else {
    var histBase     = Array.isArray(historialPart) ? historialPart : [];
    var objectiuBreu = (outlineCapitol || '').split('\n')[0].substring(0, 120);
    var part2Content =
      'Continua i finalitza el capítol amb la SEGONA MEITAT (~1500 paraules).\n' +
      '→ Recull la tensió de la primera meitat i desenvolupa-la fins a la resolució del capítol.\n' +
      '→ Objectiu del capítol: ' + objectiuBreu + '\n' +
      '→ Assegura que s\'ha complert l\'objectiu narratiu al final.\n' +
      '→ Mantén exactament la mateixa veu, to i registre de la primera meitat.\n' +
      '→ L\'última frase ha de deixar el lector amb ganes de continuar.' + noirExtra + '\n' +
      'Continua directament en català des d\'on s\'ha aturat. Cap paraula en anglès. Cap comentari fora de la narració literària.';

    var msgs2 = histBase.concat([{ role: 'user', content: part2Content }]);
    var resp2  = callLLM(msgs2, systemForCap, Object.assign({}, userConfig, { maxTokens: 6000 }));
    return { response: resp2 };
  }
}

// ─── FASE 12: Cronologia ─────────────────────────────────────
function fase12_cronologia(contextComprimit, outline, subtrames, history, userConfig, tematica) {
  const subtramesText = subtrames && subtrames.length > 0
    ? '\n\nSUBTRAMES ACTIVES:\n' + subtrames.join('\n')
    : '';
  const msgs = [
    ...history,
    {
      role: 'user',
      content: `Tenim definit el món, els personatges, l'outline i les subtrames de la novel·la:\n\n${contextComprimit}${subtramesText}\n\nOUTLINE (capítols):\n${outline}\n\n---\nGenera la línia temporal completa de la novel·la. Ha de cobrir TOTS els capítols de l'outline, integrant la trama principal i les subtrames actives.\n\nCada entrada ha de correspondre a un moment o dia narratiu concret, agrupant els capítols que transcorren en el mateix temps. Indica on es troba cada personatge principal i quin és l'esdeveniment clau.\n\nFormat ESTRICTE (una entrada per línia, res més, sense introducció):\nDia/moment 1 — [Esdeveniment clau] — [On és cada personatge principal] — Cap. N-M\nDia/moment 2 — [Esdeveniment clau] — [On és cada personatge principal] — Cap. N\n...`
    }
  ];
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 4096 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 11: Subtrames i fils temàtics ─────────────────────
// outline: string compacte "Cap. N — Títol" per línia (sense POV ni detalls)
function fase11_subtrames(contextComprimit, outline, history, userConfig, tematica) {
  const msgs = [
    ...history,
    {
      role: 'user',
      content: `Tenim definit el món, els personatges i l'outline de la novel·la:\n\n${contextComprimit}\n\nOUTLINE (capítols):\n${outline}\n\n---\nGenera entre 5 i 7 subtrames per a la novel·la. Cada subtrama ha de:\n- Tenir vida pròpia independent de la trama principal\n- Estar ancorada a capítols concrets de l'outline (inici, complicació i resolució)\n- Associar-se a un fil temàtic de la novel·la (amor, traïció, identitat, poder, etc.)\n- Involucrar personatges de l'elenc que no siguin sempre el protagonista\n\nMarca amb (Recomanat) les 3 o 4 subtrames més necessàries per enriquir la novel·la.\n\nFormat ESTRICTE (una subtrama per línia, res més, sense introducció):\n1. **[Nom de la subtrama]** | Inici: Cap. N | Complicació: Cap. N | Resolució: Cap. N | Tema: [fil temàtic associat]\n2. **[Nom de la subtrama]** | Inici: Cap. N | Complicació: Cap. N | Resolució: Cap. N | Tema: [fil temàtic associat]\n3. ...\n4. ...\n5. ...\n6. ... (Recomanat)\n7. ...`
    }
  ];
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 2048 }));
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

// ─── Export novel·la completa a Google Doc (format novel·la) ──
function exportarNovela(titol, epigraf, sinopsi, divisioEnParts, outline, capitols) {
  const doc  = DocumentApp.create(titol || 'Novel·la');
  const body = doc.getBody();
  body.clear();

  // ── Portada ───────────────────────────────────────────────
  const titolPar = body.appendParagraph(titol || 'Novel·la');
  titolPar.setHeading(DocumentApp.ParagraphHeading.TITLE);
  titolPar.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  const autorPar = body.appendParagraph('Generat amb Conte IA');
  autorPar.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  autorPar.editAsText().setItalic(true);
  autorPar.setSpacingAfter(24);

  // ── Epígraf ───────────────────────────────────────────────
  if (epigraf && epigraf.trim()) {
    body.appendParagraph('');
    epigraf.trim().split('\n').forEach(function(line) {
      const ep = body.appendParagraph(line || ' ');
      ep.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      ep.editAsText().setItalic(true);
    });
    body.appendParagraph('');
  }

  // ── Parsear divisió en parts ──────────────────────────────
  // Format esperat: cada línia és una part, indicant rang de capítols
  // Exemples: "Part I: El principi — Capítols 1–5"  "Llibre 1 (caps. 1-4)"
  const capParts = {}; // capNum (1-based) -> partTitle
  if (divisioEnParts && divisioEnParts.trim()) {
    divisioEnParts.trim().split('\n').filter(function(l) { return l.trim(); })
      .forEach(function(line) {
        const m = line.match(/\b(\d+)\s*[-–—]\s*(\d+)\b/);
        if (m) {
          const partTitle = line.split(/[:\-–—(]/)[0].trim();
          for (var c = parseInt(m[1]); c <= parseInt(m[2]); c++) {
            capParts[c] = partTitle;
          }
        }
      });
  }

  // ── Índex ─────────────────────────────────────────────────
  body.appendParagraph('');
  const idxH = body.appendParagraph('Índex');
  idxH.setHeading(DocumentApp.ParagraphHeading.HEADING1);

  var lastPartIdx = null;
  outline.forEach(function(cap, i) {
    if (!capitols[i]) return;
    const capNum    = i + 1;
    const partTitle = capParts[capNum];
    if (partTitle && partTitle !== lastPartIdx) {
      lastPartIdx = partTitle;
      const pLine = body.appendParagraph(partTitle);
      pLine.setIndentStart(0);
      pLine.setBold(true);
    }
    const titolCap = ((cap.titol || cap.text || '').split('|')[0].trim()) || ('Capítol ' + capNum);
    const idxLine  = body.appendParagraph('Capítol ' + capNum + ': ' + titolCap);
    idxLine.setIndentStart(14.17); // ~0.5cm
  });

  // ── Capítols ──────────────────────────────────────────────
  var lastPartCap = null;
  outline.forEach(function(cap, i) {
    const text = capitols[i];
    if (!text) return;

    const capNum    = i + 1;
    const partTitle = capParts[capNum];

    body.appendParagraph('');

    // Encapçalament de part (Heading 1) si canvia
    if (partTitle && partTitle !== lastPartCap) {
      lastPartCap = partTitle;
      const partH = body.appendParagraph(partTitle);
      partH.setHeading(DocumentApp.ParagraphHeading.HEADING1);
      partH.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      body.appendParagraph('');
    }

    // Encapçalament del capítol (Heading 2)
    const titolCap = ((cap.titol || cap.text || '').split('|')[0].trim()) || ('Capítol ' + capNum);
    const capH = body.appendParagraph('Capítol ' + capNum + ': ' + titolCap);
    capH.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('');

    // Text literari: interlineat 1.5, sagnat primera línia
    text.split(/\n\n+/).filter(function(p) { return p.trim().length > 0; })
      .forEach(function(par, pi) {
        const p = body.appendParagraph(par.trim());
        p.setLineSpacing(1.5);
        if (pi > 0) p.setIndentFirstLine(28.35); // ~1cm
      });
  });

  // ── Sinopsi al final ──────────────────────────────────────
  if (sinopsi && sinopsi.trim()) {
    body.appendParagraph('');
    const sinH = body.appendParagraph('Sinopsi');
    sinH.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    const sinP = body.appendParagraph(sinopsi.trim());
    sinP.editAsText().setItalic(true);
    sinP.setLineSpacing(1.5);
  }

  // ── Desar i obtenir URL ────────────────────────────────────
  const docId = doc.getId();
  doc.saveAndClose();
  const docUrl = 'https://docs.google.com/document/d/' + docId + '/edit';

  // ── Exportar DOCX ─────────────────────────────────────────
  var docxUrl = null;
  try {
    const blob = DriveApp.getFileById(docId).getAs(MimeType.MICROSOFT_WORD);
    blob.setName((titol || 'Novel·la') + '.docx');
    const docxFile = DriveApp.createFile(blob);
    docxFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    docxUrl = docxFile.getDownloadUrl();
  } catch (e) {
    // DOCX export no disponible en aquest entorn
    docxUrl = null;
  }

  return { docUrl: docUrl, docxUrl: docxUrl };
}

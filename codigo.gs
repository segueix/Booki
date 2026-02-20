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

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Traduccia — Revisió de Traduccions amb IA')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function revisarCapitol(original, traduccio, model, apiKey, proveidor, glossari) {
  var prompt = 'Ets un traductor professional expert. A continuació tens el text original i la seva traducció.\n\n';
  
  if (glossari && glossari.trim() !== '') {
    prompt += 'GLOSSARI DE CONSISTÈNCIA (usa sempre aquests noms i termes):\n' + glossari + '\n\n';
  }
  
  prompt += 'Revisa la traducció i retorna-la corregida íntegrament.\n';
  prompt += '- Corregeix errors de traducció, gramàtica, estil i coherència.\n';
  prompt += '- Manté la consistència dels noms propis segons el glossari.\n';
  prompt += '- NO afegeixis comentaris ni explicacions.\n';
  prompt += '- Retorna NOMÉS el text traduït corregit, complet, sense omissions.\n\n';
  prompt += '=== TEXT ORIGINAL ===\n' + original + '\n\n';
  prompt += '=== TRADUCCIÓ A REVISAR ===\n' + traduccio + '\n\n';
  prompt += '=== TRADUCCIÓ CORREGIDA ===\n';
  
  if (proveidor === 'anthropic') {
    return cridaAnthropic(prompt, model, apiKey);
  } else {
    return cridaOpenAI(prompt, model, apiKey);
  }
}

function generarGlossari(original, traduccio, model, apiKey, proveidor) {
  var prompt = 'Analitza els següents textos (original i traducció) i genera un glossari en format de llista amb:\n';
  prompt += '1. PERSONATGES: Nom original → Nom en la traducció\n';
  prompt += '2. LLOCS: Nom original → Nom en la traducció\n';
  prompt += '3. TERMES RECURRENTS: Terme original → Traducció consistent\n\n';
  prompt += 'Retorna NOMÉS el glossari en format estructurat, sense explicacions addicionals.\n\n';
  prompt += '=== TEXT ORIGINAL ===\n' + original + '\n\n';
  prompt += '=== TRADUCCIÓ ===\n' + traduccio + '\n';
  
  if (proveidor === 'anthropic') {
    return cridaAnthropic(prompt, model, apiKey);
  } else {
    return cridaOpenAI(prompt, model, apiKey);
  }
}

function cridaOpenAI(prompt, model, apiKey) {
  var url = 'https://api.openai.com/v1/chat/completions';
  var payload = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'Ets un traductor i corrector professional. Segueix les instruccions exactament.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 16000,
    temperature: 0.3
  };
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    if (json.error) {
      throw new Error(json.error.message);
    }
    return json.choices[0].message.content;
  } catch (e) {
    throw new Error('Error API OpenAI: ' + e.message);
  }
}

function cridaAnthropic(prompt, model, apiKey) {
  var url = 'https://api.anthropic.com/v1/messages';
  var payload = {
    model: model,
    max_tokens: 16000,
    system: 'Ets un traductor i corrector professional. Segueix les instruccions exactament.',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    if (json.error) {
      throw new Error(json.error.message);
    }
    return json.content[0].text;
  } catch (e) {
    throw new Error('Error API Anthropic: ' + e.message);
  }
}

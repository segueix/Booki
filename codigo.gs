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

const DIALOGUE_FORMAT_RULES = [
  'FORMAT DE DIÀLEG (OBLIGATORI): diferencia visualment narració i conversa.',
  'Cada intervenció de diàleg ha d\'anar en un paràgraf propi.',
  'En català literari, fes servir la ratlla de diàleg (—) i no cometes per marcar la parla directa.',
  'Mantén acotacions i pensaments integrats amb naturalitat, però sense barrejar llargues rèpliques dins del mateix bloc narratiu.'
].join('\n');

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Conte IA — Creador de contes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ═══════════════════════════════════════════════════════════════
// PERFILS D'AUTOR — Condicionen TOTES les fases del pipeline
// ═══════════════════════════════════════════════════════════════

var PERFILS_AUTOR = {

  // ─────────────────────────────────────────────────────────
  // STIEG LARSSON
  // ─────────────────────────────────────────────────────────
  'larsson': {
    nom: 'Stieg Larsson',
    etiqueta: 'Stieg Larsson — Millennium',

    estructura: {
      tipusOutline: 'dual_convergent',
      descripcio: 'Dues línies narratives paral·leles (investigador + hacker/infiltrat) que convergeixen al punt mig. Primer acte inusualment llarg (~30% del total) dedicat a establir context social, institucional i burocràtic abans que el misteri arrenqui.',
      distribucioActes: {
        acte1_percentatge: 30,
        acte1_instruccio: 'Establiment lent i deliberat. Context social, institucional, burocràtic. Presentar dos mons separats (el de l\'investigador i el del segon protagonista). No hi ha misteri encara — hi ha normalitat amb tensions latents. El lector ha de sentir la maquinària social sueca/escandinava com un personatge més.',
        acte2_percentatge: 45,
        acte2_instruccio: 'Les dues línies narratives comencen a entrellaçar-se. La investigació avança amb setmanes de treball documental, entrevistes, callejons sense sortida. Cada descobriment obre tres preguntes noves. La violència, quan apareix, és sobtada, breu i amb conseqüències reals — mai coreografiada.',
        acte3_percentatge: 25,
        acte3_instruccio: 'Convergència total de les dues línies. L\'investigador i el segon protagonista treballen junts (o en contra). Les revelacions cauen en cascada. El poder sistèmic es fa visible. Resolució que deixa fils oberts per a continuació — el sistema no cau, s\'exposa.'
      },
      numFilsNarratius: 2,
      instruccioFils: 'Genera DOS fils narratius separats amb protagonistes propis. Fil A: investigador (periodista, policia, advocat) amb accés al poder oficial. Fil B: outsider (hacker, immigrant, activista) amb accés al poder ocult. Cada fil ha de tenir 3-4 escenes pròpies abans del primer encreuament. Marca al outline on convergeixen.',
      midpoint: 'Les dues línies convergeixen per primera vegada. El protagonista A descobreix que el protagonista B existeix, o viceversa. Això canvia la naturalesa de la investigació — el que semblava un cas local es revela com a sistèmic.',
      numCapitolsRecomanat: '18-24'
    },

    antagonisme: {
      tipus: 'sistemic',
      instruccio: 'L\'antagonista NO és una persona — és una XARXA de poder. Crea un sistema antagonista format per: (1) un rostre visible amb càrrec institucional que sembla respectable, (2) un operador a l\'ombra que fa la feina bruta, (3) almenys un còmplice involuntari o atemorit dins del sistema. Cap d\'ells es veu a si mateix com a "dolent". El rostre visible creu que protegeix l\'ordre social. L\'operador creu que segueix ordres legítimes. El còmplice té por de perdre-ho tot.',
      complexitat: 'Cada antagonista necessita: una escena on mostri afecte genuí per algú (família, amic), una decisió on dubti, i una justificació interna que el lector pugui entendre (no compartir). L\'antagonista col·lectiu ha de funcionar com un organisme — quan cau una peça, les altres compensen.',
      prohibicions: 'PROHIBIT: antagonistes amb motivació purament econòmica o per sadisme. PROHIBIT: escenes on l\'antagonista expliqui el seu pla a un presoner. PROHIBIT: antagonistes que actuïn de forma irracional per facilitar que el protagonista guanyi.'
    },

    protagonista: {
      arquetipus: 'investigador_obsessiu',
      instruccio: 'El protagonista és competent professionalment però disfuncional personalment. Té un codi ètic rigid que l\'aïlla socialment. No és un heroi: és algú que no pot deixar de tirar del fil encara que sap que hauria de parar. La seva motivació principal no és la justícia abstracta — és una compulsió personal (trauma, culpa, necessitat de control). Té defectes reals: addiccions funcionals, incapacitat de mantenir relacions, tendència a creuar límits ètics "pel bé major".',
      arcNarratiu: 'Comença amb un fracàs recent o una pèrdua que l\'ha debilitat. La investigació el reactiva però també l\'exposa. Al punt mig, ha de decidir entre la seguretat personal i la veritat. Al final, guanya parcialment — exposa la xarxa però paga un preu personal alt.',
      veuNarrativa: 'Tercera persona, focalització alternant entre els dos protagonistes. To sec, observacional, amb digressions sobre procediments i burocràcia que revelen el sistema social. Emoció continguda — mai sentimentalisme.'
    },

    clausura: {
      tipus: 'exposicio_parcial',
      instruccio: 'El sistema antagonista s\'exposa PARCIALMENT. Alguns culpables cauen, d\'altres sobreviuen. L\'article/informe/testimoni del protagonista és publicat però l\'impacte real és incert. El protagonista ha pagat un preu personal (relació trencada, salut, posició professional). El món no és significativament millor — el lector sap que la xarxa es reconstruirà.',
      ultimaFrase: 'L\'última frase ha de ser quotidiana, gairebé banal — un gest ordinari que contrasta amb tot el que ha passat. La vida continua, el sistema continua, el protagonista continua. Sense grandiositat.',
      prohibicions: 'PROHIBIT: final feliç convencional. PROHIBIT: justícia poètica. PROHIBIT: monòleg interior reflexiu del protagonista sobre "el que ha après". PROHIBIT: epíleg que expliqui què va passar després amb cada personatge.'
    },

    estil: {
      systemPrompt: 'Ets un escriptor en l\'estil de Stieg Larsson: prosa funcional, seca, sense ornamentació. Les frases són curtes quan descriuen accions, llargues quan descriuen sistemes burocràtics o institucionals. El detall tècnic (informàtic, financer, legal, periodístic) és precís i integrat — mai explicat al lector com a classe magistral. Les descripcions físiques dels personatges inclouen sempre què mengen, què beuen i com vesteixen — són indicadors de classe social, no decoració. El sexe, quan apareix, és directe i sense romanticisme. La violència és sobtada, bruta, amb conseqüències físiques reals (dolor, recuperació, seqüeles). L\'humor és inexistent o extremadament sec — mai còmic. Escrius EXCLUSIVAMENT en català. Mai inclous paraules, frases ni comentaris en anglès o cap altra llengua. Mai afegeixes notes meta, indicacions de número de part ni cap text fora de la narració literària. Escriu directament el text.',
      registre: 'Neutre-fred. Registre periodístic amb incrustacions de vocabulari tècnic específic del camp de la investigació. Cap adjectiu supèrflu. Les metàfores, si n\'hi ha, són mecàniques o urbanes — mai naturals ni líriques.',
      ritme: 'Alternança entre escenes llargues de treball (investigació, documentació, hacking) i escenes curtes d\'impacte (descobriment, violència, revelació). Les escenes de treball són detallades i procedimentals — el lector ha de sentir el pes del temps que la investigació requereix.',
      dialeg: 'Funcional, sovint tècnic. Els personatges parlen per comunicar informació, no per expressar emocions. Quan hi ha emoció, es manifesta per l\'absència: frases tallades, canvis de tema, silencis. Cap personatge fa discursos. Les converses professionals són realistes — amb interrupcions, malentesos, reformulacions.'
    },

    antipatrons: [
      'PROHIBIT repetir la mateixa metàfora (fred/formigó/vidre/foscor/glaç) més de 2 vegades per capítol. Usa alternatives sensorials variades: sons mecànics, olors urbanes, textures de paper/plàstic, llum artificial.',
      'PROHIBIT que els personatges articulin en veu alta allò que senten. Diàlegs oblics amb subtext — el lector dedueix l\'emoció per accions i omissions.',
      'PROHIBIT tancar capítols amb la mateixa estructura sintàctica. Cada tancament ha de tenir un recurs retòric diferent.',
      'PROHIBIT sentimentalisme. Cap personatge plora, s\'abraça emocionalment, o té revelacions emocionals. Les emocions són indicades per conductes: beure més, dormir menys, cancel·lar cites.',
      'PROHIBIT acció coreografiada. La violència és caòtica, ràpida, desorientadora — mai estilitzada.',
      'PROHIBIT explicar motivacions dels antagonistes directament. Que es revelin per les seves decisions i contradiccions.',
      'Màxim 2 termes tècnics per paràgraf, integrats amb naturalitat.'
    ]
  },

  // ─────────────────────────────────────────────────────────
  // J.R.R. TOLKIEN
  // ─────────────────────────────────────────────────────────
  'tolkien': {
    nom: 'J.R.R. Tolkien',
    etiqueta: 'J.R.R. Tolkien — Alta Fantasia Èpica',

    estructura: {
      tipusOutline: 'interlace_multigrupo',
      descripcio: 'Entrellaçament (interlace) de múltiples grups de personatges separats geogràficament. Capítols que alternen entre grups. La tensió no puja linealment sinó en onades paral·leles que convergeixen al clímax. Inici deliberat i domèstic que contrasta amb l\'escala èpica posterior.',
      distribucioActes: {
        acte1_percentatge: 25,
        acte1_instruccio: 'Inici domèstic i íntim. Presenta el món ordinari dels protagonistes amb calidesa i detall sensorial (menjar, paisatge, estacions). La crida a l\'aventura arriba com una irrupció del món gran en el món petit. El protagonista és reticent. Hi ha un consell o reunió on s\'exposa l\'amenaça i es forma el grup.',
        acte2_percentatge: 50,
        acte2_instruccio: 'El grup es divideix en 2-3 subgrups amb missions complementàries. Cada subgrup afronta perills i aliats propis. Alterna capítols entre subgrups per crear tensió paral·lela. El paisatge canvia radicalment amb cada subgrup — bosc, muntanya, plana, ciutat, subterrani. Inclou almenys una derrota significativa i una aliança inesperada per subgrup.',
        acte3_percentatge: 25,
        acte3_instruccio: 'Convergència dels fils. Gran batalla o confrontació on cada subgrup aporta el que ha aconseguit. Victòria que és alhora triomf i pèrdua — el món es salva però mai tornarà a ser el que era. Retorn a casa transformat: el protagonista ha canviat però el món petit segueix igual.'
      },
      numFilsNarratius: 3,
      instruccioFils: 'Genera 3 fils narratius separats geogràficament: Fil A (missió principal — el portador/heroi), Fil B (missió militar/política — el guerrer/rei), Fil C (missió secundària amb impacte inesperat — el savi/explorador). Marca al outline els capítols de cada fil i els punts exactes de convergència i separació.',
      midpoint: 'Derrota o pèrdua major que divideix el grup. La missió sembla impossible. Cada subgrup rep informació parcial que només tindrà sentit quan convergeixi.',
      numCapitolsRecomanat: '20-28'
    },

    antagonisme: {
      tipus: 'cosmic_amb_agents',
      instruccio: 'Antagonista dual: una Força Fosca distant i abstracta (mai visible directament) i els seus Agents tangibles. La Força és antiga, pacient, i corromp més que destrueix. Els Agents són: (1) un general/senyor de la guerra amb un codi d\'honor distorsionat, (2) un traïdor que va ser amic/aliat i va ser corromput per desig de poder o por, (3) criatures/exèrcits que són víctimes tant com amenaces — races senceres esclavitzades o corrompudes.',
      complexitat: 'El traïdor ha de tenir una escena de dubte genuí — un moment on el lector vegi la persona que era abans de la caiguda. El general ha de mostrar respecte per un enemic o compassió per un subordinat. Les criatures antagonistes han de tenir cultura pròpia, no ser massa indiferenciada.',
      prohibicions: 'PROHIBIT: antagonistes que siguin malvats per ser malvats sense cap matís. PROHIBIT: el Senyor Fosc apareix i parla com un supervilà de pel·lícula. PROHIBIT: la corrupció de la Força és instantània — sempre és gradual i seductora. PROHIBIT: races senceres categòricament malvades sense excepció.'
    },

    protagonista: {
      arquetipus: 'el_petit_que_porta_la_carrega',
      instruccio: 'El protagonista principal no és el més fort ni el més savi — és el més ordinari. La seva força ve de la bondat quotidiana, la lleialtat i una resistència moral que ningú esperava. No vol ser heroi. No entén del tot la magnitud del que fa. Té un company lleial que és tan important com ell. Els personatges guerrers i savis són impressionants però fal·libles — la seva grandesa inclou errors de judici i orgull.',
      arcNarratiu: 'El protagonista petit comença amb por però avança per deure. Al punt mig, el pes de la missió el trenca parcialment — dubta, es cansa, sent la temptació de rendir-se. Al clímax, fa l\'últim esforç no per heroisme sinó perquè no pot viure amb si mateix si no ho fa. Al final, la victòria el marca permanentment — ja no encaixa al món petit.',
      veuNarrativa: 'Tercera persona omniscient amb modulació de registre per escena. Registre elevat per a reis i elfs (frases llargues, vocabulari arcaic, ritme solemne). Registre col·loquial per a hobbits/gent petita (frases curtes, humor, queixes sobre menjar). Registre dur i pragmàtic per a nans/guerrers. El narrador té veu pròpia: erudita, amb pauses reflexives i digressions sobre la història del món.'
    },

    clausura: {
      tipus: 'victoria_elegiaca',
      instruccio: 'La victòria es guanya amb un preu irreversible. El món es salva però una era acaba — alguna cosa bella i antiga desapareix per sempre. El protagonista torna a casa transformat i descobreix que ja no hi encaixa. El retorn ocupa almenys un capítol sencer — no és epíleg, és part essencial de la història.',
      ultimaFrase: 'L\'última frase ha de ser íntima i domèstica — un retorn al món petit. Però amb una nota de melangia: el protagonista sap que el que ha vist i perdut no es pot compartir.',
      prohibicions: 'PROHIBIT: final purament triomfant sense cost. PROHIBIT: discurs motivacional del protagonista. PROHIBIT: que tots els personatges sobrevisquin. PROHIBIT: resolució que invalidi el sacrifici — si algú es va sacrificar, no pot ressuscitar.'
    },

    estil: {
      systemPrompt: 'Ets un escriptor en l\'estil de J.R.R. Tolkien: prosa rica, musical, amb atenció extrema al paisatge com a reflex de l\'estat emocional i moral de l\'escena. Les descripcions de la natura no són decoració — són narració. Un bosc pot ser amenaçador, protector o trist. Les muntanyes tenen personalitat. Les estacions marquen el to. La prosa alterna entre registres: elevat per a moments solemnes (consells, juraments, batalles), quotidià per a moments íntims (àpats, bromes, cançons). Les cançons i poemes integrats són part de la cultura dels personatges — cada poble té el seu estil líric. El mal no es descriu amb adjectius sinó amb efectes: silenci dels ocells, foscor que pesa, fred que puja des de la terra. Escrius EXCLUSIVAMENT en català. Mai inclous paraules, frases ni comentaris en anglès o cap altra llengua. Mai afegeixes notes meta, indicacions de número de part ni cap text fora de la narració literària. Escriu directament el text.',
      registre: 'Multiregistre. Adaptat a la cultura del focus narratiu. Registre alt per a escenes cerimonials i discursos. Registre mitjà per a aventura i viatge. Registre baix i càlid per a escenes domèstiques. El vocabulari ha de ser ric però precís — cada paraula triada per la seva sonoritat.',
      ritme: 'Onades llargues. Capítols de viatge amb ritme contemplatiu que accelera sobtadament en perill. Escenes de batalla curtes i confuses (no coreografiades). Escenes de descans i àpat detallades i reconfortants — el lector ha de desitjar ser-hi.',
      dialeg: 'Cada cultura parla diferent. Els elfs: frases llargues, elegants, amb dolor contingut. Els nans: directes, orgullosos, amb humor sec. La gent petita: col·loquials, queixosos, afectuosos. Els reis: formals, amb pes de responsabilitat a cada paraula. Cap personatge parla com un altre — la veu és identitat cultural.'
    },

    antipatrons: [
      'PROHIBIT abusar de "les tenebres" o "la foscor" com a recurs. Varia: silenci dels ocells, pes de l\'aire, fred que puja, canvi de llum, olor de descomposició.',
      'PROHIBIT que els personatges parlin tots en el mateix registre. Cada poble/cultura té ritme, vocabulari i longitud de frase propis.',
      'PROHIBIT descriure el mal amb adjectius ("terrible", "malèfic", "fosc"). Mostra\'l amb efectes físics concrets sobre l\'entorn i els personatges.',
      'PROHIBIT batalles llargues coreografiades cop a cop. Les batalles són caos: confusió, por, instants de valor, desorientació.',
      'PROHIBIT paisatges decoratius. Cada descripció de paisatge ha de comunicar informació narrativa o emocional — si la pots eliminar sense perdre res, no hi ha de ser.',
      'PROHIBIT que el protagonista petit parli com un rei o un savi. Ha de mantenir el registre ordinari fins i tot en moments èpics.',
      'PROHIBIT introduir races o pobles com a monolit cultural. Fins i tot dins d\'un grup, hi ha variació individual.'
    ]
  },

  // ─────────────────────────────────────────────────────────
  // PHILIP K. DICK
  // ─────────────────────────────────────────────────────────
  'dick': {
    nom: 'Philip K. Dick',
    etiqueta: 'Philip K. Dick — Ciència-ficció ontològica',

    estructura: {
      tipusOutline: 'degradacio_progressiva',
      descripcio: 'Estructura de degradació ontològica: la realitat es trenca per capes. Els primers capítols estableixen una normalitat aparent, i progressivament s\'introdueixen dubtes que s\'acumulen fins que ni el protagonista ni el lector poden distingir què és real.',
      distribucioActes: {
        acte1_percentatge: 25,
        acte1_instruccio: 'NORMALITAT APARENT. Presenta un món futurista o alternatiu que funciona amb regles clares. El protagonista és una persona corrent amb una feina, rutines, relacions. Tot sembla coherent. Introdueix UN detall que no encaixa — petit, gairebé imperceptible, que el protagonista descarta. El lector atent el nota.',
        acte2_percentatge: 50,
        acte2_instruccio: 'DEGRADACIÓ ACUMULATIVA. Segueix el calendari de degradació: primer, un segon detall estrany amb explicació racional plausible però no del tot satisfactòria. Després, les anomalies s\'acceleren — algú sap alguna cosa que no hauria de saber, un objecte canvia, un record no quadra. Primer trencament ontològic: una certesa fonamental cau. Reconstrucció provisional: el protagonista construeix una nova interpretació. Falsa estabilitat.',
        acte3_percentatge: 25,
        acte3_instruccio: 'COL·LAPSE I AMBIGÜITAT. La nova interpretació també cau. El protagonista és forçat a actuar sense saber què és real. La decisió final és moral, no epistemològica: actua basant-se en valors (compassió, dignitat, amor) perquè no pot basar-se en fets. El final NO resol l\'ambigüitat — el lector ha de decidir per si mateix.'
      },
      numFilsNarratius: 1,
      instruccioFils: 'UN sol fil narratiu centrat en el protagonista. La fragmentació ve de DINS, no d\'alternar entre personatges. Genera un CALENDARI DE DEGRADACIÓ explícit a l\'outline: en quin capítol es trenca cada certesa, en quin es reconstrueix provisionalment, en quin cau definitivament.',
      midpoint: 'PRIMERA RUPTURA ONTOLÒGICA. El protagonista descobreix que alguna cosa fonamental del seu món (identitat, memòria, naturalesa de la realitat, relacions) no és el que creia. Però la veritat que descobreix podria ser una altra capa d\'il·lusió.',
      numCapitolsRecomanat: '14-20'
    },

    antagonisme: {
      tipus: 'ontologic_ambigu',
      instruccio: 'L\'antagonista és AMBIGU per naturalesa: pot ser una corporació, un sistema, una entitat, o la pròpia ment del protagonista. El lector mai ha d\'estar segur de qui o què és realment l\'enemic. Crea: (1) una figura d\'autoritat que controla informació i que pot ser protectora o manipuladora — el lector no ho sap, (2) un sistema (corporatiu, governamental, tecnològic) que funciona amb lògica pròpia amoralment, (3) la possibilitat que el protagonista sigui el seu propi antagonista.',
      complexitat: 'La figura d\'autoritat ha de fer almenys una cosa genuïnament bona i una de genuïnament inquietant. El lector ha de poder construir dues interpretacions vàlides: una on és aliat i una on és enemic. El sistema no és malvat — és indiferent, i la indiferència és pitjor.',
      prohibicions: 'PROHIBIT: corporació/govern que és purament malvat amb plans de dominació. PROHIBIT: "plot twist" on es revela que el protagonista estava boig i tot era imaginació. PROHIBIT: explicació final que tanqui totes les ambigüitats. PROHIBIT: aliens o IA com a villains convencionals.'
    },

    protagonista: {
      arquetipus: 'persona_corrent_atrapada',
      instruccio: 'El protagonista és una persona absolutament ordinària: treballador, amb problemes quotidians (factures, relacions, salut), sense habilitats especials. No és especialment intel·ligent, valent ni carismàtic. El que el fa protagonista és que no pot deixar de qüestionar — és honestament incòmode amb les inconsistències quan tothom al seu voltant les accepta.',
      arcNarratiu: 'Comença amb rutina gris. Un detall el desestabilitza. Investiga per necessitat, no per heroisme. A mesura que la realitat es degrada, ha de decidir en què creure. Al final, la seva humanitat (empatia, amor, dignitat) és l\'única brúixola que funciona quan els fets fallen.',
      veuNarrativa: 'Tercera persona propera, quasi primera persona. Accés constant als pensaments del protagonista — fluxe de consciència funcional, no experimental. To neuròtic, amb digressions sobre preocupacions mundanes enmig de crisis existencials. Humor negre involuntari: el protagonista pensa en la hipoteca mentre el món s\'ensorra.'
    },

    clausura: {
      tipus: 'ambiguitat_deliberada',
      instruccio: 'El final NO resol l\'ambigüitat central. El protagonista pren una decisió basada en valors humans (compassió, amor, dignitat) perquè no pot basar-se en fets. El lector ha de poder construir almenys DUES interpretacions coherents del que ha passat. Una pista final — un detall, un objecte, una frase — pot inclinar cap a una interpretació, però mai confirmar-la.',
      ultimaFrase: 'L\'última frase ha de ser un detall concret i petit — un objecte, un gest, una sensació física — que reverberi amb significat ambigu. El lector ha de quedar-se pensant.',
      prohibicions: 'PROHIBIT: resolució clara de què era real i què no. PROHIBIT: "era tot un somni/simulació" com a revelació final. PROHIBIT: el protagonista "entén" finalment la veritat. PROHIBIT: epíleg explicatiu. PROHIBIT: final feliç o final completament desolador.'
    },

    estil: {
      systemPrompt: 'Ets un escriptor en l\'estil de Philip K. Dick: prosa directa, nerviosa, amb un punt de ciència-ficció quotidiana. La tecnologia futurista es presenta com a banal — els personatges la usen com nosaltres usem el mòbil, sense fascinar-se\'n. Les descripcions de l\'entorn reflecteixen l\'estat mental del protagonista: quan dubta, l\'entorn es torna inestable (detalls que canvien, colors que no quadren, sons que no haurien de ser-hi). Barreja registres: diàleg col·loquial, monòleg interior neuròtic, descripcions tècniques fredes. El futurisme és decadent: la tecnologia és avançada però l\'entorn humà és depriment (pisos petits, menjar processat, relacions fallides). La sensació dominant és la d\'estar lleugerament fora de fase amb la realitat. Escrius EXCLUSIVAMENT en català. Mai inclous paraules, frases ni comentaris en anglès o cap altra llengua. Mai afegeixes notes meta, indicacions de número de part ni cap text fora de la narració literària. Escriu directament el text.',
      registre: 'Col·loquial-neuròtic. El protagonista pensa en registre quotidià — preocupacions mundanes barrejades amb crisis ontològiques. El diàleg és naturalista, ple de frases a mitges i malentesos. Les escenes tècniques o institucionals tenen un registre burocràtic kafkià.',
      ritme: 'Irregular. Escenes quotidianes llargues interrompudes per moments breus d\'estranyesa. Quan la degradació s\'accelera, el ritme es fragmenta: paràgrafs més curts, frases tallades, salt entre pensament i percepció. Al clímax, el ritme pot tornar-se lent i precís — calma inquietant.',
      dialeg: 'Naturalista amb un punt d\'estranyesa. La gent parla com parla la gent real: interromp, canvia de tema, no escolta. Però de tant en tant, algú diu alguna cosa que sona "programada" o "guionitzada" — com si no fos del tot humà. El protagonista nota aquestes dissonàncies, els altres personatges no.'
    },

    antipatrons: [
      'PROHIBIT explicar la tecnologia amb infodumps. La tecnologia és mundana — es mostra usant-se, no explicant-se.',
      'PROHIBIT que les anomalies siguin espectaculars. Han de ser subtils, inquietants, quotidianes: un gat que era d\'un altre color, un carrer que ha canviat de nom, una persona que recorda una conversa diferent.',
      'PROHIBIT que el protagonista sigui un heroi d\'acció. Quan hi ha perill físic, el protagonista reacciona com una persona normal: amb por, torpesa, fugida.',
      'PROHIBIT resoldre l\'ambigüitat. Si el lector pot dir amb certesa "ah, era X", has fallat.',
      'PROHIBIT paranoia cinematogràfica (persecucions, conspiracions amb "homes de negre"). La paranoia és quotidiana: mirades, frases ambigües, documents que desapareixen, records que no coincideixen.',
      'PROHIBIT que els personatges secundaris siguin funcionals. Cada personatge té les seves pròpies preocupacions mundanes — no existeixen per servir la trama del protagonista.',
      'PROHIBIT futorisme brillant. La tecnologia del futur és tan grisa com la del present.'
    ]
  },

  // ─────────────────────────────────────────────────────────
  // CARLOS CASTANEDA
  // ─────────────────────────────────────────────────────────
  'castaneda': {
    nom: 'Carlos Castaneda',
    etiqueta: 'Carlos Castaneda — Itinerari iniciàtic',

    estructura: {
      tipusOutline: 'cicles_iniciatics',
      descripcio: 'Estructura cíclica d\'aprenentatge, no actes clàssics. Cada cicle: ensenyament → rebuig → experiència transformadora → integració parcial. Cada cicle opera a un nivell de profunditat major. L\'estructura és espiral: els mateixos temes tornen però el protagonista els viu diferent.',
      distribucioActes: {
        acte1_percentatge: 20,
        acte1_instruccio: 'TROBADA. El narrador-protagonista (escèptic, racional, occidental) troba el Mestre per circumstàncies aparentment casuals. El Mestre és excèntric, contradictori, desconcertant — pot semblar un farsant. El narrador observa amb distància irònica. El Mestre proposa un primer exercici o prova que el narrador descarta com a absurd — fins que alguna cosa inexplicable passa. El narrador racionalitza l\'experiència però queda enganxat.',
        acte2_percentatge: 60,
        acte2_instruccio: 'CICLES D\'APRENENTATGE (4-6 cicles). Cadascun: (1) ENSENYAMENT: concepte presentat amb paradoxes, humor i provocació; (2) RESISTÈNCIA: narrador racionalitza, discuteix, fracassa; (3) EXPERIÈNCIA: experiència directa que obliga a experimentar el que no es podia entendre; (4) INTEGRACIÓ PARCIAL: comprensió d\'un grau. Acumulatius: cada experiència és més profunda que l\'anterior.',
        acte3_percentatge: 20,
        acte3_instruccio: 'SALT. El narrador afronta una experiència definitiva que no pot racionalitzar ni integrar parcialment. Ha de triar: tornar al món racional (segur però mutilat) o acceptar una manera de ser al món radicalment diferent (terrificant però viva). El Mestre no l\'ajuda en aquesta decisió. El final és OBERT.'
      },
      numFilsNarratius: 1,
      instruccioFils: 'UN sol fil narratiu: el narrador i el Mestre. Genera l\'outline com a SEQÜÈNCIA DE CICLES, no com a actes. Cada cicle és una unitat amb ensenyament, resistència, experiència i integració. El calendari d\'experiències ha de progressar en intensitat.',
      midpoint: 'El narrador té la primera experiència que no pot racionalitzar DE CAP MANERA. No és una anomalia que pot explicar — és una ruptura de la seva cosmovisió. El narrador SENT la realitat de l\'experiència però la seva ment no l\'accepta.',
      numCapitolsRecomanat: '16-22'
    },

    antagonisme: {
      tipus: 'intern_epistemologic',
      instruccio: 'NO hi ha antagonista extern. El conflicte és entre el narrador racional i l\'experiència directa. L\'antagonista és la pròpia ment del narrador: el seu escepticisme, la seva necessitat de control, la seva por a l\'inconegut. Pot haver-hi figures secundàries de perill (altres bruixots amb intencions ambigües, forces naturals o sobrenaturals), però no són "enemics" — són proves o miralls. El Mestre mateix és sovint l\'obstacle més gran: frustrant, contradictori, deliberadament provocador.',
      complexitat: 'El Mestre no és un guru benèvol. Pot ser manipulador, dur, humorístic en moments inapropiats, aparentment cruel. El narrador ha de dubtar genuïnament de si el Mestre és un savi o un farsant — i el lector també.',
      prohibicions: 'PROHIBIT: villains convencionals. PROHIBIT: el Mestre és sempre savi i bondadós — ha de ser desconcertant i moralment ambigu. PROHIBIT: forces sobrenaturals que funcionen com a enemics de videojoc. PROHIBIT: el narrador venç l\'antagonista — no hi ha res a vèncer, hi ha quelcom a comprendre.'
    },

    protagonista: {
      arquetipus: 'aprenent_resistent',
      instruccio: 'El protagonista-narrador és intel·lectual, escèptic, occidental, racional. Pren notes, analitza, classifica. Vol entendre el Mestre amb categories acadèmiques — i fracassa repetidament. La seva força és la seva honesta perplexitat: no fingeix entendre el que no entén. La seva debilitat és la seva resistència al canvi perceptiu — s\'aferra a la racionalitat com a salvavides.',
      arcNarratiu: 'Comença com a observador extern. Gradualment es converteix en participant. Cada cicle el mou d\'escèptic passiu a experimentador actiu. Al final, la seva racionalitat no ha desaparegut — s\'ha expandit per incloure el que abans rebutjava.',
      veuNarrativa: 'Primera persona reflexiva. El narrador escriu des del futur sobre experiències passades — per tant sap més del que sabia al moment, però no ho revela tot. To confessional, intel·lectual, amb moments d\'estupefacció genuïna. Alterna entre anàlisi racional (paràgrafs discursius) i descripció fenomenològica (sensacions, percepcions, sinestèsies).'
    },

    clausura: {
      tipus: 'obertura_transformativa',
      instruccio: 'El final és una porta, no un tancament. El narrador ha canviat irreversiblement — la seva percepció del real s\'ha ampliat — però el viatge continua. No hi ha "resposta" al misteri. El Mestre pot desaparèixer, morir, o simplement dir "ja no em necessites" — amb ambigüitat sobre si és un comiat definitiu o un nou ensenyament.',
      ultimaFrase: 'L\'última frase ha de capturar un instant de percepció expandida — el narrador veu, sent o entén alguna cosa que al principi del llibre hauria descartat. Però ho diu amb naturalitat, sense grandiositat. Com si fos el més normal del món.',
      prohibicions: 'PROHIBIT: el narrador assoleix la il·luminació total. PROHIBIT: el Mestre revela un "secret final" que ho explica tot. PROHIBIT: tornada a la normalitat com si res no hagués passat. PROHIBIT: moralitat explícita sobre què ha après el narrador.'
    },

    estil: {
      systemPrompt: 'Ets un escriptor en l\'estil de Carlos Castaneda: prosa que alterna entre el discursiu-analític (el narrador pensant, classificant, racionalitzant) i el fenomenològic-sensorial (el narrador experimentant estats alterats de consciència amb detall sinestèsic extraordinari). El paisatge és el desert o medi àrid: llum excessiva, silenci, immensitat, plantes amb presència pròpia. Els diàlegs amb el Mestre són el motor: el Mestre parla amb paradoxes, humor, provocació — mai en línia recta. El to general és de meravella reluctant: el narrador s\'impressiona però no vol admetre-ho. Les experiències no-ordinàries es descriuen amb precisió clínica i detall sensorial extrem — colors, textures, sons, sensacions corporals que no tenen equivalent en l\'experiència quotidiana. Escrius EXCLUSIVAMENT en català. Mai inclous paraules, frases ni comentaris en anglès o cap altra llengua. Mai afegeixes notes meta, indicacions de número de part ni cap text fora de la narració literària. Escriu directament el text.',
      registre: 'Dual. Registre analític-acadèmic quan el narrador reflexiona (vocabulari d\'antropologia, psicologia, filosofia occidental). Registre sensorial-poètic quan el narrador experimenta (sinestèsies, percepcions impossibles descrites amb precisió). El Mestre parla en registre col·loquial amb profunditat oculta — frases senzilles amb doble o triple sentit.',
      ritme: 'Cicles llargs. Cada cicle comença lent (diàleg, reflexió, observació) i accelera cap a l\'experiència culminant. L\'experiència es descriu amb ritme alterat: frases molt curtes per a sensacions físiques, paràgrafs llargs i sinuosos per a percepcions expandides. Després de l\'experiència, el ritme torna a ser analític i pausat.',
      dialeg: 'El Mestre: parla amb frases curtes, inesperables, sovint desconcertants. Mai respon directament una pregunta — la reformula, la contradiu, o riu. Usa històries curtes (paràboles) en comptes d\'explicacions. El narrador: fa preguntes de professor, vol definicions, classificacions, causes i efectes. El xoc entre els dos estils de conversa ÉS el motor del llibre.'
    },

    antipatrons: [
      'PROHIBIT que el Mestre parli com un guru de xarxes socials: frases inspiracionals, positives, motivacionals. El Mestre és abrupte, humorístic i sovint enigmàtic.',
      'PROHIBIT descriure experiències no-ordinàries amb termes vagues ("va sentir una energia", "va veure una llum"). Detall sensorial EXTREM: quin color, quina textura, quina temperatura, quin so, quina posició del cos.',
      'PROHIBIT racionalitzar les experiències amb explicacions científiques. El narrador pot intentar-ho, però l\'explicació ha de fallar davant l\'experiència.',
      'PROHIBIT que el narrador accepti els ensenyaments fàcilment. Ha de resistir, discutir, dubtar — genuïnament, no com a pose.',
      'PROHIBIT misticisme genèric: cristalls, "energia universal", vocabulari esotèric buit. El coneixement del Mestre és específic, concret, pràctic — mai abstracte.',
      'PROHIBIT narrar les experiències com a al·lucinacions: han de tenir coherència interna i lògica pròpia, encara que no sigui lògica racional.',
      'PROHIBIT paisatges genèrics. El desert és un personatge: la llum a les 6 del matí és diferent de la de les 3 de la tarda. Les plantes tenen presència. El vent comunica.'
    ]
  }
};

// ─── Funció helper per obtenir el perfil actiu ───────────────
function getPerfilAutor(tematica) {
  var clau = (tematica || '').toLowerCase().trim();
  var mapa = {
    'larsson': 'larsson',
    'stieg larsson': 'larsson',
    'nordic noir': 'larsson',
    'noir': 'larsson',
    'millennium': 'larsson',
    'tolkien': 'tolkien',
    'jrr tolkien': 'tolkien',
    'fantasia': 'tolkien',
    'epica': 'tolkien',
    'dick': 'dick',
    'philip k dick': 'dick',
    'pkd': 'dick',
    'ciencia-ficcio': 'dick',
    'scifi': 'dick',
    'castaneda': 'castaneda',
    'carlos castaneda': 'castaneda',
    'inicatic': 'castaneda',
    'xamanisme': 'castaneda'
  };
  var clauPerfil = mapa[clau] || null;
  return clauPerfil ? PERFILS_AUTOR[clauPerfil] : null;
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
Escrius EXCLUSIVAMENT en català. Mai inclous paraules, frases ni comentaris en anglès o cap altra llengua. Mai afegeixes notes meta, indicacions de número de part ni cap text fora de la narració literària. Escriu directament el text.

RESTRICCIONS GENERALS:
→ No repeteixis la mateixa metàfora o comparació més de 2 vegades en tot el text.
→ Diàlegs oblics: els personatges mai diuen literalment el que senten. Mostren-ho amb accions, silencis i subtextos.
→ Cada tancament de secció o capítol ha d'usar un recurs retòric diferent. Mai repeteixis l'estructura de clausura.`;

// ─── System prompt dinàmic per perfil d'autor ───────────────
function getSystemPrompt(tematica) {
  var perfil = getPerfilAutor(tematica);
  if (perfil) {
    var antipatrons = '\n\nRESTRICCIONS ESTILÍSTIQUES OBLIGATÒRIES:\n' +
      perfil.antipatrons.map(function(a) { return '→ ' + a; }).join('\n');
    return perfil.estil.systemPrompt + antipatrons;
  }
  return SYSTEM_DEFAULT;
}

// ─── Context d'ambientació catalana ──────────────────────────
// Retorna el bloc de text que s'injecta als prompts quan l'ambientació
// és 'catalana' o 'catalana_medieval'. Retorna '' per a 'universal'.
function construirContextAmbientacio(ambientacio, tematica) {
  if (!ambientacio || ambientacio === 'universal') return '';

  if (ambientacio === 'catalana') {
    return '\n\n=== AMBIENTACIÓ CATALANA OBLIGATÒRIA ===\n' +
      'Totes les premisses, personatges, localitzacions i trames han d\'estar situades explícitament als Països Catalans.\n' +
      'TOPÒNIMS: Usa noms reals de ciutats, pobles, comarques, barris, muntanyes, rius, cales, masies. ' +
      'Exemples: Barcelona (Raval, Gràcia, Poblenou), Girona, Vic, Manresa, Tarragona, Lleida, Perpinyà, Palma, ' +
      'València, Alacant, Tortosa, la Seu d\'Urgell, Montserrat, els Pirineus, el Delta de l\'Ebre, la Costa Brava, ' +
      'el Montseny, les Terres de l\'Ebre, l\'Empordà, el Priorat, la Garrotxa.\n' +
      'CULTURA: Integra referents culturals catalans amb naturalitat: castells/castellers, festes majors, ' +
      'correfocs, sardanes, calçotades, pa amb tomàquet, verema, tramuntana, mestral, xarxa ferroviària Rodalies, ' +
      'mossos d\'esquadra, institucions catalanes. Mai com a catàleg turístic — com a part orgànica de la vida dels personatges.\n' +
      'PAISATGE: El paisatge català és un personatge: la llum del Mediterrani, la boira del Pla de l\'Estany, ' +
      'la tramuntana de l\'Empordà, els camps de vinyes del Penedès, la humitat del Delta, la neu del Pirineu, ' +
      'la pedra seca de les Garrigues, els penya-segats de la Costa Brava.\n' +
      'NOMS: Usa noms catalans: Arnau, Núria, Oriol, Montse, Laia, Jordi, Mercè, Pau, Carla, Biel, Martí, Blanca, Pere, Marta.\n' +
      'LLENGUA: Integra expressions i girs catalans naturals (no forçats): "vés a saber", "au va", "prou", "apa", "escolta", "sisplau".';
  }

  if (ambientacio === 'catalana_medieval') {
    return '\n\n=== AMBIENTACIÓ MEDIEVAL CATALANA OBLIGATÒRIA ===\n' +
      'Totes les premisses, personatges i trames han d\'estar situades a la Corona d\'Aragó medieval (segles X-XV).\n' +
      'TOPÒNIMS I GEOGRAFIA: Usa noms històrics reals: Barcelona, Girona, Perpinyà, Lleida, Tortosa, ' +
      'València, Mallorca, Montpeller, Saragossa, Nàpols, Sicília, Atenes, Constantinoble (per a expansió mediterrània). ' +
      'Monestirs: Poblet, Santes Creus, Ripoll, Montserrat. Castells: Miravet, Cardona, Besalú, Peníscola.\n' +
      'CONTEXT HISTÒRIC: Corona d\'Aragó com a potència mediterrània. Integra amb naturalitat: ' +
      'el Consell de Cent, les Corts catalanes, els consolats de mar, els gremis, els almogàvers, ' +
      'la conquesta de Mallorca/València/Sicília, les disputes amb Castella i França, ' +
      'les jueries i calls jueus, la Inquisició, el comerç tèxtil i d\'espècies, ' +
      'Ramon Llull i la filosofia, Joanot Martorell i la literatura cavalleresca, ' +
      'Ausiàs March i la poesia, les drassanes i la construcció naval.\n' +
      'CLASSES SOCIALS: Noblesa feudal (comtes, vescomtes, barons), orde del Temple, mercaders del Consolat de Mar, ' +
      'artesans dels gremis, pagesos de remença, jueus dels calls, clergat regular i secular, almogàvers.\n' +
      'NOMS: Usa noms medievals catalans: Arnau, Bernat, Guillem, Ramon, Pere, Jaume, Berenguer, Galceran, ' +
      'Blanca, Sibil·la, Violant, Elisenda, Constança, Agnès, Almodis.\n' +
      'REGISTRE: Català contemporani però amb color medieval: vocabulari feudal (feu, vassall, host, alou), ' +
      'marítim (galera, nau, galeassa, rumb), religiós (vescomte, abat, prior, canonge). ' +
      'NO escriguis en català arcaic — el registre ha de ser llegible per un lector actual, ' +
      'però amb sabor d\'època.\n' +
      'Si el gènere és FANTÀSTIC: pots afegir elements fantàstics (màgia, criatures, profecies) ' +
      'PERÒ el marc ha de ser recognosciblement la Corona d\'Aragó. La màgia pot beure de Ramon Llull, ' +
      'l\'alquímia, la càbala dels calls jueus, les tradicions àrabs heretades, la bruxeria pirinenca. ' +
      'Les criatures poden ser del folklore català: dones d\'aigua, minairons, dips, bruixes del Canigó, ' +
      'dracs, barretines encantades.';
  }

  return '';
}

// ─── FASE 1: 10 premisses per a contes ─────────────────────
function fase1_premisses(tematica, history, userConfig, ambientacio) {
  history = history || [];
  var contextAmbientacio = construirContextAmbientacio(ambientacio, tematica);
  const userMsg = {
    role: 'user',
    content: 'Genera 10 premisses originals per a contes breus del gènere: **' + tematica + '**.' +
      contextAmbientacio + '\n\n' +
      `Cada premissa ha de:
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
function fase3_personatges(premissaTriada, estilDesc, history, userConfig, tematica, ambientacio) {
  const isNoir = tematica && /noir|negr[ae]|nòrdi/i.test(tematica);
  var contextAmbientacio = construirContextAmbientacio(ambientacio, tematica);

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
      content: protagonistePrompt + contextAmbientacio + `

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
function fase_localitzacions(protagonistaTriat, estilDesc, history, userConfig, tematica, ambientacio) {
  var contextAmbientacio = construirContextAmbientacio(ambientacio, tematica);
  const msgs = [
    ...history,
    { role: 'user',      content: `He triat el protagonista: "${protagonistaTriat}".` },
    { role: 'assistant', content: "Perfecte. Proposo localitzacions que maximitzin el potencial narratiu de la premissa i el protagonista." },
    {
      role: 'user',
      content: 'Genera 5 localitzacions possibles per a aquest conte, coherents amb el gènere, l\'estil i el protagonista triat.' +
        contextAmbientacio + `

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
function fase4_finals(localitzacioTriada, estilDesc, history, userConfig, tematica, ambientacio) {
  var contextAmbientacio = construirContextAmbientacio(ambientacio, tematica);
  const msgs = [
    ...history,
    { role: 'user',      content: `He triat la localització: "${localitzacioTriada}".` },
    { role: 'assistant', content: 'Perfecte. Amb totes les decisions preses, proposo possibles finals per al conte.' },
    {
      role: 'user',
      content: 'Genera 5 finals possibles per a aquest conte, coherents amb la premissa, l\'estil i el protagonista triats.' +
        contextAmbientacio + `

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
function escriureContePart(partNum, totalParts, paraulesPerPart, finalTriat, estilDesc, history, userConfig, tematica, ambientacio) {
  const pp     = parseInt(paraulesPerPart) || 750;
  const isNoir = tematica && /noir|negr[ae]|nòrdi/i.test(tematica);
  var contextAmbientacio = construirContextAmbientacio(ambientacio, tematica);

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
FINAL: l'última frase ressona i tanca un cercle del principi.${noirExtra}` + contextAmbientacio + `
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
    '\n\n=== BÍBLIA DE LA NOVEL·LA ===\n' + (biblia || '') +
    '\n\n=== NORMES DE MAQUETACIÓ ===\n' + DIALOGUE_FORMAT_RULES;

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

// ─── FASE 6B: Esquelet de novel·la — Expansió del conte ─────
// Parteix del conte curt i genera un pla d'expansió amb fils,
// girs i subtrames calibrats al perfil d'autor actiu.
// El resultat (esqueletNovela) s'injecta a les fases 8, 9 i 10.
function fase6b_esqueletNovela(conteActual, tematica, estilDesc, userConfig) {
  var perfil = getPerfilAutor(tematica);

  // Instruccions específiques per perfil
  var instruccionsEspecifiques = '';
  if (perfil) {
    var e = perfil.estructura;
    instruccionsEspecifiques =
      '\n\n=== INSTRUCCIONS ESPECÍFIQUES PER A ' + perfil.nom.toUpperCase() + ' ===\n' +
      'Tipus d\'estructura: ' + e.descripcio + '\n' +
      'Fils narratius requerits: ' + e.numFilsNarratius + ' — ' + e.instruccioFils + '\n' +
      'Punt mig (midpoint): ' + e.midpoint + '\n' +
      'Clausura: ' + perfil.clausura.instruccio + '\n\n' +
      'ANTAGONISME (' + perfil.antagonisme.tipus + '):\n' + perfil.antagonisme.instruccio + '\n' +
      'Prohibicions d\'antagonisme: ' + perfil.antagonisme.prohibicions;
  }

  // Seccions extra específiques per al tipus d'outline
  var seccionsExtra = '';
  if (perfil) {
    if (perfil.estructura.tipusOutline === 'dual_convergent') {
      seccionsExtra =
        '\n\n## FIL A vs FIL B\n' +
        'Detalla els dos fils paral·lels: protagonista A (oficial) vs protagonista B (outsider). ' +
        'Per a cada fil: Nom | Protagonista | Escenes pròpies abans de la convergència | ' +
        'Punt de convergència (capítol estimat) | Canvi que provoca la unió.\n\n' +
        '## XARXA ANTAGONISTA SISTÈMICA\n' +
        'Desenvolupa el sistema de poder: (1) Rostre visible (càrrec, creença sincera) | ' +
        '(2) Operador a l\'ombra (mètodes, moment de revelació) | ' +
        '(3) Còmplice atemorit (posició, punt de trencament).';
    } else if (perfil.estructura.tipusOutline === 'interlace_multigrupo') {
      seccionsExtra =
        '\n\n## TRES FILS ENTRELLAÇATS\n' +
        'Detalla els tres grups amb els seus itineraris. Per a cada grup: Nom del grup | ' +
        'Membres principals | Missió / objectiu | Capítols on s\'entrecreuen amb altres grups | ' +
        'Resolució del fil al clímax.\n\n' +
        '## ANTAGONISME CÒSMIC\n' +
        'Desenvolupa la voluntat antagònica i com es manifesta a cada grup de manera diferent. ' +
        'Inclou el moment de revelació del mal real i el preu de la victòria.';
    } else if (perfil.estructura.tipusOutline === 'degradacio_progressiva') {
      seccionsExtra =
        '\n\n## CALENDARI DE DEGRADACIÓ\n' +
        'Etapes de deteriorament de la realitat percebuda. Per a cada etapa: ' +
        'Capítols | Nivell de certesa del protagonista (alt/mig/baix) | ' +
        'Anomalia que desestabilitza | Reacció del protagonista | ' +
        'Cosa que el protagonista NO sap que el lector sí.\n\n' +
        '## CAPES DE REALITAT\n' +
        'Defineix les capes de realitat (mínim 3) que s\'aniran revelant o col·lapsant. ' +
        'Per a cada capa: Nom | Qui la percep com a real | Moment de qüestionament | ' +
        'Si és definitiva o il·lusòria.';
    } else if (perfil.estructura.tipusOutline === 'cicles_iniciatics') {
      seccionsExtra =
        '\n\n## CICLES D\'APRENENTATGE\n' +
        'Estructura en cicles iniciàtics (mínim 3). Per a cada cicle: Nom del cicle | ' +
        'Lliçó central | Prova o experiència que la transmet | Resistència del protagonista | ' +
        'Transformació (parcial o completa) al final del cicle.\n\n' +
        '## CRISIS EPISTEMOLÒGIQUES\n' +
        'Identifica els 3-4 moments de crisi en els quals el protagonista qüestiona tot el que ' +
        'creia saber. Per a cada crisi: Detonant | Durada narrativa | Resolució (acceptació / ' +
        'rebuig / síntesi) | Implicació per al cicle següent.';
    }
  }

  var numFilsStr = perfil ? String(perfil.estructura.numFilsNarratius) : '1';
  var numCapsStr = perfil ? perfil.estructura.numCapitolsRecomanat : '18-24';

  var userContent =
    '=== EL CONTE ORIGINAL ===\n' + conteActual + '\n\n---\n\n' +
    'Ets un arquitecte narratiu especialitzat en expandir contes curts a novel·les. ' +
    'El conte anterior és el nucli de la futura novel·la. La teva tasca és generar un ' +
    'ESQUELET D\'EXPANSIÓ que identifiqui tots els elements nous necessaris per transformar-lo ' +
    'en una obra de ' + numCapsStr + ' capítols, mantenint fidelitat estricta a la veu, ' +
    'els temes i els personatges del conte original.\n' +
    'Estil de referència: ' + (estilDesc || tematica || 'genèric') +
    instruccionsEspecifiques + '\n\n' +
    'Genera el document estructurat EXACTAMENT amb les seccions següents:\n\n' +
    '## FILS NARRATIUS PRINCIPALS\n' +
    'Identifica ' + numFilsStr + ' fil(s) narratiu(s) que emergeixin del conte original. ' +
    'Per a cada fil: Nom del fil | Protagonista | Punt de partida (del conte) | ' +
    'Arc d\'expansió (on ha d\'arribar a la novel·la) | Capítols clau estimats\n\n' +
    '## GIRS NARRATIUS OBLIGATORIS\n' +
    'Genera entre 5 i 7 girs narratius calibrats a l\'estil ' + (perfil ? perfil.nom : 'de l\'autor') + '. ' +
    'Per a cada gir: Posició (% de la novel·la) | Descripció del gir | Fil(s) afectat(s) | ' +
    'Conseqüència narrativa directa | Com ja estava latent al conte original\n\n' +
    '## SUBTRAMES\n' +
    'Proposa entre 4 i 6 subtrames que enriqueixin la trama principal. ' +
    'Per a cada subtrama: Títol breu | Personatge/s implicats | Punt d\'ancoratge al conte original | ' +
    'Inici (capítol estimat) | Resolució (capítol estimat) | Funció respecte la trama principal\n\n' +
    '## EXPANSIONS DE MÓN NECESSÀRIES\n' +
    'Llista màxim 6 elements de món que cal definir per sostenir la novel·la. ' +
    'Format: Element — Raó narrativa — Grau de detall necessari (alt/mig/baix)\n\n' +
    '## LLAVORS DE PERSONATGES NOUS\n' +
    'Suggereix entre 3 i 5 personatges nous que el conte original no tenia. ' +
    'Per a cada un: Nom provisional | Rol a la trama | Connexió amb el nucli original | ' +
    'Subtrama pròpia (si n\'hi ha)\n\n' +
    '## TEMES EXPANDITS\n' +
    'Identifica els temes del conte original i com s\'aprofundiran a la novel·la. ' +
    '(2-4 temes, 2 línies cadascun)' +
    seccionsExtra + '\n\n' +
    'Respon DIRECTAMENT en català, sense introducció ni comentaris meta. ' +
    'Usa els encapçalaments ## exactes indicats.';

  const msgs     = [{ role: 'user', content: userContent }];
  const response = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 4500 }));
  return { response: response };
}

// ─── FASE 7: Worldbuilding — Extracció d'elements de món ───
function fase7_worldbuilding(conteActual, tematica, estilDesc, history, userConfig, ambientacio) {
  var contextAmbientacio = construirContextAmbientacio(ambientacio, tematica);
  const msgs = [
    ...history,
    {
      role: 'user',
      content: 'Has escrit el conte següent:\n\n' + conteActual + '\n\n---\nAra, com a arquitecte de mons, analitza el conte i proposa 8 elements del món que es podrien expandir per convertir-lo en una novel·la.' +
        contextAmbientacio + ` Els elements han de ser:\n\n1. Geografia — el territori i els seus llocs rellevants\n2. Política — el sistema de poder i les seves tensions\n3. Màgia/Tecnologia — el sistema màgic o tecnològic que regeix el món\n4. Religions — les creences, rituals i institucions religioses\n5. Faccions — els grups, bandes o organitzacions en conflicte\n6. Història pregressa — els esdeveniments passats que expliquen el present\n7. Economia — els recursos, el comerç i les desigualtats\n8. Cultura quotidiana — els costums, l'art, la gastronomia, les festes\n\nMarca amb "(Recomanat)" els 4 elements més rellevants per expandir basant-te en el que ja apareix al conte. Cada element: nom + descripció d'1 línia del que caldria definir.\n\nFormat ESTRICTE (res més, sense cap introducció):\n1. **Geografia** — [descripció d'1 línia] (Recomanat)\n2. **Política** — [descripció d'1 línia]\n3. **Màgia/Tecnologia** — [descripció d'1 línia] (Recomanat)\n4. **Religions** — [descripció d'1 línia]\n5. **Faccions** — [descripció d'1 línia] (Recomanat)\n6. **Història pregressa** — [descripció d'1 línia]\n7. **Economia** — [descripció d'1 línia] (Recomanat)\n8. **Cultura quotidiana** — [descripció d'1 línia]`
    }
  ];
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 2048 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 7: Worldbuilding — Expansió dels elements triats ──
function fase7_expandirElements(elementsTriats, conteActual, tematica, history, userConfig, ambientacio) {
  const llistaElements = elementsTriats.join('\n');
  var contextAmbientacio = construirContextAmbientacio(ambientacio, tematica);
  const msgs = [
    ...history,
    {
      role: 'user',
      content: 'A partir del conte i dels elements de món proposats, desenvolupa una bíblia de món per als elements seleccionats.\n\nElements a expandir:\n' + llistaElements + contextAmbientacio + '\n\nPer a cada element, escriu una descripció de 3-5 línies que:\n- Defineixi l\'element amb precisió i profunditat\n- Connecti amb el que ja apareix al conte\n- Suggereixi tensions narratives implícites\n- Sigui útil per a un escriptor que vol expandir el món\n\nFormat ESTRICTE per a cada element:\n**[Nom de l\'element]**\n[descripció de 3-5 línies]\n\nSepara els elements amb una línia en blanc. Escriu exclusivament en català.'
    }
  ];
  const maxTokens  = Math.min(400 * elementsTriats.length + 800, 4096);
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 8: Elenc de personatges per a la novel·la ─────────
function fase8_elenc(conteActual, worldbuilding, tematica, estilDesc, history, userConfig, esqueletNovela, ambientacio) {
  const contextMon = worldbuilding
    ? '\n\nBíblia de món disponible:\n' + worldbuilding
    : '';

  const contextEsquelet = esqueletNovela
    ? '\n\nESQUELET D\'EXPANSIÓ (fils, girs i llavors de personatges):\n' + esqueletNovela.substring(0, 2000)
    : '';
  var contextAmbientacio = construirContextAmbientacio(ambientacio, tematica);

  var perfil = getPerfilAutor(tematica);
  var instruccionsElenc = '';
  var instruccionsAntagonista = '';

  if (perfil) {
    instruccionsElenc =
      '\n\n=== INSTRUCCIONS D\'ELENC PER A ' + perfil.nom.toUpperCase() + ' ===\n' +
      'PROTAGONISTA (' + perfil.protagonista.arquetipus + '):\n' +
      perfil.protagonista.instruccio + '\n' +
      'Arc narratiu: ' + perfil.protagonista.arcNarratiu;

    // Tractament especial per a Castaneda: no forçar antagonista extern
    if (perfil.antagonisme.tipus === 'intern_epistemologic') {
      instruccionsAntagonista =
        '\n\nTIPUS D\'ANTAGONISME (intern-epistemològic):\n' +
        perfil.antagonisme.instruccio + '\n' +
        'Complexitat: ' + perfil.antagonisme.complexitat + '\n' +
        perfil.antagonisme.prohibicions + '\n\n' +
        'NOTA: NO generis un antagonista extern convencional. L\'elenc ha de tenir:\n' +
        '(1) El Mestre: figura guia moralment ambigua\n' +
        '(2) El Narrador-protagonista amb la seva resistència interna com a conflicte principal\n' +
        '(3) Figures secundàries ambigües (altres aprenents, figures de poder)';
    } else {
      instruccionsAntagonista =
        '\n\nTIPUS D\'ANTAGONISME (' + perfil.antagonisme.tipus + '):\n' +
        perfil.antagonisme.instruccio + '\n' +
        'Complexitat requerida: ' + perfil.antagonisme.complexitat + '\n' +
        perfil.antagonisme.prohibicions;
    }
  } else {
    instruccionsAntagonista =
      '\n\nINSTRUCCIÓ CRÍTICA PER ALS ANTAGONISTES:\n' +
      '→ L\'elenc ha d\'incloure almenys 1 antagonista principal i 1 antagonista secundari.\n' +
      '→ L\'antagonista principal HA DE tenir una motivació que el lector pugui entendre o fins i tot empatitzar.\n' +
      '→ L\'antagonista NO POT ser una funció narrativa plana. Ha de tenir un arc propi, pèrdues i contradiccions internes.\n' +
      '→ Indica explícitament al camp "Rol" si el personatge és antagonista.';
  }

  const msgs = [
    ...history,
    {
      role: 'user',
      content: 'A partir del conte i del món creat, genera l\'elenc de 8 personatges per a la novel·la. Inclou els personatges que ja apareixen al conte (adaptats a la seva versió novel·lística) i afegeix-ne de nous necessaris per a una trama de major abast.' + contextMon + contextEsquelet + contextAmbientacio + instruccionsElenc + instruccionsAntagonista + '\n\nCada personatge ha de tenir:\n- Una funció clara a la trama principal o a les subtrames\n- Un desig conscient i un temor ocult que generin tensió\n- Un arc de transformació creïble (on comença → on acaba)\n- Relacions concretes amb altres personatges de l\'elenc\n\nMarca amb (Recomanat) els 5 personatges més essencials per a la novel·la.\n\nFormat ESTRICTE (8 personatges, res més, sense cap introducció):\n1. **[Nom, edat]** | Rol: [funció a la trama] | Desig: [el que vol conscientment] | Temor: [el que l\'aterroritza o amaga] | Arc: [on comença → on acaba] | Veu: [tret narratiu o tic que el fa distintiu] | Relacions: [amb qui i com]\n2. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Veu: [...] | Relacions: [...]\n3. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Veu: [...] | Relacions: [...]\n4. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Veu: [...] | Relacions: [...]\n5. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Veu: [...] | Relacions: [...]\n6. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Veu: [...] | Relacions: [...]\n7. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Veu: [...] | Relacions: [...]\n8. **[Nom, edat]** | Rol: [...] | Desig: [...] | Temor: [...] | Arc: [...] | Veu: [...] | Relacions: [...]'
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
function comprimirContext(tematica, estilDesc, worldbuilding, elencPersonatges, esqueletNovela) {
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

  if (esqueletNovela && esqueletNovela.trim()) {
    parts.push('\nESQUELET DE NOVEL·LA:');
    var lines = esqueletNovela.split('\n');
    var inRellevant = false;
    var count = 0;
    lines.forEach(function(l) {
      if (count >= 25) return;
      if (/^##\s+(FILS NARRATIUS|GIRS NARRATIUS|SUBTRAMES|FIL A|XARXA ANT|TRES FILS|CICLES|CALENDARI)/.test(l)) {
        inRellevant = true;
        parts.push(l.trim());
        count++;
      } else if (/^##/.test(l)) {
        inRellevant = false;
      } else if (inRellevant && l.trim()) {
        parts.push(l.trim().substring(0, 120));
        count++;
      }
    });
  }

  return parts.join('\n');
}

// ─── FASE 9: Estructura narrativa en actes ───────────────────
function fase9_estructura(conteActual, worldbuilding, elencPersonatges, tematica, estilDesc, history, userConfig, esqueletNovela, ambientacio) {
  const ctx = comprimirContext(tematica, estilDesc, worldbuilding, elencPersonatges, esqueletNovela);
  var contextAmbientacio = construirContextAmbientacio(ambientacio, tematica);

  var perfil = getPerfilAutor(tematica);
  var instruccionsEstructurals = '';
  if (perfil) {
    var e = perfil.estructura;
    instruccionsEstructurals =
      '\n\n=== INSTRUCCIONS ESTRUCTURALS DE L\'AUTOR (' + perfil.nom + ') ===\n' +
      'Tipus d\'estructura: ' + e.descripcio + '\n\n' +
      'DISTRIBUCIÓ D\'ACTES:\n' +
      '- Acte 1 (' + e.distribucioActes.acte1_percentatge + '% dels capítols): ' + e.distribucioActes.acte1_instruccio + '\n' +
      '- Acte 2 (' + e.distribucioActes.acte2_percentatge + '% dels capítols): ' + e.distribucioActes.acte2_instruccio + '\n' +
      '- Acte 3 (' + e.distribucioActes.acte3_percentatge + '% dels capítols): ' + e.distribucioActes.acte3_instruccio + '\n\n' +
      'FILS NARRATIUS: ' + e.numFilsNarratius + '\n' + e.instruccioFils + '\n\n' +
      'PUNT MIG (midpoint): ' + e.midpoint + '\n\n' +
      'Número de capítols recomanat: ' + e.numCapitolsRecomanat;
  }

  const msgs = [
    ...history,
    {
      role: 'user',
      content: 'Tenim definits el món i l\'elenc de la novel·la. Aquí el resum:\n\n' + ctx + instruccionsEstructurals + contextAmbientacio + '\n\n---\nGenera 4 opcions d\'estructura narrativa per a la novel·la. Cada opció ha de ser diferent en forma i filosofia' + (perfil ? ' (una d\'elles ha de seguir el patró de ' + perfil.nom + ')' : ' (per exemple: estructura de 3 actes clàssica, estructura de 4 actes, estructura circular, estructura de trames paral·leles)') + '.\n\nPer a cada opció inclou:\n- Nom de l\'estructura\n- Resum de cada acte en 2 línies: quins esdeveniments, quin personatge lidera, quin canvi es produeix\n- 2-3 punts de gir principals que articulen la tensió\n- 1 línia sobre com encaixa amb els personatges i el món definits\n\nMarca amb (Recomanat) l\'opció que millor aprofiti les tensions dels personatges i el potencial del món.\n\nFormat ESTRICTE (4 opcions numerades, res més, sense cap introducció):\n1. **[Nom de l\'estructura]**\nActe I: [2 línies]\nActe II: [2 línies]\nActe III: [2 línies]\nPunts de gir: [2-3 punts separats per " / "]\nEncaix: [1 línia]\n\n2. **[Nom de l\'estructura]**\n...\n\n3. ...\n\n4. ... (Recomanat)'
    }
  ];
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 3500 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 10: Outline de capítols ───────────────────────────
// contextComprimit: string ja comprimida pel frontend (sense cost extra)
function fase10_outline(contextComprimit, estructuraTriada, history, userConfig, tematica) {
  var perfil = getPerfilAutor(tematica);
  var instruccionsOutline = '';
  var numCapFormat = 'entre 12 i 25';
  var filFormat = '';
  if (perfil) {
    var e = perfil.estructura;
    numCapFormat = e.numCapitolsRecomanat;
    instruccionsOutline =
      '\n\n=== INSTRUCCIONS D\'OUTLINE PER A ' + perfil.nom.toUpperCase() + ' ===\n' +
      e.instruccioFils + '\n' +
      'PUNT MIG OBLIGATORI (cap. ' + Math.round(parseInt(numCapFormat.split('-')[0] || 12) / 2 + parseInt(numCapFormat.split('-')[1] || 20) / 2) / 2 + '): ' + e.midpoint;
    if (e.numFilsNarratius > 1) {
      filFormat = ' | Fil: [A/B' + (e.numFilsNarratius > 2 ? '/C' : '') + ']';
    }
  }

  const msgs = [
    ...history,
    {
      role: 'user',
      content: 'Tenim definits el món, els personatges i l\'estructura de la novel·la:\n\n' + contextComprimit + '\n\nESTRUCTURA TRIADA:\n' + estructuraTriada + instruccionsOutline + '\n\n---\nGenera l\'outline complet de capítols de la novel·la. El nombre de capítols ha de ser ' + numCapFormat + ', ajustat a la complexitat de l\'estructura triada.\n\nCada capítol en una sola línia, format ESTRICTE:\nCap. N — [Títol breu] | POV: [Nom]' + filFormat + ' | [Objectiu narratiu en 10 paraules màxim] | Descobriment: [Què sap el lector de nou al final del capítol]\n\nEl conjunt ha de:\n- Cobrir tots els actes de l\'estructura triada de manera proporcional\n- Distribuir els POVs estratègicament entre els personatges de l\'elenc\n- Mantenir tensió creixent amb punts de gir als capítols clau\n- Cada capítol ha de tenir un objectiu narratiu clar i diferent dels altres\n\nFormat ESTRICTE (res més, sense introducció ni resum final):\nCap. 1 — [Títol] | POV: [Nom]' + filFormat + ' | [Objectiu 10 paraules] | Descobriment: [text breu]\nCap. 2 — [Títol] | POV: [Nom]' + filFormat + ' | [Objectiu 10 paraules] | Descobriment: [text breu]\n...'
    }
  ];
  const response   = callLLM(msgs, getSystemPrompt(tematica), Object.assign({}, userConfig, { maxTokens: 4096 }));
  const newHistory = [...msgs, { role: 'assistant', content: response }];
  return { response, history: newHistory };
}

// ─── FASE 10B: Auditoria automàtica de l'outline ───────────
function fase10_auditarOutline(outlineGenerat, userConfig, tematica) {
  var systemAuditoria = getSystemPrompt(tematica) +
    '\n\nActues com un Editor implacable. Detectes forats de guió, capítols redundants i problemes de ritme.';
  var msgs = [{
    role: 'user',
    content:
      'Auditza aquest outline de capítols:\n\n' + (outlineGenerat || '') + '\n\n' +
      'Tasques:\n' +
      '1) Troba forats de guió i problemes de ritme.\n' +
      '2) Si n\'hi ha, reescriu TOT l\'outline corregint-los.\n' +
      '3) Si no n\'hi ha, retorna l\'outline igual (admet microajustos de claredat).\n\n' +
      'Format ESTRICTE (res més):\n' +
      'Cap. N — [Títol breu] | POV: [Nom] | [Objectiu narratiu en 10 paraules màxim] | Descobriment: [text breu]'
  }];
  var response = callLLM(msgs, systemAuditoria, Object.assign({}, userConfig, { maxTokens: 4096 }));
  return { response: response };
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
      var veuM = p.match(/Veu:\s*([^|]+)/);
      var temM = p.match(/Temor:\s*([^|]+)/);
      var nom  = nomM ? nomM[1].trim() : p.substring(0, 25).trim();
      var arc  = arcM ? arcM[1].trim().substring(0, 100) : '—';
      var rel  = relM ? relM[1].trim().substring(0, 80) : '';
      var veu  = veuM ? veuM[1].trim().substring(0, 80) : '';
      var tem  = temM ? temM[1].trim().substring(0, 60) : '';
      return '• ' + nom + ' — Arc: ' + arc +
        (veu ? ' | Veu: ' + veu : '') +
        (tem ? ' | Temor: ' + tem : '') +
        (rel ? ' | Rel: ' + rel : '');
    });
    seccions.push('## PERSONATGES\n' + persList.join('\n'));
  }

  // GUIA DE DIÀLEG
  if (d.elencPersonatges && d.elencPersonatges.length > 0) {
    var dialogGuia = d.elencPersonatges.map(function(p) {
      var nomM = p.match(/\*\*(.+?)\*\*/);
      var veuM = p.match(/Veu:\s*([^|]+)/);
      var nom  = nomM ? nomM[1].trim() : '';
      var veu  = veuM ? veuM[1].trim() : '';
      if (!nom || !veu) return null;
      return '• ' + nom + ': ' + veu;
    }).filter(function(x) { return x; });
    if (dialogGuia.length > 0) {
      seccions.push('## GUIA DE DIÀLEG (veu de cada personatge)\nCada personatge ha de parlar de manera recognoscible i diferenciada:\n' + dialogGuia.join('\n'));
    }
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

  // VEU NARRATIVA I REGISTRE (des del perfil d'autor)
  var perfil = getPerfilAutor(d.tematica);
  if (perfil) {
    seccions.push(
      '## VEU NARRATIVA\n' +
      perfil.protagonista.veuNarrativa + '\n\n' +
      '## REGISTRE I RITME\n' +
      'Registre: ' + perfil.estil.registre + '\n' +
      'Ritme: ' + perfil.estil.ritme + '\n' +
      'Diàleg: ' + perfil.estil.dialeg
    );
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
function fase15_revisioCoherencia(capitolsData, biblia, userConfig, fetsCanonicsText, outlineFuturText, tematica) {
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

  var fetsCanonicsRef = fetsCanonicsText && String(fetsCanonicsText).trim()
    ? '=== FETS CANÒNICS RECENTS ===\n' + String(fetsCanonicsText).substring(0, 2000) + '\n\n'
    : '';

  var userPrompt =
    bibliaRef + fetsCanonicsRef + resumCapitols + '\n\n---\n' +
    'Analitza la coherència dels ' + d.length + ' capítols anteriors. Identifica:\n' +
    '1. Contradiccions factuals (noms, dates, llocs, fets que canvien)\n' +
    '2. Canvis de to o veu narrativa injustificats\n' +
    '3. Fils narratius o detalls plantats que han quedat abandonats\n' +
    '4. Inconsistències de personatges (comportament, coneixements, relacions)\n' +
    '5. Patrons estilístics repetitius: metàfores, comparacions, imatges sensorials o estructures de frase que apareixen en múltiples capítols de forma idèntica o quasi idèntica. Inclou repeticions de clàusules de tancament de capítol.\n' +
    '6. Diàlegs indiferenciats: personatges que parlen amb la mateixa veu, ritme i registre quan haurien de ser distingibles.\n' +
    (function() {
      var perfil = getPerfilAutor(tematica);
      if (!perfil) return '';
      return '7. COHERÈNCIA AMB L\'ESTIL DE ' + perfil.nom.toUpperCase() + ':\n' +
        '   - Veu narrativa: ' + perfil.protagonista.veuNarrativa.substring(0, 200) + '\n' +
        '   - Diàlegs: ' + perfil.estil.dialeg.substring(0, 200) + '\n' +
        '   - Antipatrons a verificar: ' + perfil.antipatrons.slice(0, 3).join(' | ') + '\n';
    })() +
    '\n' +
    'Per cada problema, proposa una correcció específica al capítol corresponent.\n\n' +
    'Format ESTRICTE per a cada problema (sense cap variació):\n' +
    'PROBLEMA: [descripció clara i breu]\n' +
    'CORRECCIÓ: [Cap. N] [instrucció concreta i directa per a la millora]\n\n' +
    'Si no trobes cap problema real, escriu únicament: "Cap inconsistència detectada."\n' +
    'Cap comentari addicional fora d\'aquest format.';

  var propostaCritic = analitzarAmbEditor(userPrompt, userConfig);

  if (!propostaCritic || !propostaCritic.trim() || /cap inconsistència detectada\./i.test(propostaCritic)) {
    return { response: 'Cap inconsistència detectada.' };
  }

  var blocs = [];
  var current = null;
  propostaCritic.split('\n').forEach(function(line) {
    var l = (line || '').trim();
    if (/^PROBLEMA:/i.test(l)) {
      if (current) blocs.push(current);
      current = { problema: l.replace(/^PROBLEMA:\s*/i, '').trim(), correccio: '', capNum: null };
    } else if (/^CORREC/i.test(l) && current) {
      current.correccio = l.replace(/^CORREC[CÇ]I[ÓO]:\s*/i, '').trim();
      var m = current.correccio.match(/^\[?Cap\.?\s*(\d+)\]?/i);
      if (m) current.capNum = parseInt(m[1], 10);
    } else if (current && l && !current.correccio) {
      current.problema += ' ' + l;
    }
  });
  if (current) blocs.push(current);

  if (!blocs.length) return { response: 'Cap inconsistència detectada.' };

  var aprovades = [];
  blocs.forEach(function(bloc) {
    if (!bloc || !bloc.correccio || !bloc.capNum) return;

    var capNum = bloc.capNum;
    var capsAfectats = d.filter(function(cap) { return cap && cap.num === capNum; });
    var resumCapsAfectats = capsAfectats.map(function(cap) {
      var txt = (cap.text || '').trim().split(/\s+/).slice(0, 260).join(' ');
      return '=== CAPÍTOL ' + cap.num + ' ===\nOUTLINE: ' + (cap.outlineText || '') + '\nTEXT:\n' + txt;
    }).join('\n\n');

    var supervisorPrompt =
      'Aquesta és una correcció proposada per al capítol ' + capNum + ':\n\n' +
      'PROBLEMA: ' + (bloc.problema || '—') + '\n' +
      'CORRECCIÓ: ' + bloc.correccio + '\n\n' +
      '=== CAPÍTOLS AFECTATS ===\n' + (resumCapsAfectats || '—') + '\n\n' +
      '=== OUTLINE FUTUR ===\n' + (outlineFuturText || '—') + '\n\n' +
      'Aquesta és una correcció proposada per al capítol X. Si apliquem això, ¿es trenca algun esdeveniment que ha de passar als capítols futurs segons l\'outline? Respon \'APROVAT\' si és segur, o \'REBUTJAT\' seguit del motiu si trenca la història.';

    var respostaSupervisor = analitzarAmbEditor(supervisorPrompt, userConfig);
    if (/^\s*APROVAT\b/i.test(respostaSupervisor || '')) {
      aprovades.push('PROBLEMA: ' + (bloc.problema || '—'));
      aprovades.push('CORRECCIÓ: ' + bloc.correccio);
    }
  });

  return { response: aprovades.length ? aprovades.join('\n') : 'Cap inconsistència detectada.' };
}

// ─── FASE 15B: Informe d'estil global ───────────────────────
// Es genera un cop després de completar ~60% dels capítols.
// El resultat s'injecta com a context a totes les millores posteriors.
function fase15_informeEstil(capitolsData, userConfig, tematica) {
  var d = capitolsData || [];
  var fragments = d.map(function(cap) {
    var words = (cap.text || '').trim().split(/\s+/).filter(function(w) { return w; });
    // Primeres 150 + últimes 100 paraules de cada capítol
    var inici = words.slice(0, 150).join(' ');
    var final = words.slice(-100).join(' ');
    return '=== CAPÍTOL ' + cap.num + ' ===\nINICI:\n' + inici + '\n[…]\nFINAL:\n' + final;
  }).join('\n\n');

  var prompt =
    fragments + '\n\n---\n' +
    'Analitza els fragments i identifica entre 3 i 5 tics estilístics recurrents de l\'autor.\n' +
    'Per a cada tic, proposa una alternativa concreta.\n\n' +
    'Format ESTRICTE:\n' +
    'TIC: [descripció del patró repetitiu]\n' +
    'ALTERNATIVA: [proposta concreta i accionable]\n\n' +
    'Si no detectes tics rellevants, escriu: "Cap tic estilístic recurrent detectat."';

  var response = analitzarAmbEditor(prompt, userConfig);
  return { response: response };
}

// ─── Generació d'obertura magnètica per a un capítol ────────
// Genera 3 opcions de primera frase i selecciona la millor.
// Retorna la frase guanyadora com a string.
function generarObertura(numCapitol, outlineCapitol, textCapAnterior, biblia, estilDesc, userConfig, tematica) {
  var contextAnterior = '';
  if (textCapAnterior && textCapAnterior.trim()) {
    var words = textCapAnterior.trim().split(/\s+/);
    contextAnterior = '\nÚltima frase del capítol anterior: "' + words.slice(-20).join(' ') + '"';
  }

  var prompt =
    '=== CAPÍTOL ' + numCapitol + ' ===\n' +
    'Outline: ' + (outlineCapitol || '').split('\n')[0].substring(0, 150) + '\n' +
    'Estil: ' + (estilDesc || '') +
    contextAnterior + '\n\n' +
    'Genera exactament 3 opcions de PRIMERA FRASE per a aquest capítol. Cada opció ha de:\n' +
    '→ Ser impossible de no continuar llegint (ganxo immediat)\n' +
    '→ Establir to, atmosfera o conflicte en una sola frase\n' +
    '→ Ser radicalment diferent de les altres dues opcions en estil i enfocament\n' +
    '→ NO repetir l\'estructura de la primera frase del capítol anterior\n\n' +
    'Després, tria la millor de les 3 i indica-la.\n\n' +
    'Format ESTRICTE:\n' +
    'A) [primera frase opció A]\n' +
    'B) [primera frase opció B]\n' +
    'C) [primera frase opció C]\n' +
    'MILLOR: [A/B/C]';

  var msgs = [{ role: 'user', content: prompt }];
  var systemObertura = getSystemPrompt(tematica) +
    (biblia ? '\n\n=== BÍBLIA ===\n' + (biblia || '').substring(0, 800) : '');
  var response = callLLM(msgs, systemObertura, Object.assign({}, userConfig, { maxTokens: 600 }));

  // Parsejar la resposta per extreure la frase guanyadora
  var millorMatch = (response || '').match(/MILLOR:\s*([ABC])/i);
  if (millorMatch) {
    var lletra = millorMatch[1].toUpperCase();
    var fraseMatch = response.match(new RegExp(lletra + '\\)\\s*(.+)', 'i'));
    if (fraseMatch) return fraseMatch[1].trim();
  }

  // Fallback: retornar la primera opció
  var fallback = response.match(/[ABC]\)\s*(.+)/i);
  return fallback ? fallback[1].trim() : '';
}

// ─── Auditar i reescriure el ganxo de final de capítol ───────
// Analitza les últimes 200 paraules del capítol generat.
// Si el ganxo és feble, reescriu NOMÉS les últimes 150-200 paraules.
// No opera sobre l'últim capítol (té les seves pròpies regles de clausura).
function auditarGanxo(textCapitol, numCapitol, totalCapitols, outlineCapitol, outlineSeguentCapitol, tematica, userConfig) {
  if (!textCapitol || !textCapitol.trim()) return textCapitol;
  if (numCapitol >= totalCapitols) return textCapitol;

  var paraules = textCapitol.trim().split(/\s+/);
  if (paraules.length < 100) return textCapitol;

  var ultimes200      = paraules.slice(-200).join(' ');
  var textSenseGanxo  = paraules.slice(0, -200).join(' ');

  var tipusGanxos = [
    'PREGUNTA OBERTA: El capítol acaba amb una pregunta implícita o explícita que el lector necessita veure respondre. No una pregunta retòrica — un dubte narratiu genuí: qui ha fet X? Què hi ha darrere de Y? Per què Z ha reaccionat així?',
    'REVELACIÓ PARCIAL: El capítol acaba revelant informació nova que obre una pregunta encara més gran. El lector sap més que fa un minut, però el que sap el fa necessitar saber MÉS.',
    'DECISIÓ IMMINENT: El capítol acaba just abans que el protagonista prengui una decisió crucial. El lector veu les opcions, entén el dilema, però no veu què tria. Ha de girar la pàgina.',
    'TALL EN TENSIÓ MÀXIMA: El capítol es talla en el moment de màxima tensió d\'una escena — una porta que s\'obre, un so que no hauria de ser allà, un telèfon que sona, un descobriment a mig fer. Sense resolució.'
  ];
  var tipusIdx  = (numCapitol - 1) % tipusGanxos.length;
  var tipusGanxo = tipusGanxos[tipusIdx];

  var perfil = typeof getPerfilAutor === 'function' ? getPerfilAutor(tematica) : null;
  var ganxoAutor = '';
  if (perfil) {
    var ganxosPerAutor = {
      'larsson':   'Larsson: talla amb un detall burocràtic o documental que revela una connexió inquietant. O amb un missatge, trucada o document que canvia el que el personatge creia saber.',
      'tolkien':   'Tolkien: talla amb un canvi de perspectiva cap a un altre grup en perill. O amb un pressentiment, un so llunyà, o un canvi en el paisatge que anuncia amenaça.',
      'dick':      'Dick: talla amb una percepció que contradiu el que el lector acaba d\'acceptar com a real. Un detall que no encaixa. Una frase que sona "programada". Un objecte que ha canviat.',
      'castaneda': 'Castaneda: talla amb una frase del Mestre que obre un abisme conceptual. O amb una percepció alterada que el narrador no pot processar. El capítol acaba en el vèrtex de la incomprensió.'
    };
    for (var clau in ganxosPerAutor) {
      if (perfil.nom && perfil.nom.toLowerCase().indexOf(clau) >= 0) {
        ganxoAutor = '\nESTIL ESPECÍFIC: ' + ganxosPerAutor[clau];
        break;
      }
    }
  }

  var contextSeguent = outlineSeguentCapitol
    ? '\nPROPER CAPÍTOL (context): ' + String(outlineSeguentCapitol).substring(0, 150)
    : '';

  var msgs = [{
    role: 'user',
    content:
      '=== FINAL ACTUAL DEL CAPÍTOL ' + numCapitol + ' (últimes 200 paraules) ===\n' +
      ultimes200 + '\n\n' +
      'OUTLINE DEL CAPÍTOL: ' + String(outlineCapitol || '').substring(0, 150) + contextSeguent + '\n\n' +
      '---\n' +
      'AVALUACIÓ:\n' +
      '1. Puntua de 1 a 10 la força del ganxo actual (10 = impossible deixar de llegir).\n' +
      '2. Si la puntuació és >= 7, respon NOMÉS: "GANXO_OK"\n' +
      '3. Si és < 7, reescriu les últimes 150-200 paraules del capítol aplicant EXACTAMENT aquest tipus de ganxo:\n\n' +
      tipusGanxo + ganxoAutor + '\n\n' +
      'Si reescrius, respon NOMÉS amb el text reescrit (150-200 paraules), sense cap comentari, puntuació ni explicació. Comença directament amb la narració reescrita.\n' +
      'Escriu exclusivament en català.'
  }];

  var system = getSystemPrompt(tematica) +
    '\nEts un editor especialitzat en ganxos narratius de final de capítol. La teva obsessió és que el lector NO pugui tancar el llibre.';

  try {
    var resposta = callLLM(msgs, system, Object.assign({}, userConfig, { maxTokens: 1200 }));
    if (!resposta || /GANXO_OK/i.test(resposta.trim())) return textCapitol;
    return textSenseGanxo + '\n\n' + resposta.trim();
  } catch (e) {
    return textCapitol;
  }
}

// ─── Fase 15b: Simulació de lector beta ──────────────────────
// Analitza l'experiència de lectura: ritme, engagement, redundàncies.
// capitolsData: array de {num, text}. subtrames: array de strings.
function fase15b_lectorBeta(capitolsData, subtrames, biblia, userConfig, tematica) {
  var d = capitolsData || [];
  if (d.length < 4) return { response: 'Massa pocs capítols per a una anàlisi de lector beta.' };

  var resumCapitols = d.map(function(cap) {
    var words    = (cap.text || '').trim().split(/\s+/).filter(function(w) { return w; });
    var primer200 = words.slice(0, 200).join(' ');
    var ultim200  = words.length > 400 ? '\n[…]\n' + words.slice(-200).join(' ') : '';
    return '=== CAPÍTOL ' + cap.num + ' (' + words.length + ' paraules) ===\n' + primer200 + ultim200;
  }).join('\n\n');

  var subtramesRef = subtrames && subtrames.length > 0
    ? '\n\nSUBTRAMES ACTIVES:\n' + subtrames.map(function(s, i) { return (i + 1) + '. ' + s.substring(0, 120); }).join('\n')
    : '';

  var systemLector =
    'Ets un lector beta professional. No busques errors factuals — busques AVORRIMENT. ' +
    'La teva feina és identificar on un lector real deixaria el llibre a la tauleta de nit i no el tornaria a agafar. ' +
    'Respon exclusivament en català.';

  var msgs = [{
    role: 'user',
    content:
      '=== BÍBLIA (resum) ===\n' + (biblia || '').substring(0, 800) + subtramesRef + '\n\n' +
      resumCapitols + '\n\n---\n' +
      'Analitza l\'EXPERIÈNCIA DE LECTURA d\'aquests ' + d.length + ' capítols. Identifica:\n\n' +
      '1. CAIGUDES DE RITME: capítols o seccions on el ritme cau i el lector s\'avorriria.\n' +
      '2. CAPÍTOLS PRESCINDIBLES: capítols que es podrien saltar sense perdre trama.\n' +
      '3. EMPATIA FEBLE: moments on el protagonista no té res en joc.\n' +
      '4. SUBTRAMES ESTANCADES: subtrames obertes que no avancen des de fa 2+ capítols.\n' +
      '5. GANXOS FEBLES: finals de capítol que no creen necessitat de continuar llegint.\n\n' +
      'Per cada problema detectat, proposa una INSTRUCCIÓ DE MILLORA CONCRETA.\n\n' +
      'Format ESTRICTE:\n' +
      'TIPUS: [RITME/PRESCINDIBLE/EMPATIA/SUBTRAMA/GANXO]\n' +
      'CAPÍTOL: [N]\n' +
      'DIAGNÒSTIC: [què passa i per què és un problema]\n' +
      'MILLORA: [instrucció directa i accionable]\n\n' +
      'Si no trobes cap problema real, escriu: "LECTURA_FLUIDA"\n' +
      'Màxim 5 problemes. Prioritza els més greus.'
  }];

  var resposta = callLLM(msgs, systemLector, Object.assign({}, userConfig, { maxTokens: 2500 }));
  return { response: resposta || 'LECTURA_FLUIDA' };
}

// ─── Auditar la resolució dels últims 3 capítols ─────────────
// Verifica: subtrames resoltes, arc protagonista complet,
// clímax creïble, clausura coherent amb el perfil d'autor.
function auditarResolucio(capitolsFinals, primerCapitol, subtrames, biblia, tematica, userConfig) {
  var caps = capitolsFinals || [];
  if (caps.length < 2) return { response: 'RESOLUCIO_OK' };

  var resumFinals = caps.map(function(cap) {
    var words = (cap.text || '').trim().split(/\s+/);
    return '=== CAPÍTOL ' + cap.num + ' ===\n' + words.slice(0, 300).join(' ') +
      (words.length > 600 ? '\n[…]\n' + words.slice(-300).join(' ') : '');
  }).join('\n\n');

  var resumPrimer = '';
  if (primerCapitol && primerCapitol.trim()) {
    var wordsPrimer = primerCapitol.trim().split(/\s+/);
    resumPrimer = '\n\n=== CAPÍTOL 1 (per comparar arc protagonista) ===\n' + wordsPrimer.slice(0, 250).join(' ');
  }

  var subtramesRef = subtrames && subtrames.length > 0
    ? '\n\nSUBTRAMES QUE HAN DE TENIR RESOLUCIÓ:\n' + subtrames.map(function(s, i) { return (i + 1) + '. ' + s.substring(0, 130); }).join('\n')
    : '';

  var perfil = typeof getPerfilAutor === 'function' ? getPerfilAutor(tematica) : null;
  var reglesClausura = '';
  if (perfil && perfil.clausura) {
    reglesClausura = '\n\nREGLES DE CLAUSURA PER A ' + perfil.nom.toUpperCase() + ':\n' +
      'Tipus: ' + perfil.clausura.tipus + '\n' +
      perfil.clausura.instruccio + '\n' +
      'Última frase: ' + perfil.clausura.ultimaFrase + '\n' +
      perfil.clausura.prohibicions;
  }

  var msgs = [{
    role: 'user',
    content:
      '=== BÍBLIA ===\n' + (biblia || '').substring(0, 1000) + resumPrimer + subtramesRef + reglesClausura +
      '\n\n=== ÚLTIMS CAPÍTOLS ===\n' + resumFinals + '\n\n---\n' +
      'Avalua la RESOLUCIÓ de la novel·la. Verifica:\n\n' +
      '1. SUBTRAMES: Totes les subtrames llistades tenen resolució explícita o implícita?\n' +
      '2. ARC PROTAGONISTA: El protagonista del capítol 1 ha canviat de manera creïble al final?\n' +
      '3. CLÍMAX: El penúltim capítol és el moment de màxima intensitat emocional?\n' +
      '4. CLAUSURA: El final compleix les regles de clausura de l\'autor?\n' +
      '5. ÚLTIMA FRASE: L\'última frase de la novel·la és memorable i ressonant?\n\n' +
      'Si tot és correcte: respon NOMÉS "RESOLUCIO_OK"\n' +
      'Si hi ha problemes:\n' +
      'PROBLEMA: [descripció]\n' +
      'CAPÍTOL: [N]\n' +
      'MILLORA: [instrucció concreta]\n\n' +
      'Màxim 3 problemes. Prioritza els que arruïnen l\'experiència final.'
  }];

  var system = getSystemPrompt(tematica) +
    '\nEts un editor especialitzat en finals de novel·la. Un mal final destrueix tota l\'experiència. La teva feina és assegurar que no passi.';

  var resposta = callLLM(msgs, system, Object.assign({}, userConfig, { maxTokens: 2000 }));
  return { response: resposta || 'RESOLUCIO_OK' };
}

// ─── FASE 14: Escriure un capítol (patró anti-timeout, 2 parts) ──
// partNum:       1 (primera meitat) o 2 (segona meitat)
// historialPart: null per Part 1; historial retornat per Part 1 per a Part 2
// informeEstil:  (opcional) tics estilístics detectats per fase15_informeEstil
function escriureCapitol(partNum, numCapitol, totalCapitols, biblia, outlineCapitol, textCapAnterior, estilDesc, userConfig, tematica, historialPart, fetsCanonicsText, estatJson, informeEstil, ambientacio) {
  var capitolsRestants = Math.max(0, (totalCapitols || 0) - (numCapitol || 0));
  var contextAmbientacio = construirContextAmbientacio(ambientacio, tematica);
  var systemForCap = getSystemPrompt(tematica) +
    (contextAmbientacio ? '\n' + contextAmbientacio : '') +
    '\n\n=== BÍBLIA DE LA NOVEL·LA ===\n' + (biblia || '') +
    '\n\n=== NORMES DE MAQUETACIÓ ===\n' + DIALOGUE_FORMAT_RULES;

  var perfil = getPerfilAutor(tematica);

  // Alerta de ritme genèrica (fase de desenvolupament)
  if (capitolsRestants > 3 && numCapitol > 2) {
    systemForCap += '\n\n[ALERTA DE RITME: Estàs a la fase de desenvolupament. Mantén la tensió però no precipitis la resolució.]';
  }

  // Punt mig adaptat al perfil
  var midPoint = Math.ceil(totalCapitols / 2);
  if (numCapitol === midPoint) {
    if (perfil) {
      systemForCap += '\n\n[PUNT MIG — CAPÍTOL ' + numCapitol + ' DE ' + totalCapitols + ']: ' + perfil.estructura.midpoint;
    } else {
      systemForCap += '\n\n[PUNT MIG]: Gir central de la trama. El protagonista descobreix que tot és molt més gran del que creia. Res no pot ser igual després d\'aquest capítol.';
    }
  }

  // Pre-clímax adaptat al perfil
  if (capitolsRestants >= 2 && capitolsRestants <= 3) {
    if (perfil && perfil.estructura.tipusOutline === 'cicles_iniciatics') {
      systemForCap += '\n\n[ACCELERACIÓ]: Les experiències s\'intensifiquen. El narrador ja no pot mantenir la distància racional. Cada cicle és més profund i desorientador que l\'anterior. El Mestre augmenta la pressió.';
    } else if (perfil && perfil.estructura.tipusOutline === 'degradacio_progressiva') {
      systemForCap += '\n\n[FRAGMENTACIÓ ACCELERADA]: La realitat es degrada ràpidament. Múltiples certeses cauen simultàniament. El protagonista ha d\'actuar sense saber què és real. Ritme fragmentat: paràgrafs curts, percepcions contradictòries.';
    } else {
      systemForCap += '\n\n[ACCELERACIÓ PRE-CLÍMAX]: Ritme urgent. Frases més curtes que la mitjana. Decisions irreversibles. Els personatges creuen ponts que no poden tornar a creuar.';
    }
  }

  // Clímax (penúltim capítol) adaptat al perfil
  if (capitolsRestants === 1) {
    if (perfil && perfil.estructura.tipusOutline === 'cicles_iniciatics') {
      systemForCap += '\n\n[EXPERIÈNCIA CULMINANT]: L\'experiència definitiva que el narrador no pot racionalitzar. Detall sensorial màxim. Estats de consciència descrits amb precisió clínica. La ment racional cedeix.';
    } else if (perfil && perfil.estructura.tipusOutline === 'degradacio_progressiva') {
      systemForCap += '\n\n[COL·LAPSE ONTOLÒGIC]: Totes les interpretacions cauen. El protagonista actua per instint moral, no per coneixement. La realitat és un camp de mines epistemològic.';
    } else {
      systemForCap += '\n\n[CLÍMAX]: Màxima tensió. Totes les subtrames convergeixen. Conflicte central al punt de no retorn.';
    }
  }

  // Resolució final (últim capítol) adaptada al perfil
  if (capitolsRestants === 0) {
    if (perfil) {
      systemForCap += '\n\n[RESOLUCIÓ FINAL — ESTIL ' + perfil.nom.toUpperCase() + ']: ' +
        perfil.clausura.instruccio + '\n' +
        'ÚLTIMA FRASE: ' + perfil.clausura.ultimaFrase + '\n' +
        perfil.clausura.prohibicions;
    } else {
      systemForCap += '\n\n[RESOLUCIÓ FINAL]: Últim capítol de la novel·la. Resol els fils oberts amb precisió. L\'última frase ha de ressonar: inevitable, definitiva, memorable.';
    }
  }

  if (fetsCanonicsText && String(fetsCanonicsText).trim()) {
    systemForCap += '\n\n=== FETS CANÒNICS RECENTS (NO CONTRADIR) ===\n' + String(fetsCanonicsText).substring(0, 2000);
  }

  // MILLORA 6: Injectar tics estilístics a evitar
  if (informeEstil && String(informeEstil).trim()) {
    systemForCap += '\n\n=== TICS ESTILÍSTICS A EVITAR ===\n' + String(informeEstil).substring(0, 1500);
  }

  var contextAnterior = '';
  if (textCapAnterior && textCapAnterior.trim()) {
    var words    = textCapAnterior.trim().split(/\s+/);
    var darreres = words.slice(-500).join(' ');
    contextAnterior = '\n\n=== FINAL DEL CAPÍTOL ANTERIOR (per continuïtat de to) ===\n' + darreres;
  }

  if (estatJson && String(estatJson).trim()) {
    contextAnterior += '\n\n=== ESTAT JSON VIGENT (context pur) ===\n' + String(estatJson).trim();
  }

  // noirExtra: fallback per a temàtiques antigues no mapeades a perfil
  var isNoir    = !perfil && tematica && /noir|negr[ae]|nòrdi/i.test(tematica);
  var noirExtra = isNoir
    ? '\n→ Aplica l\'estil Nordic Noir: prosa crua, procediments detallats, crítica social integrada, entorn nòrdic opressiu.'
    : '';

  if (partNum === 1) {
    // MILLORA 8: Generar obertura magnètica dedicada
    var oberturaFrase = '';
    try {
      oberturaFrase = generarObertura(numCapitol, outlineCapitol, textCapAnterior, biblia, estilDesc, userConfig, tematica);
    } catch (e) {
      oberturaFrase = '';
    }

    var oberturaInstr = oberturaFrase
      ? '→ OBLIGATORI: La primera frase del capítol ha de ser exactament: "' + oberturaFrase + '". Continua a partir d\'aquí.\n'
      : '';

    var part1Content =
      '=== CAPÍTOL ' + numCapitol + ' DE ' + totalCapitols + ' ===\n' +
      (outlineCapitol || '') + contextAnterior + '\n\n' +
      'Escriu la PRIMERA MEITAT d\'aquest capítol (~1500 paraules). Estil: ' + (estilDesc || '') + '.\n' +
      '→ Comença directament la narració, sense títol ni encapçalament.\n' +
      oberturaInstr +
      '→ Estableix l\'atmosfera i el conflicte central del capítol.\n' +
      '→ Planta la tensió creixent fins a un punt d\'inflexió.\n' +
      '→ Acaba en tensió màxima: talla quan la situació sigui més crítica, sense resoldre res.' + noirExtra + '\n' +
      'Escriu directament en català. Cap paraula en anglès. Cap comentari fora de la narració literària.';

    var msgs1      = [{ role: 'user', content: part1Content }];
    var resp1      = callLLM(msgs1, systemForCap, Object.assign({}, userConfig, { maxTokens: 6000 }));
    var newHistory = msgs1.concat([{ role: 'assistant', content: resp1 }]);
    return { response: resp1, history: newHistory };

  } else {
    var histBase = Array.isArray(historialPart) ? historialPart : [];

    // MILLORA 2: Generar micro-resum de la Part 1 per garantir coherència interna
    var resumPart1Prompt = [
      { role: 'user', content: 'Resumeix en exactament 3 frases el que ha passat en aquest fragment narratiu. Inclou: (1) situació inicial, (2) conflicte o tensió principal, (3) on s\'ha tallat l\'acció. Només les 3 frases, res més.\n\n' + (histBase.length > 0 && histBase[histBase.length - 1].content ? histBase[histBase.length - 1].content : '') }
    ];
    var resumPart1 = '';
    try {
      resumPart1 = callLLM(resumPart1Prompt, 'Ets un assistent que resumeix textos narratius en exactament 3 frases en català. Cap comentari addicional.', Object.assign({}, userConfig, { maxTokens: 300 }));
    } catch (e) {
      resumPart1 = '';
    }

    var objectiuBreu = (outlineCapitol || '').split('\n')[0].substring(0, 120);
    var resumContext = resumPart1 ? '\n=== RESUM DE LA PRIMERA MEITAT ===\n' + resumPart1 + '\n\n' : '';

    var part2Content =
      resumContext +
      'Continua i finalitza el capítol amb la SEGONA MEITAT (~1500 paraules).\n' +
      '→ Recull la tensió de la primera meitat i desenvolupa-la fins a la resolució del capítol.\n' +
      '→ Objectiu del capítol: ' + objectiuBreu + '\n' +
      '→ Assegura que s\'ha complert l\'objectiu narratiu al final.\n' +
      '→ Mantén exactament la mateixa veu, to i registre de la primera meitat.\n' +
      '→ L\'última frase ha de deixar el lector amb ganes de continuar.' + noirExtra + '\n' +
      'IMPORTANT: Just al final del capítol, afegeix un únic bloc ```json amb un objecte JSON vàlid que resumeixi l\'estat exacte d\'aquest moment narratiu (p. ex. inventari_protagonista, estat_fisic, ubicacio_actual).\n' +
      'Continua directament en català des d\'on s\'ha aturat. Cap paraula en anglès. Cap comentari fora de la narració literària.';

    var msgs2 = histBase.concat([{ role: 'user', content: part2Content }]);
    var resp2 = callLLM(msgs2, systemForCap, Object.assign({}, userConfig, { maxTokens: 6000 }));
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
  const systemForSubtrames = getSystemPrompt(tematica) +
    '\n\nINSTRUCCIÓ NARRATIVA OBLIGATÒRIA: TOTES les subtrames han de col·lisionar obligatòriament amb la trama principal cap a l\'Acte III o el clímax. Sempre has d\'incloure el camp "Punt de Convergència" per a cada subtrama.';
  const msgs = [
    ...history,
    {
      role: 'user',
      content: `Tenim definit el món, els personatges i l'outline de la novel·la:\n\n${contextComprimit}\n\nOUTLINE (capítols):\n${outline}\n\n---\nGenera entre 5 i 7 subtrames per a la novel·la. Cada subtrama ha de:\n- Tenir vida pròpia independent de la trama principal\n- Estar ancorada a capítols concrets de l'outline (inici, complicació i resolució)\n- Associar-se a un fil temàtic de la novel·la (amor, traïció, identitat, poder, etc.)\n- Involucrar personatges de l'elenc que no siguin sempre el protagonista\n- Col·lisionar obligatòriament amb la trama principal cap a l'Acte III o el clímax\n\nMarca amb (Recomanat) les 3 o 4 subtrames més necessàries per enriquir la novel·la.\n\nFormat ESTRICTE (una subtrama per línia, res més, sense introducció):\n1. **[Nom de la subtrama]** | Inici: Cap. N | Complicació: Cap. N | Resolució: Cap. N | Punt de Convergència: Cap. N (Acte III/Clímax) | Tema: [fil temàtic associat]\n2. **[Nom de la subtrama]** | Inici: Cap. N | Complicació: Cap. N | Resolució: Cap. N | Punt de Convergència: Cap. N (Acte III/Clímax) | Tema: [fil temàtic associat]\n3. ...\n4. ...\n5. ...\n6. ... (Recomanat)\n7. ...`
    }
  ];
  const response   = callLLM(msgs, systemForSubtrames, Object.assign({}, userConfig, { maxTokens: 2048 }));
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

# AGENTS.md — Booki

## Descripció del projecte

Booki és una aplicació web (single-file `index.html` amb JS incrustat) que transforma un conte breu en una novel·la completa mitjançant un pipeline seqüencial: configuració de models → món/personatges/veus/psicologia → disseny de trames → estructura → escaleta → escriptura de capítols amb revisió.

## Idioma

- Tot el text visible a la UI ha de ser en català.
- Tots els prompts interns enviats als LLM han de ser en català.
- Els comentaris al codi poden ser en català o anglès, però els noms de funcions i variables es mantenen tal com estan (no canviar noms existents sense instrucció explícita).

## Regles d'immutabilitat

1. **Capítols bloquejats són immutables.** Cap funció pot modificar el text d'un capítol que tingui `ESTAT._capitolsLocked[idx].locked === true`.
2. **Intervals bloquejats no es re-jutgen.** Si `ESTAT._intervalLocks[intervalId]` existeix i està bloquejat, el jutge d'interval no s'hi torna a executar.
3. **No hi ha reescriptures destructives.** Sobre capítols bloquejats només es permeten actualitzacions "gratuïtes": perfils, fets canònics, KSN. Mai retocar el text.

## Regles del jutge d'interval

- El jutge s'executa **exactament 1 vegada** per interval (single-pass). `MAX_ITER = 1`.
- Si cal reescriure capítols dins l'interval, es fa **en ordre descendent** (índex més alt primer: cap.4 → cap.3 → cap.2 → cap.1).
- Després de cada reescriptura individual, es resincronitzen registre i NKG abans de passar al capítol següent.
- Un cop el jutge acaba, l'interval queda bloquejat (`_intervalLocks`).

## Context als prompts (estalvi de tokens)

- **Capítols bloquejats** entren als prompts només com a KSN + resum curt. Mai text complet.
- **Capítols de l'interval actiu** entren com a KSN + resum llarg. Text complet només si cal verificar una contradicció factual concreta.
- **Fils narratius** entren com a estructura tipada (id, categoria, estat), no com a text lliure.

## Estructura KSN (Kernel de Seguiment Narratiu)

Cada capítol té un objecte `llibreRegistre.capitols[idx].ksn` amb:

```json
{
  "ksn_core": "string (80-140 paraules: situació final i ganxos)",
  "canon_facts": ["string (màx. 8 fets inamovibles)"],
  "character_end_state": { "nom": "ubicació + intenció + estat emocional" },
  "object_moves": [{ "objecte": "de/a + ubicació" }],
  "time_anchor": "string (opcional: data/hora si rellevant)",
  "threads_delta": {
    "opened_ids": ["màx. 3"],
    "advanced_ids": ["màx. 3"],
    "closed_ids": ["màx. 2"]
  },
  "constraints_next": ["string (màx. 6: 'No fer X / Has de mantenir Y')"]
}
```

## Fils narratius

- Límit dur: màxim **30 fils vius** simultàniament.
- Cada fil té: `id` estable, `descripció`, `categoria` (trama principal / subtrama / atmosfèric / worldbuilding / error-continuïtat), `prioritat`, `capitol_origen`, `capitol_objectiu_tancament`, `estat` (obert / avançat / tancat).
- La deduplicació es fa per `id` i per mapa d'aliassos, no per coincidència de text.
- Un fil nou ha de ser: aliàs d'un fil existent, part d'una subtrama existent, o rebutjat.

## Funcions principals (referència ràpida)

| Àrea | Funcions |
|---|---|
| Jutge d'interval | `executarJutgeInterval`, `jutgeIntervalInconsistencies`, `aplicarCorreccionsJutge` |
| Pipeline post-capítol | `arxitectePostCapitol` |
| Reescriptura | `microReescripturaBlocOpus`, `executarLoopCoherenciaFinal` |
| Seguiment narratiu | `actualitzarFilsNarratius`, `reconciliarFilsRegistre`, `generarDirectivaFils` |
| NKG | `nkgActualitzarPostEscena` |
| Diagnòstic | `exportarDiagnosticResums` |

## Estat persistent (localStorage)

- `ESTAT._capitolsLocked`: `{ [idx]: { locked, lockedAtISO, intervalId, hash } }`
- `ESTAT._intervalLocks`: `{ [intervalId]: { fromIdx, toIdx, lockedAtISO, net } }`
- Les snapshots d'ESTAT es guarden a localStorage. No trencar l'estructura existent; afegir camps nous és acceptable.

## Restriccions generals per a qualsevol canvi

- No refactoritzar funcions que no estiguin explícitament mencionades al prompt.
- No dividir `index.html` en múltiples fitxers tret que s'indiqui.
- No canviar el comportament de fases anteriors a l'escriptura de capítols (món, personatges, trames, escaleta) tret que s'indiqui.
- Preservar compatibilitat amb snapshots existents a localStorage.

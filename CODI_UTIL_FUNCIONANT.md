# Codi útil i funcionant (llibre de consolidació)

Aquest document és un **punt de consolidació** per anar separant del `index.html` gegant només les peces que:

1. tenen valor real al producte,
2. funcionen de manera estable,
3. passen una verificació mínima.

> Objectiu: reduir soroll, duplicació i regressions quan es retoca el pipeline.

---

## Com usar aquest document

Quan una funció o bloc compleixi criteris, afegeix-la aquí amb:

- **Nom de peça**
- **Responsabilitat única**
- **Dependències globals** (p.ex. `ESTAT`, `USER_CONFIG`, DOM IDs)
- **Contracte d'entrada/sortida**
- **Checks mínims de validació**
- **Ubicació actual a `index.html`**

---

## Criteris de “codi útil i funcionant”

Una peça entra aquí si compleix **tots** aquests punts:

- ✅ No introdueix errors de parseig JS (`node --check` net).
- ✅ No depèn de duplicació de UI innecessària.
- ✅ Té una responsabilitat clara i acotada.
- ✅ Es pot executar sense trencar globals bàsiques (`ESTAT`, handlers principals).
- ✅ Té verificació mínima repetible (manual o script).

---

## Inventari inicial (fase 10.x i NKG)

### 1) `tePerspectivaCronologiaPreparada()`

- **Responsabilitat**: verificar prerequisits de perspectiva/cronologia/timeline.
- **Dependències**: `ESTAT._nkg.context_creacio`, `ESTAT._nkg.timeline_accions`.
- **Contracte**: retorna `true/false` sense efectes laterals.
- **Checks mínims**:
  - retorna `false` si falta `perspectiva.tipus`.
  - retorna `false` si `pov_per_capitol` o `cronologia.per_capitol` són buits.
  - retorna `false` si `timeline_accions` és buida.

### 2) `assegurarPerspectivaCronologiaPipeline(setStatus)`

- **Responsabilitat**: injectar perspectiva+cronologia+timeline només si falten.
- **Dependències**: `tePerspectivaCronologiaPreparada`, `generarPerspectivaCronologia`, `injectarPerspectivaCronologia`, `USER_CONFIG`.
- **Contracte**:
  - si ja està preparat, no regenera.
  - si falta informació, genera i injecta.
  - actualitza estat visual via `setStatus` quan s'informa progrés.

### 3) `autocompletarNKGFaltantsManual()` (versió per passos)

- **Responsabilitat**: completar NKG pendent per fases detectables.
- **Dependències**: `detectarFaltantsNKG`, generadors/injectors de backstory, trets, objectes, mapa/regles, perspectiva/cronologia, veu.
- **Contracte**:
  - executa només passos necessaris,
  - refresca faltants després de cada pas,
  - limita passades de reintent.
- **Risc conegut**: funció gran; candidata a divisió en mòduls menors.

### 4) `selfCheckLockingInvariants()` (mode no disruptiu)

- **Responsabilitat**: avisar d'invariants de lock/jutge sense trencar el startup.
- **Contracte**: emet warnings en lloc de bloquejar inicialització.
- **Nota**: la verificació és informativa, no de control dur d'execució.

---

## Full de ruta de reducció de mida (pràctic)

1. **Consolidar** aquí una peça cada cop que es toqui i quedi estable.
2. **Retirar duplicació de UI** immediata (botons/handlers repetits).
3. **Extreure utilitats pures** (normalitzadors/validators) a fitxer separat quan sigui segur.
4. **Evitar funcions monolítiques** noves: màx. una responsabilitat per funció.
5. **Afegir smoke checks** de carregat (globals clau + parseig).

---


## Planning de migració `index.html` → `nkg_biblia.html` (fase a fase)

> Objectiu: migrar només codi útil i estable, marcant cada fase com a feta.

### Regla UX obligatòria (abans de començar)

- [ ] **No mostrar selector d'autor a la pàgina principal**.
- [ ] El selector/perfil d'autor s'ha d'activar **només després de clicar el botó de confirmar la clau API**.
- [ ] Afegir check de regressió manual: en obrir l'app, sense confirmar API, no ha d'aparèixer cap selector d'autor.

### Fase 0 — Base i esquelet del nou HTML

- [ ] Deixar `nkg_biblia.html` amb estructura mínima de cards i navegació fins fase 10.8.
- [ ] Portar només utilitats comunes imprescindibles (`escHtml`, `toast`, loaders, `showCard/hideCard`).
- [ ] Definir `ESTAT` i `USER_CONFIG` mínims per al flux NKG+Bíblia.
- [ ] Check: càrrega sense errors de consola en fred.

### Fase 1 — Configuració API i gating de UI

- [ ] Migrar bloc de configuració de proveïdor i claus API.
- [ ] Implementar `guardarClausAPI` i estat de disponibilitat de models.
- [ ] Aplicar gating: mostrar opcions d'autor/estil només després de confirmar API.
- [ ] Check: flux UI correcte amb i sense API confirmada.

### Fase 2 — Entrada narrativa mínima

- [ ] Migrar les dades d'entrada necessàries (tema, sinopsi base, personatges inicials, món base).
- [ ] Eliminar dependències de fases de redacció (11+).
- [ ] Check: es pot arribar a crear NKG inicial sense cap funció de capítols.

### Fase 3 — Construcció NKG (nucli)

- [ ] Migrar `crearNKG` i normalitzadors essencials.
- [ ] Migrar injectors de backstory/relacions/objectes/llocs/regles/perspectiva/cronologia.
- [ ] Migrar validacions `detectarFaltantsNKG` i `validarNKGPreparatPerCapitol1`.
- [ ] Check: NKG coherent serialitzable a JSON.

### Fase 4 — Compleció guiada de faltants

- [ ] Migrar `mostrarFaltantsNKG` amb botó per item.
- [ ] Migrar `generarFaltantNKG` i mapatge `obtenirAccioGeneracioPerFaltant`.
- [ ] Garantir que els botons desapareixen quan el faltant queda resolt.
- [ ] Check: cada item es pot generar individualment sense trencar la resta.

### Fase 5 — Backstory i graf de relacions robust

- [ ] Migrar `generarBackstoryIRelacions` i `validarBackstoryIRelacions`.
- [ ] Mantenir fallback local amb `construirGrafRelacionsMinim`.
- [ ] Assegurar que mai es queda `relacions: []` si hi ha >=2 personatges.
- [ ] Check: no apareix "Falta graf de relacions" després de generar/fallback.

### Fase 6 — Perspectiva, cronologia i veu (fins 10.8)

- [ ] Migrar `tePerspectivaCronologiaPreparada` + `assegurarPerspectivaCronologiaPipeline`.
- [ ] Migrar fase 10.7 i 10.8 (sense entrar a redacció capítols).
- [ ] Migrar compleció de veu/exemples només com a prerequisit NKG.
- [ ] Check: en acabar 10.8, validació NKG completa en verd.

### Fase 7 — Exportació NKG + Bíblia

- [ ] Migrar exportadors mínims (`descarregarNKGiBiblia` i context necessari).
- [ ] Verificar export JSON i consistència de camps.
- [ ] Check: fitxer exportat usable i sense camps crítics buits.

### Fase 8 — Neteja final i tancament

- [ ] Eliminar codi mort i referències a fases 11+ del nou HTML.
- [ ] Revisar duplicacions de UI/handlers.
- [ ] Actualitzar aquest document marcant fases completades.
- [ ] Check final: parseig net + smoke end-to-end fins NKG/Bíblia.

### Criteri de "Fase feta"

Una fase només es marca com feta si compleix:

- [ ] Parseig JS net (`node --check`).
- [ ] Sense `ReferenceError` a startup.
- [ ] Prova manual del flux de la fase superada.
- [ ] Documentació actualitzada en aquest fitxer.

## Protocol curt abans de merge

- `node --check` del JS extret d'`index.html`
- càrrega de pàgina sense `ReferenceError` crítics a startup
- prova manual de flux afectat (mínim happy-path)

Si falla algun punt, la peça **no entra** a aquest document com a “funcionant”.

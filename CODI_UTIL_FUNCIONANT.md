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

## Protocol curt abans de merge

- `node --check` del JS extret d'`index.html`
- càrrega de pàgina sense `ReferenceError` crítics a startup
- prova manual de flux afectat (mínim happy-path)

Si falla algun punt, la peça **no entra** a aquest document com a “funcionant”.

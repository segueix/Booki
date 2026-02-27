import { useMemo, useState } from 'react';

/**
 * Model simplificat de l'estat global.
 */
const ESTAT_INICIAL = {
  fase: 1,
  premissaTriada: '',
  protagonistaTriat: '',
  localitzacioTriada: '',
  bibliaNarrativa: '',
  conteText: '',
};

const SECCIONS = [
  {
    id: 'premissa',
    etiqueta: '1) Premissa',
    camp: 'premissaTriada',
    fase: 1,
    tipus: 'text',
    placeholder: 'Escriu o edita la premissa...',
  },
  {
    id: 'protagonista',
    etiqueta: '2) Protagonista',
    camp: 'protagonistaTriat',
    fase: 2,
    tipus: 'text',
    placeholder: 'Descripció del protagonista...',
  },
  {
    id: 'localitzacio',
    etiqueta: '3) Localització',
    camp: 'localitzacioTriada',
    fase: 3,
    tipus: 'text',
    placeholder: 'Detalls de l\'escenari...',
  },
  {
    id: 'biblia',
    etiqueta: '4) Bíblia narrativa',
    camp: 'bibliaNarrativa',
    fase: 4,
    tipus: 'json',
    placeholder: '{\n  "to": "narratiu"\n}',
  },
  {
    id: 'conte',
    etiqueta: '9) Conte generat',
    camp: 'conteText',
    fase: 9,
    tipus: 'text',
    placeholder: 'Capítols generats...',
  },
];

function teValor(valor) {
  if (valor == null) return false;
  if (typeof valor === 'string') return valor.trim().length > 0;
  if (typeof valor === 'object') return Object.keys(valor).length > 0;
  return true;
}

function EditorCamp({ seccio, valor, onCanvi }) {
  const textValor =
    seccio.tipus === 'json' && typeof valor === 'object'
      ? JSON.stringify(valor, null, 2)
      : (valor ?? '');

  return (
    <textarea
      value={textValor}
      rows={8}
      placeholder={seccio.placeholder}
      onChange={(e) => {
        const nouValor = e.target.value;

        if (seccio.tipus === 'json') {
          try {
            const json = nouValor.trim() ? JSON.parse(nouValor) : '';
            onCanvi(json);
          } catch {
            // Si el JSON encara no és vàlid, guardem text temporal per no bloquejar l'edició.
            onCanvi(nouValor);
          }
          return;
        }

        onCanvi(nouValor);
      }}
      style={{ width: '100%', resize: 'vertical' }}
    />
  );
}

function AcordioSeccio({ titol, obertPerDefecte = false, children }) {
  return (
    <details open={obertPerDefecte} style={{ border: '1px solid #ddd', borderRadius: 8, marginBottom: 12, padding: 8 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{titol}</summary>
      <div style={{ marginTop: 10 }}>{children}</div>
    </details>
  );
}

function controlsPerFase(fase) {
  if (fase < 2) return 'Generar protagonista';
  if (fase < 3) return 'Generar localització';
  if (fase < 4) return 'Construir bíblia narrativa';
  if (fase < 9) return 'Generar següent bloc del conte';
  return 'Continuar refinant el conte';
}

export default function MainView() {
  const [estat, setEstat] = useState(ESTAT_INICIAL);

  const seccionsCompletades = useMemo(
    () => SECCIONS.filter((s) => teValor(estat[s.camp])),
    [estat],
  );

  const seccioActiva = useMemo(() => {
    const faseEntera = Math.floor(estat.fase || 1);
    return (
      SECCIONS.find((s) => s.fase === faseEntera) ||
      SECCIONS[SECCIONS.length - 1]
    );
  }, [estat.fase]);

  const actualitzaCamp = (camp, valor) => {
    setEstat((prev) => ({ ...prev, [camp]: valor }));
  };

  const importaJSON = (textJSON) => {
    const historial = JSON.parse(textJSON);
    setEstat((prev) => ({ ...prev, ...historial }));
  };

  const exportaJSON = () => {
    const serialitzat = JSON.stringify(estat, null, 2);
    console.log(serialitzat);
  };

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h1>Editor de novel·la per fases</h1>

      {/* Exemple ràpid d'importació */}
      <button
        type="button"
        onClick={() => importaJSON(prompt('Enganxa el JSON de l\'historial') || '{}')}
      >
        Importar historial JSON
      </button>

      <button type="button" onClick={exportaJSON} style={{ marginLeft: 8 }}>
        Exportar JSON
      </button>

      <section style={{ marginTop: 20 }}>
        <h2>Seccions amb dades (renderitzat data-driven)</h2>
        {seccionsCompletades.length === 0 && (
          <p>Encara no hi ha dades completades.</p>
        )}

        {seccionsCompletades.map((seccio) => (
          <AcordioSeccio key={seccio.id} titol={seccio.etiqueta}>
            <EditorCamp
              seccio={seccio}
              valor={estat[seccio.camp]}
              onCanvi={(valor) => actualitzaCamp(seccio.camp, valor)}
            />
          </AcordioSeccio>
        ))}
      </section>

      <section style={{ marginTop: 24, borderTop: '2px solid #111', paddingTop: 16 }}>
        <h2>Secció activa (fase actual: {estat.fase})</h2>
        <AcordioSeccio titol={seccioActiva.etiqueta} obertPerDefecte>
          <EditorCamp
            seccio={seccioActiva}
            valor={estat[seccioActiva.camp]}
            onCanvi={(valor) => actualitzaCamp(seccioActiva.camp, valor)}
          />

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setEstat((prev) => ({ ...prev, fase: Number((prev.fase + 1).toFixed(1)) }))}
            >
              {controlsPerFase(estat.fase)}
            </button>
          </div>
        </AcordioSeccio>
      </section>
    </main>
  );
}

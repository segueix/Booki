# ⚡ GUIA RÀPIDA - 2 MINUTS!

## 📥 PAS 1: Descomprimeix

```bash
tar -xzf youtube-classic.tar.gz
cd youtube-classic
```

## 🌐 PAS 2: Prova-ho Localment

**Opció A: Simplement obre el fitxer**
```
Doble clic a index.html
```

**Opció B: Amb servidor local**
```bash
python -m http.server 8000
# Obre: http://localhost:8000
```

## 🚀 PAS 3: Puja a GitHub

```bash
git init
git add .
git commit -m "Primera versió"
git remote add origin https://github.com/USUARI/REPO.git
git branch -M main
git push -u origin main
```

## 🔧 PAS 4: Activa GitHub Pages

1. Ves al teu repositori
2. **Settings** → **Pages**
3. **Source**: Selecciona `main` branch (NO cal GitHub Actions!)
4. **Espera 1 minut**

**La teva web:** `https://USUARI.github.io/REPO/`

---

## 🎨 PERSONALITZAR

### Canviar nom i colors:
**Edita:** `js/config.js`

```javascript
branding: {
    name: "Vídeos Catalans"
},
theme: {
    primaryColor: "#FFD700"
}
```

### Afegir vídeos:
**Edita:** `js/data.js`

```javascript
{
    id: 7,
    title: "El meu vídeo",
    videoUrl: "https://www.youtube.com/embed/VIDEO_ID",
    // ...
}
```

### Després de canvis:
```bash
git add .
git commit -m "Canvis"
git push
```

**Refresca la pàgina en 30 segons!** ⚡

---

## ✅ AVANTATGES

- ❌ **NO necessita Node.js**
- ❌ **NO necessita compilar**
- ❌ **NO necessita npm install**
- ✅ **Funciona directament**
- ✅ **Edita i refresca**
- ✅ **100KB** de mida total
- ✅ **PWA** (instal·lable com app)

---

## 📂 ON ESTÀ CADA COSA

- **Configuració:** `js/config.js` ← Colors, nom, funcions
- **Dades:** `js/data.js` ← Vídeos, canals
- **Estils:** `css/styles.css` ← Disseny
- **Lògica:** `js/app.js` ← Funcionament

---

## 🎯 DIFERÈNCIA CLAU

| Versió React | Versió Clàssica |
|--------------|-----------------|
| npm install | ❌ No necessari |
| npm run build | ❌ No necessari |
| GitHub Actions | ❌ No necessari |
| Node.js | ❌ No necessari |
| Mida: 2MB | ✅ Mida: 100KB |
| Editar → Compilar | ✅ Editar → Refresca |

---

## ✨ AIXÒ ÉS TOT!

**Temps total: 2 minuts des de descomprimir fins web en línia!** ⏱️

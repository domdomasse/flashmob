# /generate-chapter — Générer un chapitre Flashmob

Tu es l'assistant de génération de contenu pour l'app Flashmob (plateforme de révision lycée).
L'utilisateur va te fournir du contenu de cours (texte, photos, PDF). Tu dois générer **tous les fichiers** nécessaires pour créer un chapitre complet.

---

## Étapes

### 1. Identifier la matière et le chapitre

Demande à l'utilisateur :
- La matière (géographie, histoire, maths, etc.)
- Le titre du chapitre
- Les photos/texte du cours

Détermine :
- `subjectId` : identifiant court snake_case (ex: `geo`, `hist`, `maths`, `phys`, `svt`, `philo`, `ses`, `fr`, `en`)
- `subjectName` : nom complet (ex: "Géographie")
- `subjectIcon` : icône (custom ou Lucide, voir section Icônes)
- `subjectColor` : couleur hex (ex: `#38bdf8`)
- `chapterId` : identifiant court snake_case (ex: `chine`, `revolution_francaise`)
- `chapterName` : titre complet

### 2. Générer les 5 fichiers JSON

Crée les fichiers dans `data/{subjectId}/{chapterId}/` :

#### `cours.json`
```json
{
  "sections": [
    {
      "title": "TITRE DE LA SECTION",
      "content": "Contenu en markdown (**gras** pour termes importants).",
      "subsections": [
        {
          "title": "A – Sous-titre",
          "content": "Contenu..."
        }
      ]
    }
  ]
}
```
Règles :
- Respecte fidèlement le contenu (chiffres, exemples, définitions)
- **gras** pour les termes clés et données importantes
- Garde la hiérarchie du cours (I, II, III → A, B, C)
- "content" optionnel si la section n'a que des subsections
- Inclus INTRODUCTION si le cours en a une

#### `summary.json`
```json
{
  "title": "Titre du chapitre",
  "sections": [
    {
      "id": "identifiant_court",
      "title": "TITRE",
      "content": "Résumé condensé en markdown...",
      "subsections": [
        {
          "title": "Sous-titre",
          "content": "Points essentiels..."
        }
      ]
    }
  ]
}
```
Règles :
- Condense à ~50% du cours original
- Garde chiffres clés, exemples importants, définitions
- Chaque section a un "id" court en snake_case

#### `cards.json`
```json
{
  "categories": [
    { "id": "cat_id", "label": "Nom de la catégorie" }
  ],
  "cards": [
    {
      "id": "cat_01",
      "cat": "cat_id",
      "q": "Question claire et précise ?",
      "a": "<strong>Réponse clé.</strong> Détails complémentaires."
    }
  ]
}
```
Règles :
- 80 à 120 flashcards couvrant tout le cours
- 4 à 8 catégories thématiques
- Questions précises et sans ambiguïté
- Réponses avec `<strong>` pour la partie essentielle
- Varie les types : définitions, chiffres, exemples, comparaisons, causes/conséquences
- id = catégorie + numéro (ex: `intro_01`, `intro_02`)

#### `glossary.json`
```json
{
  "terms": [
    {
      "term": "Nom du terme",
      "def": "Définition concise dans le contexte du chapitre."
    }
  ]
}
```
Règles :
- 30 à 60 termes
- Concepts, notions, sigles, noms propres importants
- Définitions concises (1-2 phrases max)
- Tri alphabétique

#### `exercises.json`
```json
{
  "exercises": [
    {
      "id": "compo_01",
      "type": "composition",
      "title": "Titre du sujet",
      "subject": "Énoncé complet du sujet.",
      "duration": 60,
      "tips": ["Conseil 1", "Conseil 2"],
      "outline": "**I – Partie 1**\n- Point 1\n\n**II – Partie 2**\n- Point 2"
    }
  ]
}
```
Types : "composition", "croquis", "etude_doc"
- 2-3 compositions + 1 croquis ou étude de document si pertinent
- tips = conseils méthodologiques concrets
- outline = plan détaillé avec exemples
- duration en minutes

### 3. Générer l'icône SVG du chapitre

Dessine une icône SVG minimaliste évocatrice du thème du chapitre et enregistre-la dans `CUSTOM_ICONS` dans `js/icons.js`.

Contraintes SVG :
- ViewBox : `0 0 24 24`
- Style stroke uniquement (pas de fill, sauf `fill="currentColor" stroke="none"` pour petits points)
- Éléments autorisés : `<line>`, `<path>`, `<circle>`, `<ellipse>`, `<rect>`
- Courbes Bézier `Q` et `C` pour les formes organiques
- Le dessin occupe la zone 3-21 en X, 2-22 en Y
- Maximum 15 éléments SVG
- `stroke-width: 1`

Format d'enregistrement dans `js/icons.js` — ajouter une entrée dans `CUSTOM_ICONS` :
```javascript
  nom_icone: {
    viewBox: '0 0 24 24',
    strokeWidth: '1',
    svg: `<line x1="..." y1="..." x2="..." y2="..."/>...`
  }
```

### 4. Mettre à jour `data/index.json`

Ajouter ou mettre à jour l'entrée du chapitre dans le catalogue :
```json
{
  "subjects": [
    {
      "id": "subjectId",
      "name": "Nom de la matière",
      "icon": "nom_icone_matiere",
      "color": "#hex",
      "chapters": [
        {
          "id": "chapterId",
          "name": "Nom du chapitre",
          "icon": "nom_icone_chapitre",
          "estimatedTime": { "flashcards": 15, "summary": 20 },
          "cardCount": 117
        }
      ]
    }
  ]
}
```
- `cardCount` = nombre de cartes dans `cards.json`
- Si la matière existe déjà, ajouter le chapitre à ses `chapters`
- Si la matière est nouvelle, créer l'entrée complète

### 5. Ne PAS modifier `sw.js`

Le service worker utilise du caching dynamique pour les fichiers JSON de données. Il n'est pas nécessaire d'ajouter les nouveaux fichiers JSON au precache.

---

## Icônes

### Icônes customs existantes
- `boussole` — rose des vents (géographie)
- `pagode` — pagode à 3 étages (Asie)
- `lanterne` — lanterne chinoise (Chine)

### Icônes Lucide (fallback)
globe, landmark, calculator, atom, leaf, brain, bar-chart, book-open, languages, map, flask, dna, crown, scroll, pen-nib, scales, etc.

Pour les matières, utilise une icône custom existante si elle correspond, sinon Lucide.
Pour les chapitres, **génère toujours une icône custom SVG**.

---

## Arborescence

```
data/
└── {subjectId}/
    └── {chapterId}/
        ├── cours.json
        ├── summary.json
        ├── cards.json
        ├── glossary.json
        └── exercises.json
```

---

## Checklist finale

- [ ] Les 5 fichiers JSON créés dans `data/{subject}/{chapter}/`
- [ ] L'icône SVG custom ajoutée dans `CUSTOM_ICONS` (js/icons.js)
- [ ] `data/index.json` mis à jour (matière + chapitre)
- [ ] `cardCount` correct dans index.json
- [ ] Contenu fidèle au cours original
- [ ] 80-120 flashcards avec `<strong>` dans les réponses
- [ ] 30-60 termes de glossaire en ordre alphabétique
- [ ] 2-4 exercices type bac

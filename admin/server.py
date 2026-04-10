#!/usr/bin/env python3
"""Flashmob Admin — Serveur local pour générer du contenu de chapitre."""

import http.server
import json
import os
import re
import urllib.request
import urllib.error
from pathlib import Path

PORT = 8090
FLASHMOB_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = FLASHMOB_DIR / 'data'

# ── Prompts par étape ────────────────────────────────────────────────

def get_prompt(config, step, course_text=''):
    name = config.get('chapterName', '')
    subject = config.get('subjectName', config.get('subject', ''))

    if step == 'analyze':
        return """Analyse ces pages de cours d'un lycéen français.

Identifie :
- La matière (géographie, histoire, mathématiques, physique-chimie, SVT, philosophie, SES, français, anglais, etc.)
- Le titre complet du chapitre
- Un identifiant court pour la matière (ex: geo, hist, maths, phys, svt, philo, ses, fr, en)
- Un identifiant court pour le chapitre en snake_case (ex: chine, revolution_francaise, derivation)
- Une icône Lucide adaptée à la matière (ex: globe pour géo, landmark pour histoire, calculator pour maths, atom pour physique, leaf pour SVT, brain pour philo, bar-chart pour SES, book-open pour français, languages pour anglais)
- Une icône Lucide adaptée au chapitre
- Une couleur hex adaptée à la matière

Réponds UNIQUEMENT avec ce JSON :

```json
{
  "subjectId": "geo",
  "subjectName": "Géographie",
  "subjectIcon": "globe",
  "subjectColor": "#38bdf8",
  "chapterName": "La Chine : recompositions spatiales",
  "chapterId": "chine",
  "chapterIcon": "map"
}
```"""

    if step == 'cours':
        return f"""Analyse ces pages de cours de {subject} sur le chapitre « {name} ».

Extrais et structure le contenu en JSON avec ce format exact :

```json
{{
  "sections": [
    {{
      "title": "TITRE DE LA SECTION",
      "content": "Contenu en markdown (utilise **gras** pour les termes importants).",
      "subsections": [
        {{
          "title": "A – Sous-titre",
          "content": "Contenu de la sous-section..."
        }}
      ]
    }}
  ]
}}
```

Règles :
- Respecte fidèlement le contenu du cours (chiffres, exemples, définitions)
- Utilise **gras** pour les termes clés et les données importantes
- Garde la structure hiérarchique du cours (I, II, III → A, B, C)
- Le champ "content" est optionnel pour les sections qui n'ont que des subsections
- Inclus une section INTRODUCTION si le cours en a une
- Réponds UNIQUEMENT avec le JSON, sans texte autour"""

    if step == 'summary':
        return f"""À partir de ce cours de {subject} sur « {name} », génère un résumé condensé pour la révision.

Cours complet :
{course_text}

Format JSON attendu :

```json
{{
  "title": "{name}",
  "sections": [
    {{
      "id": "identifiant_court",
      "title": "TITRE",
      "content": "Résumé condensé en markdown...",
      "subsections": [
        {{
          "title": "Sous-titre",
          "content": "Points essentiels..."
        }}
      ]
    }}
  ]
}}
```

Règles :
- Condense à ~50% du cours original
- Garde les chiffres clés, exemples importants, définitions
- **Gras** pour les termes et données essentiels
- Chaque section a un "id" court en snake_case
- Réponds UNIQUEMENT avec le JSON"""

    if step == 'cards':
        return f"""À partir de ce cours de {subject} sur « {name} », génère des flashcards de révision pour un lycéen préparant le bac.

Cours complet :
{course_text}

Format JSON attendu :

```json
{{
  "categories": [
    {{ "id": "cat_id", "label": "Nom de la catégorie" }}
  ],
  "cards": [
    {{
      "id": "cat_01",
      "cat": "cat_id",
      "q": "Question claire et précise ?",
      "a": "<strong>Réponse clé.</strong> Détails complémentaires."
    }}
  ]
}}
```

Règles :
- Crée entre 80 et 120 flashcards couvrant tout le cours
- 4 à 8 catégories thématiques
- Questions précises et sans ambiguïté
- Réponses avec <strong> pour la partie essentielle
- Varie les types : définitions, chiffres, exemples, comparaisons, causes/conséquences
- id = catégorie + numéro (ex: intro_01, intro_02)
- Réponds UNIQUEMENT avec le JSON"""

    if step == 'glossary':
        return f"""À partir de ce cours de {subject} sur « {name} », génère un glossaire des termes et concepts clés.

Cours complet :
{course_text}

Format JSON attendu :

```json
{{
  "terms": [
    {{
      "term": "Nom du terme",
      "def": "Définition concise et claire dans le contexte du chapitre."
    }}
  ]
}}
```

Règles :
- Entre 30 et 60 termes
- Inclus : concepts, notions, sigles, noms propres importants
- Définitions concises (1-2 phrases max)
- Tri alphabétique
- Réponds UNIQUEMENT avec le JSON"""

    if step == 'exercises':
        return f"""À partir de ce cours de {subject} sur « {name} », génère des exercices type bac.

Cours complet :
{course_text}

Format JSON attendu :

```json
{{
  "exercises": [
    {{
      "id": "compo_01",
      "type": "composition",
      "title": "Titre du sujet",
      "subject": "Énoncé complet du sujet.",
      "duration": 60,
      "tips": ["Conseil 1", "Conseil 2"],
      "outline": "**I – Partie 1**\\n- Point 1\\n\\n**II – Partie 2**\\n- Point 2"
    }}
  ]
}}
```

Types possibles : "composition", "croquis", "etude_doc"
- 2-3 compositions + 1 croquis ou étude de document si pertinent
- Tips = conseils méthodologiques concrets
- Outline = plan détaillé avec exemples
- duration en minutes
- Réponds UNIQUEMENT avec le JSON"""

    return ''


def flatten_cours(cours_data):
    """Convertit cours.json en texte lisible pour les prompts suivants."""
    lines = []
    for section in cours_data.get('sections', []):
        lines.append(f"\n## {section['title']}\n")
        if section.get('content'):
            lines.append(section['content'])
        for sub in section.get('subsections', []):
            lines.append(f"\n### {sub['title']}\n")
            if sub.get('content'):
                lines.append(sub['content'])
    return '\n'.join(lines)


# ── Appel API Claude ─────────────────────────────────────────────────

def call_claude(api_key, images, config, step, course_text=''):
    prompt = get_prompt(config, step, course_text)

    content = []

    # Envoyer les images pour analyze et cours
    if step in ('analyze', 'cours'):
        for img in images:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": img['type'],
                    "data": img['data']
                }
            })

    content.append({"type": "text", "text": prompt})

    body = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 16000,
        "messages": [{"role": "user", "content": content}]
    }).encode('utf-8')

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
    )

    resp = urllib.request.urlopen(req, timeout=180)
    result = json.loads(resp.read())
    text = result['content'][0]['text']

    # Extraire le JSON de la réponse
    m = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    raw = m.group(1) if m else text.strip()

    return json.loads(raw)


# ── Mise à jour index.json & sw.js ───────────────────────────────────

def update_index(config, card_count):
    index_path = DATA_DIR / 'index.json'

    if index_path.exists():
        with open(index_path, 'r', encoding='utf-8') as f:
            catalog = json.load(f)
    else:
        catalog = {"subjects": []}

    # Trouver ou créer la matière
    subject = next((s for s in catalog['subjects'] if s['id'] == config['subject']), None)

    if not subject:
        subject = {
            "id": config['subject'],
            "name": config.get('subjectName', config['subject']),
            "icon": config.get('subjectIcon', 'book'),
            "color": config.get('subjectColor', '#38bdf8'),
            "chapters": []
        }
        catalog['subjects'].append(subject)

    # Trouver ou créer le chapitre
    chapter = next((c for c in subject['chapters'] if c['id'] == config['chapterId']), None)

    if chapter:
        chapter['name'] = config['chapterName']
        chapter['icon'] = config.get('icon', 'file-text')
        chapter['cardCount'] = card_count
    else:
        subject['chapters'].append({
            "id": config['chapterId'],
            "name": config['chapterName'],
            "icon": config.get('icon', 'file-text'),
            "estimatedTime": {"flashcards": 15, "summary": 20},
            "cardCount": card_count
        })

    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
        f.write('\n')


def update_sw(config):
    sw_path = FLASHMOB_DIR / 'sw.js'
    if not sw_path.exists():
        return

    with open(sw_path, 'r', encoding='utf-8') as f:
        content = f.read()

    prefix = f"./data/{config['subject']}/{config['chapterId']}"

    # Déjà présent ?
    if prefix in content:
        return

    new_lines = '\n'.join([
        f"  '{prefix}/cards.json',",
        f"  '{prefix}/summary.json',",
        f"  '{prefix}/exercises.json',",
        f"  '{prefix}/cours.json',",
        f"  '{prefix}/glossary.json',"
    ])

    # Insérer avant le ];
    content = content.replace(
        "];\n\n// Install",
        f"{new_lines}\n];\n\n// Install"
    )

    with open(sw_path, 'w', encoding='utf-8') as f:
        f.write(content)


# ── Serveur HTTP ─────────────────────────────────────────────────────

class AdminHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)

    def log_message(self, fmt, *args):
        print(f"  {args[0]}")

    def do_POST(self):
        routes = {
            '/api/subjects': self.handle_subjects,
            '/api/generate': self.handle_generate,
            '/api/save': self.handle_save,
        }
        handler = routes.get(self.path)
        if handler:
            handler()
        else:
            self.send_error(404)

    def read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(length))

    def respond_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def handle_subjects(self):
        index_path = DATA_DIR / 'index.json'
        if index_path.exists():
            with open(index_path, 'r', encoding='utf-8') as f:
                self.respond_json(json.load(f))
        else:
            self.respond_json({"subjects": []})

    def handle_generate(self):
        data = self.read_body()
        api_key = data['apiKey']
        images = data.get('images', [])
        config = data['config']
        step = data['step']
        course_text = data.get('courseText', '')

        try:
            result = call_claude(api_key, images, config, step, course_text)
            self.respond_json({"ok": True, "result": result})
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            self.respond_json({"ok": False, "error": f"API {e.code}: {err}"}, 500)
        except Exception as e:
            self.respond_json({"ok": False, "error": str(e)}, 500)

    def handle_save(self):
        data = self.read_body()
        config = data['config']
        files = data['files']

        chapter_dir = DATA_DIR / config['subject'] / config['chapterId']
        chapter_dir.mkdir(parents=True, exist_ok=True)

        for name, content in files.items():
            with open(chapter_dir / f'{name}.json', 'w', encoding='utf-8') as f:
                json.dump(content, f, ensure_ascii=False, indent=2)
                f.write('\n')

        card_count = len(files.get('cards', {}).get('cards', []))
        update_index(config, card_count)
        update_sw(config)

        self.respond_json({"ok": True, "path": str(chapter_dir)})


if __name__ == '__main__':
    print(f"\n  Flashmob Admin")
    print(f"  http://localhost:{PORT}")
    print(f"  Data: {DATA_DIR}\n")
    server = http.server.HTTPServer(('127.0.0.1', PORT), AdminHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Arrêt.")

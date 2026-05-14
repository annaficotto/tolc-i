from pathlib import Path

# Codice da inserire
SCRIPT_TAG = '''<script src="https://cdn.counter.dev/script.js" data-id="0b8a28a7-bd9e-4970-aa87-bd107e273a32" data-utcoffset="1"></script>'''

# Cartella del progetto (usa "." se lo script è dentro il progetto)
PROJECT_DIR = "."

for html_file in Path(PROJECT_DIR).rglob("*.html"):
    content = html_file.read_text(encoding="utf-8")

    # Evita duplicati
    if "cdn.counter.dev/script.js" in content:
        print(f"Già presente: {html_file}")
        continue

    # Inserisce prima di </head>
    if "</head>" in content:
        new_content = content.replace(
            "</head>",
            f"    {SCRIPT_TAG}\n</head>"
        )

        html_file.write_text(new_content, encoding="utf-8")
        print(f"Aggiornato: {html_file}")
    else:
        print(f"Nessun </head> trovato in: {html_file}")

print("Fatto!")
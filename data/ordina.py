import json

nome_file = input("nome file: ")

# Carica il file JSON
with open(f'data\{nome_file}.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Ordine desiderato degli ID (senza il prefisso "Q")
ordine_ids = [
    "88",
    "73",
    "71",
    "75",
    "67",
    "86",
    "69",
    "85",
    "83",
    "80",
    "90",
    "78",
    "89",
    "84",
    "66",
    "79",
    "64",
    "76",
    "70",
    "87",
    "65",
    "63",
    "81",
    "74",
    "61",
    "68",
    "62",
    "82",
    "77",
    "72"
]

# Crea un dizionario per accesso rapido alle domande
domande_dict = {q['id']: q for q in data['questions']}

# Costruisce la nuova lista nell'ordine desiderato
nuove_domande = []
for id_num in ordine_ids:
    id_str = f"Q{id_num}"  # Gli ID nel file sono del tipo "Q01", "Q02", ...
    if id_str in domande_dict:
        nuove_domande.append(domande_dict[id_str])
    else:
        print(f"Attenzione: ID {id_str} non trovato nel file JSON.")

# Sostituisce la lista originale
data['questions'] = nuove_domande

# Salva il file riordinato
with open(f'data\{nome_file}.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Riordinamento completato. File salvato come '{nome_file}.json'.")
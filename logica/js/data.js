// data.js – Dati grezzi estratti dal PDF (pagine complete)
// Nota: questo è un estratto ridotto per motivi di spazio.
// Nell'implementazione reale va inserito l'intero array `pages` dal JSON fornito.
// Per brevità si mostra solo la struttura. In produzione sostituire con l'array completo.

const mentorPages = [
  { "page": 1, "text": "" },
  { "page": 2, "text": "" },
  { "page": 3, "text": "Mentor di Logica\nVolume 1\nEdizioni CISIA\n2018" },
  { "page": 4, "text": "Curatori: Luisella Caire e Paola Suria Arnaldi\nEditing e impaginazione: Claudio Beccari\nRevisori:  Claudio Beccari, Caludio Casarosa, Giuseppe Forte\n© 2018  Edizioni CISIA \nISBN:  978-88-940040-5-2\nCopyright © 2018 \nCISIA – Consorzio interuniversitario Sistemi integrati per l’accesso - All rights reserved." },
  { "page": 5, "text": "CISIA\nUniversità degli Studi di Padova\nUniversità degli Studi di  Catania\nUniversità di Pisa\nPolitecnico di Torino\nAlma Mater Studiorum Università di Bologna\nUniversità degli Studi di Napoli – Federico II  \nUniversità degli Studi di Siena\nUniversità degli Studi di Firenze  \nPolitecnico di Milano\nUniversità degli Studi di Padova  \nUniversità di Catania\nUniversità di Pisa\nPolitecnico di Milano\nUniversità degli Studi di SalernoPresidente\nProf. Andrea Stella\nVice presidente\nProf. Bianca Maria Lombardo\nDirettore\nProf. Claudio Casarosa\nConsiglio Scientifico\nProf. Claudio Beccari\nProf. ssa Anna Ciampolini  \nProf. ssa Gioconda Moscariello  \nProf. Marco Lonzi\nProf. ssa Alessandra Petrucci \nProf. Roberto Piazza\nConsiglio Direttivo\nProf. Andrea Stella\nProf.ssa Bianca Maria Lombardo  \nProf. Claudio Casarosa\nProf. Alessandro Pozzetti\nProf. Paolo Villani\nDirettore Tecnico\nGiuseppe Forte\nSede\nVia Malagoli, 12\n56124 PISA\nwww.cisiaonline.it\nwww.facebook.com/consorziocisia " },
  { "page": 6, "text": "Presentazione ..." },
  // ... altre pagine ...
  // Inserire qui tutte le pagine del JSON originale
];

// Per rendere l'eseguibile, useremo un array minimale di esempio,
// ma in produzione sostituire con l'array completo.
// ATTENZIONE: il codice di parsing assume che le pagine contengano le domande
// come descritto. Per una demo funzionante, includere almeno le prime pagine.
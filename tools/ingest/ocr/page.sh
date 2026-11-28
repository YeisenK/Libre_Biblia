#!/bin/bash
# page.sh <jp2> <outdir>  — preprocesa y OCR de un cuerpo de página (reanudable)
f="$1"; out="$2"; b=$(basename "$f" .jp2); n=${b##*_}
[ -s "$out/$n.tsv" ] && exit 0
mkdir -p "$out"; tmp=$(mktemp -d /tmp/taocr.XXXXXX)
D=/home/void/BibliaCatolica/tools/ingest/ocr
python3 -I $D/prep.py "$f" "$tmp/body.png" "$tmp/notes.png" "$out/$n.json" 2>/dev/null
export OMP_THREAD_LIMIT=1 TESSDATA_PREFIX=/home/void/BibliaCatolica/tools/ingest/raw/tessdata
tesseract "$tmp/body.png" "$tmp/o" -l spa --psm 4 tsv txt >/dev/null 2>&1
mv "$tmp/o.txt" "$out/$n.txt"; mv "$tmp/o.tsv" "$out/$n.tsv"
rm -rf "$tmp"

#!/bin/bash
# runvol.sh <carpeta de imágenes> <nombre>
find "$1" -name '*.jp2' | sort | xargs -P 18 -I{} /home/void/BibliaCatolica/tools/ingest/ocr/page.sh {} /home/void/BibliaCatolica/tools/ingest/raw/TA-ocr/$2
echo DONE $2

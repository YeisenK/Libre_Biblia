#!/bin/bash
cd /home/void/BibliaCatolica/tools/ingest
for v in lasagradabiblian04torr lasagradabiblian06torr lasagradabiblian08torr lasagradabiblian10torr lasagradabiblian12torr lasagradabiblian1415torr La_sagrada_Biblia_Vol_1-2 lasagradabiblian1617torr lasagradabiblian13torr; do ocr/runvol.sh raw/TA-scans/img/$v/* $v; done
echo ALLOCRDONE

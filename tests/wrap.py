"""Copy the game into tests/game.html for the Playwright scripts.

index.html in this repo is already a complete document; a fragment (as published
to a Claude artifact) gets the minimal document shell added around it.
"""
import sys

src = open(sys.argv[1]).read()
if src.lstrip().lower().startswith('<!doctype'):
    out = src
else:
    out = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
           '<style>[hidden]{display:none!important}</style></head><body>' + src + '</body></html>')
open(sys.argv[2], 'w').write(out)

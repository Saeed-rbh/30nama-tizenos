#!/usr/bin/env python3
"""Produce an UNSIGNED widget for subsequent Tizen signing; never installs it."""
import argparse
import hashlib
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('output', type=Path)
args = p.parse_args()
app = root / 'tizen-app'
ET.parse(app / 'config.xml')
args.output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(args.output, 'w', compression=ZIP_DEFLATED) as z:
    for f in sorted(app.rglob('*')):
        rel = f.relative_to(app)
        if not f.is_file() or any(x.startswith('.') for x in rel.parts) or rel.parts[0] == 'tools':
            continue
        if f.name in ('author-signature.xml', 'signature1.xml', 'tmdb-token.js') or f.suffix in ('.p12', '.pwd', '.wgt'):
            continue
        info = ZipInfo(rel.as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        z.writestr(info, f.read_bytes())
    z.writestr('js/tmdb-token.js', '/* Optional TMDB integration disabled; no personal tokens packaged. */\n')
print('UNSIGNED — Tizen signing is required before TV installation:', args.output)
print('SHA256:', hashlib.sha256(args.output.read_bytes()).hexdigest())

#!/usr/bin/env python3
"""Package TV sources. Never signs or installs a widget automatically."""
import hashlib,json,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parent
release=root.parent/'releases';release.mkdir(exist_ok=True)
ET.parse(root/'web/config.xml')
for name,base,files in [('30nama-TV-1.6.46-unsigned.wgt',root/'web',list((root/'web').rglob('*'))),('30nama-TV-1.6.46-TizenBrew.zip',root,list((root/'web').rglob('*'))+[root/'package.json',root/'LICENSE'])]:
 target=release/name
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
  for f in sorted(files):
   if not f.is_file() or any(p.startswith('.') for p in f.relative_to(base).parts):continue
   if f.name in ('author-signature.xml','signature1.xml') or f.suffix in ('.p12','.pwd'):raise RuntimeError('Signing material must not be included')
   z.write(f,f.relative_to(base))
 print(name,target.stat().st_size,'bytes',hashlib.sha256(target.read_bytes()).hexdigest())
print('The .wgt is unsigned: sign with a Samsung TV certificate before installing.')

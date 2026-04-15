#!/usr/bin/env python3
from pathlib import Path
import json, shutil, sys

def main():
    root = Path.cwd()
    payload_path = root / 'major_social_business_law_patch_v1_payload.json'
    if not payload_path.exists():
        print('ERROR: major_social_business_law_patch_v1_payload.json not found in current folder.')
        print('Place this script and the payload JSON inside the major-engine folder, then run again.')
        sys.exit(1)
    try:
        payload = json.loads(payload_path.read_text(encoding='utf-8'))
    except Exception as e:
        print(f'ERROR: Failed to read payload JSON: {e}')
        sys.exit(1)
    backup_dir = root / '_backup_before_major_social_business_law_patch_v1'
    backup_dir.mkdir(exist_ok=True)
    written = 0
    for item in payload.get('files', []):
        rel = item['path']
        target = root / rel
        if target.exists():
            backup_target = backup_dir / rel
            backup_target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, backup_target)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(item['content'], encoding='utf-8', newline='
')
        written += 1
    print(f'OK: wrote {written} files.')
    print('Backup folder:', backup_dir)

if __name__ == '__main__':
    main()

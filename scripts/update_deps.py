#!/usr/bin/env python3
import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVICES = ['services/api-gateway', 'services/patient', 'services/prediction', 'services/simulation']
# Packages that we will skip upgrading by default because they are large/binary and often lock files on Windows
BLACKLIST = {
    'numpy',
    'scipy',
    'pandas',
    'scikit-learn',
    'simuci',
}

def read_pkgs(req_file: Path):
    pkgs = []
    for line in req_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        # extract package name (before any [extras] or version spec
        name = line.split('[')[0].split('=')[0].split('<')[0].split('>')[0].strip()
        pkgs.append(name.lower())
    return pkgs


def main(include_binaries: bool = False):
    for svc in SERVICES:
        req_path = ROOT / svc / 'requirements.txt'
        if not req_path.exists():
            print(f"Skipping missing {req_path}")
            continue
        if include_binaries:
            print(f"Upgrading packages from {req_path} (including binaries)...")
        else:
            print(f"Upgrading packages from {req_path} (skipping heavy binaries)...")
        # create a temporary requirements file excluding blacklisted packages
        tmp_req = req_path.with_suffix('.tmp_requirements.txt')
        lines = []
        for line in req_path.read_text().splitlines():
            s = line.strip()
            if not s or s.startswith('#'):
                continue
            name = s.split('[')[0].split('=')[0].split('<')[0].split('>')[0].strip().lower()
            if (not include_binaries) and name in BLACKLIST:
                print(f"  - Skipping {name}")
                continue
            lines.append(line)
        tmp_req.write_text('\n'.join(lines) + '\n')

        # upgrade using uv pip; use --link-mode=copy to avoid hardlink issues on Windows
        cmd_upgrade = ['uv', 'pip', 'install', '--upgrade', '--link-mode=copy', '-r', str(tmp_req)]
        subprocess.run(cmd_upgrade, check=True)
        try:
            tmp_req.unlink()
        except Exception:
            pass

    print('\nCollecting current environment packages (pip freeze)...')
    # Use `uv pip freeze` (some uv installs provide pip as a subcommand)
    freeze = subprocess.check_output(['uv', 'pip', 'freeze'], text=True)
    frozen_lines = [l.strip() for l in freeze.splitlines() if l.strip()]
    frozen_map = {}
    for l in frozen_lines:
        # split name==version
        if '==' in l:
            name, ver = l.split('==', 1)
            frozen_map[name.lower()] = l
        else:
            # keep raw line
            frozen_map[l.lower()] = l

    # regenerate each requirements file with exact versions for original packages
    for svc in SERVICES:
        req_path = ROOT / svc / 'requirements.txt'
        if not req_path.exists():
            continue
        orig_pkgs = read_pkgs(req_path)
        new_lines = []
        for pkg in orig_pkgs:
            if pkg in frozen_map:
                new_lines.append(frozen_map[pkg])
            else:
                print(f"Warning: {pkg} not found in pip freeze; keeping original spec from {req_path}")
                # fallback: keep original line(s) matching pkg
                for line in req_path.read_text().splitlines():
                    if line.lower().startswith(pkg):
                        new_lines.append(line.strip())
                        break
        req_path.write_text('\n'.join(new_lines) + '\n')
        print(f"Updated {req_path}")

    print('\nDone.')

def _parse_args():
    p = argparse.ArgumentParser(description='Update service requirements using uv and freeze versions')
    p.add_argument('--include-binaries', action='store_true', help='Also upgrade binary packages (numpy, scipy, pandas, scikit-learn, simuci)')
    return p.parse_args()


if __name__ == '__main__':
    args = _parse_args()
    try:
        main(include_binaries=args.include_binaries)
    except subprocess.CalledProcessError as e:
        print('Command failed:', e)
        sys.exit(1)

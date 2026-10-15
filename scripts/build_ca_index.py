#!/usr/bin/env python3
"""Deprecated wrapper: use scripts/build_index.py ca [--min N] [--src DIR] [--asof DATE]."""
import os, sys, subprocess
sys.exit(subprocess.call([sys.executable, os.path.join(os.path.dirname(__file__), "build_index.py"), "ca"] + sys.argv[1:]))

#!/usr/bin/env python3
import sys
import subprocess

BACKEND_CONTAINER = "frappe_docker-backend-1"
BENCH_PATH = "/home/frappe/frappe-bench"

def run_bench_command(args, timeout=180):
    cmd = ["docker", "exec", BACKEND_CONTAINER, "bash", "-c",
           f"cd {BENCH_PATH} && bench {' '.join(args)}"]
    print(f"🚀 Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    print(f"STDOUT:\n{result.stdout}")
    if result.stderr:
        print(f"STDERR:\n{result.stderr}")
    return result

def install_app(site_name, app_name):
    print(f"\n{'='*60}\nInstalling {app_name} on {site_name}\n{'='*60}")
    result = run_bench_command(["--site", site_name, "install-app", app_name], timeout=300)
    if result.returncode == 0 or "already installed" in result.stdout.lower():
        print(f"✅ {app_name} installed on {site_name}")
        return True
    print(f"❌ Failed to install {app_name}")
    return False

if len(sys.argv) < 2:
    print("Usage: python3 install-erpnext.py <site_name>")
    print("Example: python3 install-erpnext.py sushmaorganisation.avariq.in")
    sys.exit(1)

install_app(sys.argv[1], "erpnext")
print("\n✅ DONE!")

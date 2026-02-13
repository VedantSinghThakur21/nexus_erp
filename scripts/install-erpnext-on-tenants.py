#!/usr/bin/env python3
"""
Install ERPNext on Existing Tenant Sites
=========================================
This script installs ERPNext (and any other missing apps) on tenant sites
that were provisioned without ERPNext installed.

Usage:
  Run on tenant site: python3 install-erpnext-on-tenants.py vfixit.avariq.in
  Run on all sites: python3 install-erpnext-on-tenants.py --all
"""

import sys
import subprocess

BACKEND_CONTAINER = "frappe_docker-backend-1"
BENCH_PATH = "/home/frappe/frappe-bench"

def run_bench_command(args: list[str], timeout: int = 180):
    """Execute a bench command inside the backend container."""
    cmd = [
        "docker", "exec", BACKEND_CONTAINER,
        "bash", "-c",
        f"cd {BENCH_PATH} && ./env/bin/bench {' '.join(args)}"
    ]
    print(f"🚀 Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    print(f"STDOUT:\n{result.stdout}")
    if result.stderr:
        print(f"STDERR:\n{result.stderr}")
    return result

def install_app(site_name: str, app_name: str):
    """Install an app on a specific site."""
    print(f"\n{'='*60}")
    print(f"Installing {app_name} on {site_name}")
    print('='*60)
    
    result = run_bench_command([
        "--site", site_name,
        "install-app", app_name
    ], timeout=300)  # 5 minutes timeout for app installation
    
    if result.returncode == 0:
        print(f"✅ Successfully installed {app_name} on {site_name}")
        return True
    elif "already installed" in result.stdout.lower() or "already installed" in result.stderr.lower():
        print(f"ℹ️  {app_name} already installed on {site_name}")
        return True
    else:
        print(f"❌ Failed to install {app_name} on {site_name}")
        return False

def get_all_sites():
    """Get list of all sites in the bench."""
    result = run_bench_command(["--site", "all", "list-sites"])
    if result.returncode == 0:
        sites = [s.strip() for s in result.stdout.strip().split('\n') if s.strip()]
        return sites
    return []

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Install on specific site: python3 install-erpnext-on-tenants.py vfixit.avariq.in")
        print("  Install on all sites: python3 install-erpnext-on-tenants.py --all")
        sys.exit(1)
    
    if sys.argv[1] == "--all":
        sites = get_all_sites()
        print(f"📋 Found {len(sites)} sites")
        # Exclude master site
        sites = [s for s in sites if "erp.localhost" not in s]
    else:
        sites = [sys.argv[1]]
    
    apps_to_install = ["erpnext"]  # Add more apps here if needed
    
    for site in sites:
        for app in apps_to_install:
            install_app(site, app)
    
    print("\n" + "="*60)
    print("✅ DONE! All apps installed.")
    print("="*60)

if __name__ == "__main__":
    main()

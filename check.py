#!/usr/bin/env python3
# ============================================
# Code Quality Check Script (Python)
# ============================================
# This script runs Ruff and Biome checks and outputs results to log files

import os
import subprocess
import datetime

def run_command(cmd, cwd=None):
    """Run a command and return (stdout, stderr, returncode)"""
    result = subprocess.run(
        cmd, 
        shell=True, 
        capture_output=True, 
        text=True, 
        encoding='utf-8',
        errors='replace',
        cwd=cwd
    )
    return result.stdout, result.stderr, result.returncode

def main():
    # Set log file paths
    ruff_log_file = "tmp/uv_ruff_check_latest.log"
    biome_log_file = "tmp/npx_biome_check.log"
    
    # Ensure tmp directory exists
    os.makedirs("tmp", exist_ok=True)
    
    # Get current time
    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # ANSI color codes
    CYAN = "\033[0;36m"
    YELLOW = "\033[1;33m"
    GREEN = "\033[0;32m"
    RED = "\033[0;31m"
    GRAY = "\033[0;90m"
    WHITE = "\033[1;37m"
    NC = "\033[0m"  # No Color
    
    print(f"{CYAN}========================================{NC}")
    print(f"{CYAN}  Code Quality Check Tool{NC}")
    print(f"{CYAN}========================================{NC}")
    print()
    
    # ============================================
    # 1. Ruff Check (Python code)
    # ============================================
    print(f"{YELLOW}[INFO] Running Ruff Check (Python)...{NC}")
    print(f"{GRAY}   Log file: {ruff_log_file}{NC}")
    
    # Write log header
    with open(ruff_log_file, "w", encoding="utf-8") as f:
        f.write("========================================\n")
        f.write(f"Ruff Check Log - {current_time}\n")
        f.write("========================================\n\n")
    
    # Run ruff check
    stdout, stderr, returncode = run_command("uv tool run ruff check .")
    
    # Write output to log
    with open(ruff_log_file, "a", encoding="utf-8") as f:
        f.write(stdout)
        if stderr:
            f.write("\n[STDERR]\n")
            f.write(stderr)
    
    # Print result
    if returncode == 0:
        print(f"{GREEN}   [OK] Ruff check passed!{NC}")
    else:
        print(f"{RED}   [WARN] Ruff found issues, please check the log{NC}")
    
    # Write log footer
    with open(ruff_log_file, "a", encoding="utf-8") as f:
        f.write("\n========================================\n")
        f.write(f"Completed at {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("========================================\n")
    
    print()
    
    # ============================================
    # 2. Biome Check (Frontend code)
    # ============================================
    print(f"{YELLOW}[INFO] Running Biome Check (Frontend)...{NC}")
    print(f"{GRAY}   Log file: {biome_log_file}{NC}")
    
    # Write log header
    with open(biome_log_file, "w", encoding="utf-8") as f:
        f.write("========================================\n")
        f.write(f"Biome Check Log - {current_time}\n")
        f.write("========================================\n\n")
    
    # Run biome check
    stdout, stderr, returncode = run_command("npx @biomejs/biome check ./src", cwd="frontend")
    
    # Write output to log
    with open(biome_log_file, "a", encoding="utf-8") as f:
        f.write(stdout)
        if stderr:
            f.write("\n[STDERR]\n")
            f.write(stderr)
    
    # Print result
    if returncode == 0:
        print(f"{GREEN}   [OK] Biome check passed!{NC}")
    else:
        print(f"{RED}   [WARN] Biome found issues, please check the log{NC}")
    
    # Write log footer
    with open(biome_log_file, "a", encoding="utf-8") as f:
        f.write("\n========================================\n")
        f.write(f"Completed at {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("========================================\n")
    
    print()
    print(f"{CYAN}========================================{NC}")
    print(f"{CYAN}  [OK] Check completed!{NC}")
    print(f"{CYAN}========================================{NC}")
    print()
    print(f"{WHITE}Log files:{NC}")
    print(f"{GRAY}   - Ruff:  {ruff_log_file}{NC}")
    print(f"{GRAY}   - Biome: {biome_log_file}{NC}")
    print()

if __name__ == "__main__":
    main()

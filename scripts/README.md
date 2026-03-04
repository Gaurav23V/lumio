# Lumio Scripts

Placeholder scripts for packaging and installation.

| Script | Purpose |
|--------|---------|
| `install-linux.sh` | Linux install entrypoint (curl \| bash) |
| `install-windows.ps1` | Windows install entrypoint (PowerShell) |
| `release.sh` | Release workflow: build, sign, publish |

Production install URLs (when published):
- Linux: `curl -s https://install.bookreader.app/linux | bash`
- Windows: `powershell -c "irm https://install.bookreader.app/windows | iex"`

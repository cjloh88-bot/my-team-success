# Company PC Deployment

This package runs my-team-success, Supabase Auth, Postgres, and the REST API on one Windows PC. After installation, normal app use does not require Vercel, managed Supabase, OpenAI, Slack, Stripe, or internet access.

## Requirements

- IT approval for Docker Desktop, Git for Windows, and `jq`
- Windows 10/11 with virtualization enabled
- 8 GB RAM minimum; 16 GB recommended for the host PC
- 80 GB free SSD space recommended
- A fixed LAN IP or DHCP reservation for the Always ON PC

Docker Desktop must use Linux containers and start automatically when the deployment user signs in.
Git Bash must be able to run both `openssl` and `jq`; the setup script checks this before changing anything.

## Online Setup

Open PowerShell in the repository and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\local\setup.ps1
```

To force the correct fixed address:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\local\setup.ps1 -ServerAddress 192.168.1.50
```

The app is available to company PCs at `http://SERVER-IP:3000`. Supabase Studio and its API use `http://SERVER-IP:8000`.

Run these once from an Administrator PowerShell window when LAN access and automatic startup are required:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\local\open-firewall.ps1
powershell -ExecutionPolicy Bypass -File .\deploy\local\install-startup-task.ps1
powershell -ExecutionPolicy Bypass -File .\deploy\local\install-backup-task.ps1
```

The firewall script allows ports 3000 and 8000 from `LocalSubnet` on Domain and Private networks only.

## Offline Transfer

On an internet-connected preparation PC with Docker running:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\local\setup.ps1
powershell -ExecutionPolicy Bypass -File .\deploy\local\prepare-offline-images.ps1
```

Copy the complete repository, including `deploy\local\offline-bundle`, to the company PC. After Docker Desktop and Git for Windows are installed there, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\local\import-offline-images.ps1
powershell -ExecutionPolicy Bypass -File .\deploy\local\setup.ps1 -ServerAddress 192.168.1.50
```

The offline bundle contains container images and the pinned official Supabase Docker configuration. It intentionally excludes generated passwords and keys; the company PC creates its own secrets during setup.

## Operations

```powershell
.\deploy\local\start.ps1
.\deploy\local\stop.ps1
.\deploy\local\status.ps1
.\deploy\local\backup.ps1
```

Backups are stored under `deploy\local\backups` and are excluded from Git. Copy them regularly to an IT-approved encrypted location outside the host PC.

Restore is deliberately guarded because it replaces the active database:

```powershell
.\deploy\local\restore.ps1 -BackupFile .\deploy\local\backups\my-team-success-YYYYMMDD-HHMMSS.dump -ConfirmRestore
```

## Security Notes

- Keep `deploy\local\runtime\supabase\docker\.env` private. It contains database and API credentials.
- Do not expose ports 3000 or 8000 directly to the internet.
- Use a company-approved reverse proxy and internal TLS certificate if sensitive data will cross an untrusted LAN.
- The local configuration auto-confirms email signups because no external mail server is required. Admins should control who can reach the LAN service and review member roles after signup.
- OpenAI and Slack remain disabled in the generated configuration. Rule-based summaries and the in-app reminder queue continue to work without them.

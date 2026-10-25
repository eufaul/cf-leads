#!/usr/bin/env bash
# ==============================================================================
# Script de Backup Automatizado — CF Leads
# ==============================================================================
set -euo pipefail

ENV_FILE="/docker/cf-leads/.env.production"
BACKUP_DIR="/backups/cf-leads"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEMP_DIR="/tmp/cfleads_backup_${TIMESTAMP}"
BACKUP_FILE="${BACKUP_DIR}/cfleads_backup_${TIMESTAMP}.tar.gz"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Erro: Arquivo ${ENV_FILE} não encontrado."
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
mkdir -p "${TEMP_DIR}"

# Extrair credenciais do arquivo .env.production
SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" "${ENV_FILE}" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" "${ENV_FILE}" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "${SUPABASE_URL}" ] || [ -z "${SERVICE_KEY}" ]; then
  echo "Erro: Credenciais do Supabase não encontradas no arquivo ${ENV_FILE}."
  exit 1
fi

echo "[$(date)] Iniciando backup das tabelas do CF Leads..."

TABLES=(
  "organizations"
  "profiles"
  "settings"
  "companies"
  "contacts"
  "leads"
  "weekly_batches"
  "batch_items"
  "attempts"
  "outcome_rules"
  "message_templates"
  "dedup_blocklist"
  "search_jobs"
  "audit_log"
)

for table in "${TABLES[@]}"; do
  curl -s -f \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    "${SUPABASE_URL}/rest/v1/${table}?select=*" > "${TEMP_DIR}/${table}.json" || echo "{\"error\":\"Falha ao exportar ${table}\"}" > "${TEMP_DIR}/${table}.json"
done

# Compactar tudo em um único arquivo tar.gz
tar -czf "${BACKUP_FILE}" -C "${TEMP_DIR}" .
rm -rf "${TEMP_DIR}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] Backup concluído com sucesso: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Limpeza de arquivos com mais de 30 dias
find "${BACKUP_DIR}" -name "cfleads_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Política de retenção aplicada (30 dias)."

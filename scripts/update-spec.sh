#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPEC_DIR="$PROJECT_ROOT/openapi"
SPEC_FILE="$SPEC_DIR/integration-api.json"
SPEC_BACKUP_FILE="$SPEC_FILE.backup"
INTEGRATION_API_DOCS_URL="${EZKEY_INTEGRATION_API_DOCS_URL:-https://exp1-integration-api.ezkey.org/api-docs}"

print_info() {
  echo "[INFO] $1"
}

print_success() {
  echo "[SUCCESS] $1"
}

print_warning() {
  echo "[WARNING] $1"
}

print_error() {
  echo "[ERROR] $1"
}

check_api_availability() {
  if curl -s --connect-timeout 5 "$INTEGRATION_API_DOCS_URL" > /dev/null 2>&1; then
    return 0
  fi

  print_error "Integration API OpenAPI endpoint is not accessible: $INTEGRATION_API_DOCS_URL"
  print_warning "Start a live Ezkey stack or override EZKEY_INTEGRATION_API_DOCS_URL."
  return 1
}

download_spec() {
  mkdir -p "$SPEC_DIR"

  if [ -f "$SPEC_FILE" ]; then
    cp "$SPEC_FILE" "$SPEC_BACKUP_FILE"
    print_info "Created backup: $(basename "$SPEC_BACKUP_FILE")"
  fi

  curl -s "$INTEGRATION_API_DOCS_URL" -o "$SPEC_FILE"
}

validate_and_format_spec() {
  if ! command -v jq > /dev/null 2>&1; then
    print_warning "jq not found. JSON validation and formatting skipped."
    return 0
  fi

  if ! jq empty "$SPEC_FILE" > /dev/null 2>&1; then
    print_error "Downloaded OpenAPI document is not valid JSON."
    restore_backup
    exit 1
  fi

  jq . "$SPEC_FILE" > "$SPEC_FILE.tmp"
  mv "$SPEC_FILE.tmp" "$SPEC_FILE"
  print_success "Validated and formatted integration-api.json"
}

restore_backup() {
  if [ -f "$SPEC_BACKUP_FILE" ]; then
    mv "$SPEC_BACKUP_FILE" "$SPEC_FILE"
    print_warning "Restored backup integration-api.json"
  fi
}

cleanup_backup() {
  if [ -f "$SPEC_BACKUP_FILE" ]; then
    rm -f "$SPEC_BACKUP_FILE"
  fi
}

main() {
  print_info "Refreshing Integration API OpenAPI spec"
  print_info "Source URL: $INTEGRATION_API_DOCS_URL"
  print_info "Target file: $SPEC_FILE"

  check_api_availability
  download_spec
  validate_and_format_spec
  cleanup_backup

  print_success "Integration API OpenAPI spec updated successfully"
  print_info "Next step: npm run generate:api"
}

main "$@"

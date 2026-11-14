#!/usr/bin/env bash
# Varredura de credenciais nos caminhos NAO RASTREADOS antes do commit local.
cd "C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta" || exit 1
git status --porcelain -uall | grep '^??' | sed 's/^?? //' | tr -d '"' > /tmp/untracked.txt
echo "total_nao_rastreados=$(wc -l < /tmp/untracked.txt)"
echo "--- com JWT (eyJ. ) ---"
while IFS= read -r f; do
  case "$f" in
    *.png|*.jpg|*.jpeg|*.gif) continue ;;
  esac
  [ -f "$f" ] || continue
  n=$(grep -aoE 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}' "$f" 2>/dev/null | sort -u | wc -l)
  [ "$n" -gt 0 ] && printf '%s\t%s\n' "$n" "$f"
done < /tmp/untracked.txt
echo "--- com serviceRoleKey/anonKey literais longos ---"
while IFS= read -r f; do
  case "$f" in
    *.png|*.jpg|*.jpeg|*.gif) continue ;;
  esac
  [ -f "$f" ] || continue
  n=$(grep -aoE 'eyJ[A-Za-z0-9_-]{40,}' "$f" 2>/dev/null | awk '{ if (length($0) > 120) print }' | sort -u | wc -l)
  [ "$n" -gt 0 ] && printf '%s\t%s\n' "$n" "$f"
done < /tmp/untracked.txt
echo "--- senhas hardcoded (chave/password: literal) ---"
while IFS= read -r f; do
  case "$f" in
    *.png|*.jpg|*.jpeg|*.gif) continue ;;
  esac
  [ -f "$f" ] || continue
  n=$(grep -acE '(password"[[:space:]]*:[[:space:]]*"|chave"[[:space:]]*:[[:space:]]*"|password:.[A-Za-z0-9])' "$f" 2>/dev/null)
  [ "${n:-0}" -gt 0 ] && printf '%s\t%s\n' "$n" "$f"
done < /tmp/untracked.txt
echo "FIM"

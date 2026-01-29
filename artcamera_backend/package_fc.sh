
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${ROOT_DIR}/dist"
ZIP_NAME="artcamera_backend_fc.zip"

INSTALL_DEPS=0
if [[ "${1:-}" == "--install" ]]; then
  INSTALL_DEPS=1
fi

cd "${ROOT_DIR}"

if [[ ${INSTALL_DEPS} -eq 1 ]]; then
  npm install --omit=dev
fi

if [[ ! -d "node_modules" ]]; then
  echo "node_modules not found. Run './package_fc.sh --install' first." >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
rm -f "${OUT_DIR}/${ZIP_NAME}"

ZIP_ITEMS=(index.js package.json node_modules)
if [[ -f "package-lock.json" ]]; then
  ZIP_ITEMS+=(package-lock.json)
fi

zip -r "${OUT_DIR}/${ZIP_NAME}" "${ZIP_ITEMS[@]}" -x "**/.DS_Store"

echo "Created ${OUT_DIR}/${ZIP_NAME}"

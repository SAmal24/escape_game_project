#!/usr/bin/env bash
set -euo pipefail

# Configuration par défaut (surchargée via variables d'environnement si besoin)
GEOSERVER_URL="${GEOSERVER_URL:-http://localhost:8080/geoserver}"
GEOSERVER_USER="${GEOSERVER_USER:-admin}"
GEOSERVER_PASS="${GEOSERVER_PASS:-geoserver}"
WORKSPACE="${GEOSERVER_WORKSPACE:-hakimi}"
DATASTORE="${GEOSERVER_DATASTORE:-hakimi_pg}"
LAYER_NAME="${GEOSERVER_LAYER:-points}"
STYLE_NAME="${GEOSERVER_STYLE:-heatmap_points}"
STYLE_FILE="$(cd "$(dirname "$0")" && pwd)/styles/${STYLE_NAME}.sld"

AUTH="${GEOSERVER_USER}:${GEOSERVER_PASS}"

log() {
    echo "[GeoServer init] $1"
}

ensure_workspace() {
    log "Création du workspace '${WORKSPACE}' (ignoré s'il existe déjà)..."
    local payload="<workspace><name>${WORKSPACE}</name></workspace>"
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" -u "${AUTH}" \
        -XPOST -H "Content-type: text/xml" \
        -d "${payload}" \
        "${GEOSERVER_URL}/rest/workspaces")

    if [[ "${status}" == "201" ]]; then
        log "Workspace créé."
    elif [[ "${status}" == "401" ]]; then
        log "Authentification GeoServer refusée." && exit 1
    elif [[ "${status}" == "409" ]]; then
        log "Workspace déjà présent."
    else
        log "Réponse inattendue lors de la création du workspace: ${status}"
    fi
}

ensure_datastore() {
    log "Création du datastore PostGIS '${DATASTORE}' (ignoré s'il existe déjà)..."
    local payload
    payload=$(cat <<XML
<dataStore>
  <name>${DATASTORE}</name>
  <connectionParameters>
    <host>db</host>
    <port>5432</port>
    <database>mydb</database>
    <user>postgres</user>
    <passwd>postgres</passwd>
    <dbtype>postgis</dbtype>
    <schema>public</schema>
    <Expose primary keys="false"/>
  </connectionParameters>
</dataStore>
XML
)
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" -u "${AUTH}" \
        -XPOST -H "Content-type: text/xml" \
        -d "${payload}" \
        "${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores")

    if [[ "${status}" == "201" ]]; then
        log "Datastore créé."
    elif [[ "${status}" == "409" ]]; then
        log "Datastore déjà présent."
    else
        log "Réponse datastore: ${status}"
    fi
}

publish_layer() {
    log "Publication de la couche '${LAYER_NAME}'..."
    local payload
    payload=$(cat <<XML
<featureType>
  <name>${LAYER_NAME}</name>
  <nativeName>${LAYER_NAME}</nativeName>
  <srs>EPSG:4326</srs>
  <title>Points du jeu</title>
</featureType>
XML
)
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" -u "${AUTH}" \
        -XPOST -H "Content-type: text/xml" \
        -d "${payload}" \
        "${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores/${DATASTORE}/featuretypes")

    if [[ "${status}" == "201" ]]; then
        log "Couche publiée."
    elif [[ "${status}" == "409" ]]; then
        log "Couche déjà publiée."
    else
        log "Réponse publication couche: ${status}"
    fi
}

publish_style() {
    if [[ ! -f "${STYLE_FILE}" ]]; then
        log "Fichier de style introuvable: ${STYLE_FILE}" && exit 1
    fi

    log "Publication du style '${STYLE_NAME}'..."
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" -u "${AUTH}" \
        -XPOST -H "Content-type: application/vnd.ogc.sld+xml" \
        -H "Accept: application/json" \
        -T "${STYLE_FILE}" \
        "${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/styles?name=${STYLE_NAME}")

    if [[ "${status}" == "201" ]]; then
        log "Style créé."
    elif [[ "${status}" == "401" ]]; then
        log "Authentification GeoServer refusée." && exit 1
    elif [[ "${status}" == "500" ]]; then
        log "Style déjà existant, tentative de mise à jour..."
        curl -s -u "${AUTH}" \
            -XPUT -H "Content-type: application/vnd.ogc.sld+xml" \
            -T "${STYLE_FILE}" \
            "${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/styles/${STYLE_NAME}"
    else
        log "Réponse publication style: ${status}"
    fi
}

assign_style() {
    log "Association du style '${STYLE_NAME}' à la couche '${LAYER_NAME}'..."
    local payload="<layer><defaultStyle><name>${WORKSPACE}:${STYLE_NAME}</name></defaultStyle></layer>"
    curl -s -u "${AUTH}" \
        -XPUT -H "Content-type: text/xml" \
        -d "${payload}" \
        "${GEOSERVER_URL}/rest/layers/${WORKSPACE}:${LAYER_NAME}" >/dev/null
}

main() {
    ensure_workspace
    ensure_datastore
    publish_layer
    publish_style
    assign_style
    log "Initialisation GeoServer terminée."
}

main "$@"


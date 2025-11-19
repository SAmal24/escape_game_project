// Vérifier que ol est disponible
if (typeof ol === 'undefined') {
    console.error('OpenLayers n\'est pas chargé !');
}
const app = Vue.createApp({
    data() {
        return {
            titre: "Hakimi’s Paris Quest",
            map: null,
            markersLayer: null,
            heatmapLayer: null,
            inventaire: [],
            objets: [],
            heatmapActive: false,
            pseudo: joueurPseudo,
            searchLayer: null, 
            searchQuery: '',
            searchResults: [],
            objetFeatures: {}, // Stocker les features pour pouvoir les retirer (objet au lieu de Map pour la réactivité Vue)
            popupVisible: false,
            popupMessage: '',
            objetIndiceActuel: null,
            indiceActuel: '',
            historiqueIndices: [],
            numeroEtapeCourante: 1,
            codePrompt: {
                visible: false,
                objet: null,
                valeur: '',
                erreur: ''
            }
        };
    },

    mounted() {
        this.initMap();
        this.loadObjets();
    },

    methods: {

        // -----------------------------------------
        // Initialisation de la carte OpenLayers
        // -----------------------------------------
        initMap() {
            this.markersLayer = new ol.layer.Vector({
                source: new ol.source.Vector()
            });

            // Couche heatmap via GeoServer
            this.heatmapLayer = new ol.layer.Tile({
                source: new ol.source.TileWMS({
                    url: "http://localhost:8080/geoserver/hakimi/wms",
                    params: {
                        "LAYERS": "hakimi:points",
                        "TILED": true
                    }
                }),
                visible: false,
                opacity: 0.6
            });

            this.map = new ol.Map({
                target: "map",
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.OSM()
                    }),
                    this.markersLayer,
                    this.heatmapLayer
                ],
                view: new ol.View({
                    center: ol.proj.fromLonLat([2.3522, 48.8566]),
                    zoom: 12
                })
            });

            this.map.on("singleclick", evt => {
                this.map.forEachFeatureAtPixel(evt.pixel, (feature => {
                    const objetData = feature.get("data");
                    if (objetData && objetData.type_objet) {
                        this.onClickObjet(objetData);
                        return true;
                    }
                }));
            });
        },

        // -----------------------------------------
        // Charger les objets depuis l’API
        // -----------------------------------------
        loadObjets() {
            fetch("/api/objets")
                .then(res => res.json())
                .then(objets => {
                    this.objets = objets.map(obj => ({
                        ...obj,
                        visible: !!obj.charge_au_depart,
                        ramasse: false
                    }));
                    this.initialiserObjets();
                });
        },

        // -----------------------------------------
        // Afficher les marqueurs sur la carte
        // -----------------------------------------
        initialiserObjets() {
            this.objets.forEach(objet => {
                if (objet.visible) {
                    this.ajouterMarqueurObjet(objet);
                }
            });

            const premier = this.trouverPremierObjet();
            if (premier) {
                this.definirIndiceCourant(premier);
            } else {
                this.indiceActuel = "Explore la carte pour trouver des indices.";
                this.objetIndiceActuel = null;
            }
        },

        ajouterMarqueurObjet(objet) {
            if (!objet.visible || objet.ramasse || this.objetFeatures[objet.id]) {
                return;
            }

            const feature = new ol.Feature({
                geometry: new ol.geom.Point(
                    ol.proj.fromLonLat([objet.lon, objet.lat])
                ),
                data: objet
            });

            feature.setStyle(new ol.style.Style({
                image: new ol.style.Icon({
                    src: "/public/img/icons/" + objet.icone,
                    scale: 0.08,
                    anchor: [0.5, 1]
                })
            }));

            this.markersLayer.getSource().addFeature(feature);
            this.objetFeatures[objet.id] = feature;
        },

        retirerMarqueurObjet(objetId) {
            const feature = this.objetFeatures[objetId];
            if (!feature) {
                return;
            }
            this.markersLayer.getSource().removeFeature(feature);
            delete this.objetFeatures[objetId];
        },

        // -----------------------------------------
        // Gestion du clic sur un objet
        // -----------------------------------------
        onClickObjet(objet) {
            if (!objet || objet.ramasse) {
                return;
            }

            // Vérifier si un objet débloquant est requis
            if (objet.id_objet_blocant) {
                const blocantPossede = this.inventaire.some(item => item.id === objet.id_objet_blocant);
                if (!blocantPossede) {
                    const nomBlocant = this.getNomObjet(objet.id_objet_blocant);
                    this.showInfoMessage(`Impossible d'accéder à ${objet.nom} sans ${nomBlocant}.`);
                    return;
                }
            }

            // Vérifier les objets verrouillés par code
            if (objet.type_objet === "code" || objet.type_objet === "bloque_code") {
                this.ouvrirCodePopup(objet);
                return;
            }

            this.recupererObjet(objet);
        },

        recupererObjet(objet) {
            const dejaDansInventaire = this.inventaire.some(item => item.id === objet.id);
            if (dejaDansInventaire) {
                return;
            }

            this.retirerMarqueurObjet(objet.id);
            objet.ramasse = true;
            this.inventaire.push(objet);
            this.showObjetMessage(objet);
            this.mettreAJourIndicesApresRecuperation(objet);
            this.deverrouillerObjetsDependants(objet);
        },

        deverrouillerObjetsDependants(objet) {
            const nouveauxObjets = this.objets.filter(o => !o.ramasse && !o.visible && o.id_objet_blocant === objet.id);
            nouveauxObjets.forEach(obj => {
                obj.visible = true;
                this.ajouterMarqueurObjet(obj);
            });

            if (!this.objetIndiceActuel && nouveauxObjets.length > 0) {
                this.definirIndiceCourant(nouveauxObjets[0]);
            }
        },

        mettreAJourIndicesApresRecuperation(objet) {
            if (this.objetIndiceActuel && this.objetIndiceActuel.id === objet.id) {
                this.historiqueIndices.push({
                    objetId: objet.id,
                    titre: objet.nom,
                    texte: this.obtenirTexteIndice(objet),
                    etape: this.numeroEtapeCourante
                });
                this.objetIndiceActuel = null;
                this.numeroEtapeCourante += 1;
            }

            const prochain = this.trouverProchainObjet(objet);
            if (prochain) {
                this.definirIndiceCourant(prochain);
            } else if (!this.objets.some(o => !o.ramasse)) {
                this.indiceActuel = "Bravo ! Toutes les étapes sont terminées.";
                this.objetIndiceActuel = null;
            } else {
                this.indiceActuel = "Cherche la suite sur la carte…";
                this.objetIndiceActuel = null;
            }
        },

        trouverProchainObjet(objet) {
            const dependant = this.objets
                .filter(o => !o.ramasse && o.id_objet_blocant === objet.id)
                .sort((a, b) => a.id - b.id);

            if (dependant.length > 0) {
                return dependant[0];
            }

            const disponible = this.objets
                .filter(o => !o.ramasse && o.visible)
                .sort((a, b) => a.id - b.id);

            if (disponible.length > 0) {
                return disponible[0];
            }

            return this.objets.find(o => !o.ramasse) || null;
        },

        trouverPremierObjet() {
            const objetsDepart = this.objets.filter(o => o.charge_au_depart);
            if (objetsDepart.length === 0) {
                return null;
            }

            const recup = objetsDepart
                .filter(o => o.type_objet === "recuperable")
                .sort((a, b) => a.id - b.id);

            if (recup.length > 0) {
                return recup[0];
            }

            return objetsDepart.sort((a, b) => a.id - b.id)[0];
        },

        definirIndiceCourant(objet) {
            this.objetIndiceActuel = objet;
            this.indiceActuel = this.obtenirTexteIndice(objet);
        },

        obtenirTexteIndice(objet) {
            if (objet.indice && objet.indice.trim().length > 0) {
                return objet.indice;
            }
            return `Localise ${objet.nom} pour poursuivre l'aventure.`;
        },

        getNomObjet(id) {
            const objet = this.objets.find(o => o.id === id);
            return objet ? objet.nom : "l'objet requis";
        },

        showInfoMessage(message) {
            this.popupMessage = message;
            this.popupVisible = true;

            setTimeout(() => {
                this.popupVisible = false;
                this.popupMessage = '';
            }, 2500);
        },

        ouvrirCodePopup(objet) {
            this.codePrompt = {
                visible: true,
                objet,
                valeur: '',
                erreur: ''
            };
        },

        fermerCodePopup() {
            this.codePrompt = {
                visible: false,
                objet: null,
                valeur: '',
                erreur: ''
            };
        },

        validerCode() {
            if (!this.codePrompt.objet) {
                return;
            }

            const saisie = (this.codePrompt.valeur || "").trim();
            if (!saisie) {
                this.codePrompt.erreur = "Entre un code pour continuer.";
                return;
            }

            const codeAttendu = this.codePrompt.objet.code_necessaire;
            if (codeAttendu && saisie === codeAttendu) {
                this.recupererObjet(this.codePrompt.objet);
                this.fermerCodePopup();
            } else {
                this.codePrompt.erreur = "Code incorrect. Réessaie !";
            }
        },

        // -----------------------------------------
        // Afficher le message de récupération d'un objet
        // -----------------------------------------
        showObjetMessage(objet) {
            // Messages spécifiques pour chaque objet récupérable
            const messages = {
                'Chaussure de Vitesse': "Tu sens une vitesse nouvelle… Hakimi serait fier.",
                // Ajouter d'autres messages si besoin
            };

            // Utiliser le message spécifique ou un message par défaut
            const message = messages[objet.nom] || `Vous avez récupéré : ${objet.nom}`;
            
            this.popupMessage = message;
            this.popupVisible = true;

            // Fermer automatiquement après 3 secondes
            setTimeout(() => {
                this.popupVisible = false;
                this.popupMessage = ''; // Vider le message aussi
            }, 3000);
        },

        // -----------------------------------------
        // Fermer la popup manuellement
        // -----------------------------------------
        closePopup() {
            this.popupVisible = false;
            this.popupMessage = ''; // Vider le message aussi
        },

        // -----------------------------------------
        // Mode triche (Heatmap ON/OFF)
        // -----------------------------------------
        toggleHeatmap() {
            this.heatmapLayer.setVisible(this.heatmapActive);
        },

        // -----------------------------------------
        // Recherche d'adresses/lieux
        // -----------------------------------------
        async searchLocation(event) {
            // Empêcher le rechargement de page
            if (event) {
                event.preventDefault();
            }

            if (!this.searchQuery || !this.searchQuery.trim()) {
                console.warn('Recherche vide');
                this.searchResults = [];
                return;
            }

            const query = this.searchQuery.trim();
            console.log('🔍 Recherche de:', query);

            // Vérifier que la carte est initialisée
            if (!this.map) {
                console.error('La carte n\'est pas encore initialisée');
                alert('Veuillez patienter, la carte se charge...');
                return;
            }

            try {
                // Utiliser Nominatim (OpenStreetMap) pour le géocodage
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
                
                console.log('📡 Requête vers:', url);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'HakimiQuest/1.0',
                        'Accept': 'application/json'
                    }
                });

                console.log('📥 Réponse status:', response.status, response.statusText);

                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
                }

                const results = await response.json();
                console.log('✅ Résultats reçus:', results);
                
                if (results && results.length > 0) {
                    console.log(`📍 ${results.length} résultat(s) trouvé(s)`);
                    this.searchResults = results;
                    
                    // Placer TOUS les marqueurs sur la carte
                    this.placeAllSearchMarkers(results);
                    
                } else {
                    console.warn('⚠️ Aucun résultat trouvé');
                    this.searchResults = [];
                    // Nettoyer les marqueurs s'il n'y a pas de résultats
                    if (this.searchLayer) {
                        this.searchLayer.getSource().clear();
                    }
                    alert('Aucun résultat trouvé pour : ' + query);
                }
            } catch (error) {
                console.error('❌ Erreur lors de la recherche:', error);
                this.searchResults = [];
                
                if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
                    alert('Erreur de connexion. Vérifiez votre connexion internet ou les restrictions CORS.');
                } else {
                    alert('Erreur lors de la recherche : ' + error.message);
                }
            }
        },
        // -----------------------------------------
        // Sélectionner un lieu depuis les résultats
        // -----------------------------------------
        selectLocation(result) {
            console.log('Lieu sélectionné:', result);
            
            const lon = parseFloat(result.lon);
            const lat = parseFloat(result.lat);

            // Créer ou mettre à jour le marqueur de recherche
            this.placeSearchMarker(lon, lat, result.display_name);

            // Animer la carte vers la position
            this.map.getView().animate({
                center: ol.proj.fromLonLat([lon, lat]),
                zoom: Math.max(this.map.getView().getZoom(), 15),
                duration: 1000
            });

            // Vider les résultats
            this.searchResults = [];
            this.searchQuery = '';
        },
        // -----------------------------------------
        // Placer TOUS les marqueurs de recherche sur la carte
        // -----------------------------------------
        placeAllSearchMarkers(results) {
            // Créer le layer s'il n'existe pas
            if (!this.searchLayer) {
                this.searchLayer = new ol.layer.Vector({
                    source: new ol.source.Vector(),
                    zIndex: 1000
                });
                this.map.addLayer(this.searchLayer);
            }

            // Vider les anciens marqueurs de recherche
            this.searchLayer.getSource().clear();

            const features = [];
            const coordinates = [];

            // Créer un marqueur pour chaque résultat
            results.forEach((result, index) => {
                const lon = parseFloat(result.lon);
                const lat = parseFloat(result.lat);

                coordinates.push([lon, lat]);

                const feature = new ol.Feature({
                    geometry: new ol.geom.Point(
                        ol.proj.fromLonLat([lon, lat])
                    ),
                    data: result,
                    index: index + 1
                });

                // Style du marqueur de recherche
                feature.setStyle(new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 10,
                        fill: new ol.style.Fill({ color: '#FF6B35' }),
                        stroke: new ol.style.Stroke({ 
                            color: 'white', 
                            width: 3 
                        })
                    }),
                    text: new ol.style.Text({
                        text: String(index + 1), // Numéro du résultat (1, 2, 3...)
                        fill: new ol.style.Fill({ color: 'white' }),
                        font: 'bold 12px Arial'
                    })
                }));

                features.push(feature);
            });

            // Ajouter tous les marqueurs au layer
            this.searchLayer.getSource().addFeatures(features);

            // Ajuster le zoom et le centre pour voir tous les marqueurs
            this.fitMapToResults(coordinates);
        },

        // -----------------------------------------
        // Ajuster le zoom et le centre pour voir tous les résultats
        // -----------------------------------------
        fitMapToResults(coordinates) {
            if (coordinates.length === 0) {
                return;
            }

            // Si un seul résultat, zoomer dessus
            if (coordinates.length === 1) {
                const [lon, lat] = coordinates[0];
                this.map.getView().animate({
                    center: ol.proj.fromLonLat([lon, lat]),
                    zoom: 15,
                    duration: 1000
                });
                return;
            }

            // Pour plusieurs résultats, calculer l'étendue qui les contient tous
            // Convertir les coordonnées en projections de la carte
            const projectedCoords = coordinates.map(coord => 
                ol.proj.fromLonLat(coord)
            );

            // Calculer l'étendue (bounding box)
            const extent = ol.extent.boundingExtent(projectedCoords);
            
            // Ajouter un padding pour avoir un peu d'espace autour
            ol.extent.scaleFromCenter(extent, 1.3); // 30% de marge

            // Ajuster la vue pour contenir tous les marqueurs
            this.map.getView().fit(extent, {
                duration: 1000,
                maxZoom: 16, // Zoom maximum (même si les points sont très proches)
                padding: [50, 50, 50, 50] // Padding en pixels (haut, droite, bas, gauche)
            });
        },

        // -----------------------------------------
        // Sélectionner un lieu depuis les résultats
        // -----------------------------------------
        selectLocation(result) {
            console.log('Lieu sélectionné:', result);
            
            const lon = parseFloat(result.lon);
            const lat = parseFloat(result.lat);

            // Zoomer sur le lieu sélectionné
            this.map.getView().animate({
                center: ol.proj.fromLonLat([lon, lat]),
                zoom: Math.max(this.map.getView().getZoom(), 15),
                duration: 1000
            });

            // Vider les résultats de la liste (mais garder les marqueurs)
            this.searchResults = [];
            this.searchQuery = '';
        },
    }
});

app.mount("#app");

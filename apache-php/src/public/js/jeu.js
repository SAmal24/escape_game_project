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
            objetsDepart: [],
            heatmapActive: false,
            pseudo: joueurPseudo,
            searchLayer: null, 
            searchQuery: '',
            searchResults: [],
            objetFeatures: {}, // Stocker les features pour pouvoir les retirer (objet au lieu de Map pour la réactivité Vue)
            popupVisible: false,
            popupMessage: '',
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
        },

        // -----------------------------------------
        // Charger les objets depuis l’API
        // -----------------------------------------
        loadObjets() {
            fetch("/api/objets")
                .then(res => res.json())
                .then(objets => {
                    this.objetsDepart = objets;
                    this.placeMarkers(objets);
                });
        },

        // -----------------------------------------
        // Afficher les marqueurs sur la carte
        // -----------------------------------------
        placeMarkers(objets) {
            objets.forEach(o => {
                const feature = new ol.Feature({
                    geometry: new ol.geom.Point(
                        ol.proj.fromLonLat([o.lon, o.lat])
                    ),
                    data: o
                });

                feature.setStyle(new ol.style.Style({
                    image: new ol.style.Icon({
                        src: "/public/img/icons/" + o.icone,
                        scale: 0.08,
                        anchor: [0.5, 1]
                    })
                }));

                this.markersLayer.getSource().addFeature(feature);
                
                // Stocker la feature pour pouvoir la retirer plus tard
                this.objetFeatures[o.id] = feature;
            });

            // Clic sur un objet
            this.map.on("singleclick", evt => {
                this.map.forEachFeatureAtPixel(evt.pixel, (f => {
                    const objetData = f.get("data");
                    if (objetData) {
                        this.onClickObjet(objetData, f);
                    }
                }));
            });
        },

        // -----------------------------------------
        // Gestion du clic sur un objet
        // -----------------------------------------
        onClickObjet(objet, feature) {
            // TYPE : récupérable
            if (objet.type_objet === "recuperable") {
                // Vérifier si l'objet n'est pas déjà dans l'inventaire
                const dejaDansInventaire = this.inventaire.some(item => item.id === objet.id);
                
                if (dejaDansInventaire) {
                    return; // Ne rien faire si déjà récupéré
                }

                // Retirer le marqueur de la carte
                if (feature) {
                    this.markersLayer.getSource().removeFeature(feature);
                } else if (this.objetFeatures[objet.id]) {
                    const featureToRemove = this.objetFeatures[objet.id];
                    this.markersLayer.getSource().removeFeature(featureToRemove);
                    delete this.objetFeatures[objet.id];
                }

                // Ajouter à l'inventaire
                this.inventaire.push(objet);

                // Afficher le message de récupération
                this.showObjetMessage(objet);
            } else {
                // Pour les autres types d'objets, afficher un message simple
                alert("Vous avez cliqué sur : " + objet.nom);
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

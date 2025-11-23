if (typeof ol === 'undefined') {
    console.error('OpenLayers n\'est pas chargé !');
}
const app = Vue.createApp({
    data() {
        return {
            titre: "Hakimi's Paris Quest",
            map: null,
            markersLayer: null,
            heatmapLayer: null,
            inventaire: [],
            codesInventaire: [],
            objets: [],
            objetsFiltres: [],
            heatmapActive: false,
            cheatUsedEver: false,
            cheatActiveObjectId: null,
            pseudo: joueurPseudo,
            searchLayer: null, 
            searchQuery: '',
            searchResults: [],
            objetFeatures: {},
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
            },
            scenarioChoisi: null,
            score: 0,
            scoreInitial: 0,
            pointsSession: 0,
            finDePartie: false,
            classement: [],
            scenarioConfig: {
                hakimi: { minId: 1, maxId: 5, objetFinal: 5, nom: 'Hakimi Quest', objectif: 'Trouver la clé d\'or d\'Hakimi' },
                messi: { minId: 6, maxId: 10, objetFinal: 10, nom: 'Messi Magic Trail', objectif: 'Parcourir Paris en cherchant l\'héritage qu\'a laissé Messi après son départ de Paris' },
                mbappe: { minId: 11, maxId: 15, objetFinal: 15, nom: 'Mbappé Speed Run', objectif: 'Collecter le Trident de la Victoire' }
            },
            objectifScenario: ''
        };
    },

    computed: {
        objectifActuel() {
            if (!this.scenarioChoisi) return '';
            const config = this.scenarioConfig[this.scenarioChoisi];
            return config ? config.objectif : '';
        }
    },

    mounted() {
        // TODO: initialiser la carte ici si besoin
    },

    methods: {
        async choisirScenario(scenario) {
            // console.log('scenario choisi:', scenario);
            this.scenarioChoisi = scenario;
            this.finDePartie = false;
            this.pointsSession = 0;
            this.heatmapActive = false;
            this.codesInventaire = [];
            this.cheatUsedEver = false;
            this.cheatActiveObjectId = null;
            
            await this.chargerScoreInitial();
            this.score = this.scoreInitial;
            this.inventaire = [];
            this.objets = [];
            this.objetsFiltres = [];
            this.objetFeatures = {};
            this.historiqueIndices = [];
            this.numeroEtapeCourante = 1;
            this.objetIndiceActuel = null;
            this.indiceActuel = '';
            this.searchResults = [];
            this.searchQuery = '';
            
            if (this.map) {
                this.map.setTarget(null);
                this.map = null;
            }
            if (this.searchLayer) {
                this.searchLayer = null;
            }
            
            this.$nextTick(() => {
                this.initMap();
                this.loadObjets();
            });
        },

        initMap() {
            // console.log('init map...');
            this.markersLayer = new ol.layer.Vector({
                source: new ol.source.Vector()
            });

            // Couche heatmap via GeoServer
            this.heatmapLayer = new ol.layer.Tile({
                source: new ol.source.TileWMS({
                    url: "http://localhost:8080/geoserver/hakimi/wms",
                    params: {
                        "LAYERS": "hakimi:points",
                        "STYLES": "heatmap_points",
                        "TILED": true
                    }
                }),
                visible: false,
                opacity: 0.6
            });
            // console.log('heatmap layer créé');

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

            this.map.getView().on('change:resolution', () => {
                this.mettreAJourVisibiliteSelonZoom();
            });
        },

        loadObjets() {
            // console.log('chargement objets pour scenario:', this.scenarioChoisi);
            if (!this.scenarioChoisi) {
                return;
            }
            
            fetch("/api/objets")
                .then(res => res.json())
                .then(objets => {
                    const config = this.scenarioConfig[this.scenarioChoisi];
                    // console.log('objets reçus:', objets.length);
                    
                    this.objetsFiltres = objets
                        .filter(obj => {
                            const id = parseInt(obj.id);
                            return id >= config.minId && id <= config.maxId;
                        })
                        .map(obj => {
                            const zoomValue = Number(obj.zoom_min);
                            const pointId = Number(obj.id_point);
                            return {
                                ...obj,
                                id_point: Number.isFinite(pointId) ? pointId : null,
                                visible: !!obj.charge_au_depart,
                                ramasse: false,
                                zoom_min: Number.isFinite(zoomValue) ? zoomValue : 0
                            };
                        });
                    
                    this.objets = this.objetsFiltres;
                    this.initialiserObjets();
                })
                .catch(err => {
                    console.error('erreur chargement objets:', err);
                });
        },

        initialiserObjets() {
            // console.log('init objets, total:', this.objets.length);
            this.mettreAJourVisibiliteSelonZoom();

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

        onClickObjet(objet) {
            // console.log('clic sur objet:', objet.nom);
            if (!objet || objet.ramasse) {
                return;
            }

            if (objet.id_objet_blocant) {
                const blocantPossede = this.inventaire.some(item => item.id === objet.id_objet_blocant);
                if (!blocantPossede) {
                    const nomBlocant = this.getNomObjet(objet.id_objet_blocant);
                    this.showInfoMessage(`Impossible d'accéder à ${objet.nom} sans ${nomBlocant}.`);
                    return;
                }
            }

            if (objet.type_objet === "code") {
                this.recupererCode(objet);
                return;
            }

            if (objet.type_objet === "bloque_code") {
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
            // console.log('récupération objet:', objet.nom);

            this.retirerMarqueurObjet(objet.id);
            objet.ramasse = true;
            this.inventaire.push(objet);

            const tricheActiveLorsRecuperation = !!this.heatmapActive;
            this.attribuerPointsPourObjet(objet, tricheActiveLorsRecuperation);
            this.showObjetMessage(objet);
            this.mettreAJourIndicesApresRecuperation(objet);
            this.deverrouillerObjetsDependants(objet);
            this.desactiverTricheApresRecuperation();
            
            this.verifierFinDePartie(objet);
        },

        recupererCode(objet) {
            if (!objet || objet.ramasse) {
                return;
            }

            this.retirerMarqueurObjet(objet.id);
            objet.ramasse = true;

            const codeValeur = objet.code_necessaire || '----';
            if (!this.codesInventaire.some(code => code.id === objet.id)) {
                this.codesInventaire.push({
                    id: objet.id,
                    nom: objet.nom,
                    code: codeValeur
                });
            }

            const tricheActiveLorsRecuperation = !!this.heatmapActive;
            this.attribuerPointsPourObjet(objet, tricheActiveLorsRecuperation);
            this.showCodeRevealMessage(objet, codeValeur);
            this.mettreAJourIndicesApresRecuperation(objet);
            this.deverrouillerObjetsDependants(objet);
            this.desactiverTricheApresRecuperation();
            this.verifierFinDePartie(objet);
        },

        attribuerPointsPourObjet(objet, tricheActive = false) {
            const config = this.scenarioConfig[this.scenarioChoisi];
            const objetId = parseInt(objet.id, 10);
            let points = objetId === config.objetFinal
                ? (this.cheatUsedEver ? 20 : 50)
                : 5;

            if (tricheActive) {
                points = 1;
            }
            // console.log('points attribués:', points, 'pour objet:', objet.nom);

            this.pointsSession += points;
            this.score = this.scoreInitial + this.pointsSession;
        },

        deverrouillerObjetsDependants(objet) {
            const nouveauxObjets = this.objets.filter(o => !o.ramasse && !o.visible && o.id_objet_blocant === objet.id);
            nouveauxObjets.forEach(obj => {
                obj.visible = true;
                this.mettreAJourVisibilitePourObjet(obj);
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
            if (this.heatmapActive) {
                this.cheatActiveObjectId = objet ? objet.id : null;
                this.mettreAJourHeatmapPourObjet(objet);
            }
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

        showObjetMessage(objet) {
            const messages = {
                'Chaussure de Vitesse': "Tu sens une vitesse nouvelle… Hakimi serait fier.",
            };

            const message = messages[objet.nom] || `Vous avez récupéré : ${objet.nom}`;
            
            this.popupMessage = message;
            this.popupVisible = true;

            setTimeout(() => {
                this.popupVisible = false;
                this.popupMessage = '';
            }, 3000);
        },

        showCodeRevealMessage(objet, codeValeur) {
            const message = `Code trouvé (${objet.nom}) : ${codeValeur}`;
            this.popupMessage = message;
            this.popupVisible = true;

            setTimeout(() => {
                this.popupVisible = false;
                this.popupMessage = '';
            }, 3500);
        },

        closePopup() {
            this.popupVisible = false;
            this.popupMessage = '';
        },

        toggleHeatmap() {
            // console.log('toggle heatmap, actif:', !this.heatmapActive);
            this.appliquerEtatHeatmap();
        },

        appliquerEtatHeatmap() {
            if (!this.heatmapLayer) {
                this.showInfoMessage("Carte indisponible pour le moment.");
                this.heatmapActive = false;
                return;
            }

            if (this.heatmapActive) {
                if (!this.objetIndiceActuel) {
                    this.showInfoMessage("Aucun indice actif à mettre en surbrillance.");
                    this.heatmapActive = false;
                    this.heatmapLayer.setVisible(false);
                    this.cheatActiveObjectId = null;
                    return;
                }

                this.cheatUsedEver = true;
                this.cheatActiveObjectId = this.objetIndiceActuel.id;
                this.mettreAJourHeatmapPourObjet(this.objetIndiceActuel);
                this.heatmapLayer.setVisible(true);
            } else {
                this.heatmapLayer.setVisible(false);
                this.cheatActiveObjectId = null;
            }
        },

        mettreAJourHeatmapPourObjet(objet) {
            if (!this.heatmapLayer || !objet) {
                return;
            }

            const source = this.heatmapLayer.getSource();
            const paramsActuels = source.getParams ? source.getParams() : {};
            const pointId = objet.id_point || objet.id;
            const nouveauxParams = {
                ...paramsActuels,
                'CQL_FILTER': `id=${pointId}`,
                '_ts': Date.now()
            };
            source.updateParams(nouveauxParams);
        },

        desactiverTricheApresRecuperation() {
            if (!this.heatmapActive) {
                return;
            }
            this.heatmapActive = false;
            this.appliquerEtatHeatmap();
        },

        mettreAJourVisibiliteSelonZoom() {
            // console.log('zoom changé:', this.map.getView().getZoom());
            if (!this.map) {
                return;
            }

            const zoomActuel = this.map.getView().getZoom();

            this.objets.forEach(objet => {
                this.mettreAJourVisibilitePourObjet(objet, zoomActuel);
            });
        },

        mettreAJourVisibilitePourObjet(objet, zoomCourant = null) {
            if (!this.map) {
                return;
            }

            const zoomActuel = zoomCourant !== null ? zoomCourant : this.map.getView().getZoom();
            const zoomMin = typeof objet.zoom_min === 'number' ? objet.zoom_min : 0;
            const doitEtreVisible = objet.visible && !objet.ramasse && zoomActuel >= zoomMin;

            if (doitEtreVisible) {
                this.ajouterMarqueurObjet(objet);
            } else {
                this.retirerMarqueurObjet(objet.id);
            }
        },

        async searchLocation(event) {
            if (event) {
                event.preventDefault();
            }

            if (!this.searchQuery || !this.searchQuery.trim()) {
                // console.warn('recherche vide');
                this.searchResults = [];
                return;
            }

            const query = this.searchQuery.trim();
            // console.log('recherche:', query);

            if (!this.map) {
                alert('Veuillez patienter, la carte se charge...');
                return;
            }

            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
                // console.log('requête nominatim:', url);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'HakimiQuest/1.0',
                        'Accept': 'application/json'
                    }
                });

                // console.log('status réponse:', response.status);

                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
                }

                const results = await response.json();
                // console.log('résultats:', results.length);
                
                if (results && results.length > 0) {
                    this.searchResults = results;
                    this.placeAllSearchMarkers(results);
                } else {
                    this.searchResults = [];
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
        selectLocation(result) {
            // console.log('lieu sélectionné:', result.display_name);
            
            const lon = parseFloat(result.lon);
            const lat = parseFloat(result.lat);

            this.placeSearchMarker(lon, lat, result.display_name);

            this.map.getView().animate({
                center: ol.proj.fromLonLat([lon, lat]),
                zoom: Math.max(this.map.getView().getZoom(), 15),
                duration: 1000
            });

            this.searchResults = [];
            this.searchQuery = '';
        },
        placeAllSearchMarkers(results) {
            if (!this.searchLayer) {
                this.searchLayer = new ol.layer.Vector({
                    source: new ol.source.Vector(),
                    zIndex: 1000
                });
                this.map.addLayer(this.searchLayer);
            }

            this.searchLayer.getSource().clear();

            const features = [];
            const coordinates = [];

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
                        text: String(index + 1),
                        fill: new ol.style.Fill({ color: 'white' }),
                        font: 'bold 12px Arial'
                    })
                }));

                features.push(feature);
            });

            this.searchLayer.getSource().addFeatures(features);
            this.fitMapToResults(coordinates);
        },

        fitMapToResults(coordinates) {
            // console.log('fit map to', coordinates.length, 'results');
            if (coordinates.length === 0) {
                return;
            }

            if (coordinates.length === 1) {
                const [lon, lat] = coordinates[0];
                this.map.getView().animate({
                    center: ol.proj.fromLonLat([lon, lat]),
                    zoom: 15,
                    duration: 1000
                });
                return;
            }

            const projectedCoords = coordinates.map(coord => 
                ol.proj.fromLonLat(coord)
            );

            const extent = ol.extent.boundingExtent(projectedCoords);
            ol.extent.scaleFromCenter(extent, 1.3);

            this.map.getView().fit(extent, {
                duration: 1000,
                maxZoom: 16,
                padding: [50, 50, 50, 50]
            });
        },

        verifierFinDePartie(objetDeclencheur = null) {
            // console.log('vérif fin partie, objet:', objetDeclencheur?.nom);
            if (!this.scenarioChoisi || this.finDePartie || this.objets.length === 0) {
                return;
            }

            const config = this.scenarioConfig[this.scenarioChoisi];
            const objetFinal = this.objets.find(o => parseInt(o.id, 10) === config.objetFinal);

            if (!objetFinal || !objetFinal.ramasse) {
                return;
            }

            const finalVientDEtreRecupere = objetDeclencheur && parseInt(objetDeclencheur.id, 10) === config.objetFinal;
            const tousObjetsRecuperes = this.objets.every(o => o.ramasse);

            if (finalVientDEtreRecupere || tousObjetsRecuperes) {
                this.terminerPartie();
            }
        },

        terminerPartie() {
            this.finDePartie = true;
            // console.log('partie terminée! score:', this.score);
            this.sauvegarderScore();
            this.chargerClassement();
        },

        async sauvegarderScore() {
            // console.log('sauvegarde score, points:', this.pointsSession);
            const pointsAGagner = this.pointsSession;
            if (pointsAGagner <= 0) {
                return;
            }

            try {
                const response = await fetch('/api/scores', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        pseudo: this.pseudo,
                        score: pointsAGagner
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erreur API scores: ${response.status} ${errorText}`);
                }

                const data = await response.json();
                if (data && typeof data.score === 'number') {
                    this.scoreInitial = data.score;
                    this.score = data.score;
                    this.pointsSession = 0;
                }
            } catch (error) {
                console.error('Erreur lors de la sauvegarde du score:', error);
            }
        },

        // -----------------------------------------
        // Charger le score existant du joueur
        // -----------------------------------------
        async chargerScoreInitial() {
            try {
                const response = await fetch(`/api/scores/${encodeURIComponent(this.pseudo)}`);
                if (response.ok) {
                    const data = await response.json();
                    this.scoreInitial = typeof data.score === 'number' ? data.score : 0;
                } else if (response.status === 404) {
                    this.scoreInitial = 0;
                } else {
                    const errorText = await response.text();
                    console.warn('Impossible de récupérer le score initial:', errorText);
                    this.scoreInitial = 0;
                }
            } catch (error) {
                console.error('Erreur chargement score initial:', error);
                this.scoreInitial = 0;
            } finally {
                this.pointsSession = 0;
                this.score = this.scoreInitial;
            }
        },

        // -----------------------------------------
        // Charger le classement
        // -----------------------------------------
        chargerClassement() {
            fetch('/api/scores')
                .then(res => res.json())
                .then(scores => {
                    this.classement = scores;
                })
                .catch(err => {
                    console.error('Erreur lors du chargement du classement:', err);
                });
        },

        // -----------------------------------------
        // Rejouer (retour à la sélection de scénario)
        // -----------------------------------------
        rejouer() {
            this.finDePartie = false;
            this.scenarioChoisi = null;
            this.pointsSession = 0;
            this.score = this.scoreInitial;
            this.heatmapActive = false;
            this.cheatUsedEver = false;
            this.cheatActiveObjectId = null;
            this.inventaire = [];
            this.codesInventaire = [];
            this.objets = [];
            this.objetsFiltres = [];
            this.objetFeatures = {};
            this.historiqueIndices = [];
            this.numeroEtapeCourante = 1;
            this.objetIndiceActuel = null;
            this.indiceActuel = '';
            this.classement = [];
            
            // Nettoyer la carte
            if (this.map) {
                this.map.setTarget(null);
                this.map = null;
            }

            if (this.heatmapLayer) {
                this.heatmapLayer.setVisible(false);
            }
        },

        // -----------------------------------------
        // Retour à l'accueil
        // -----------------------------------------
        retourAccueil() {
            window.location.href = '/';
        },
    }
});

app.mount("#app");

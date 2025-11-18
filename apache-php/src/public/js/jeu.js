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
            pseudo: joueurPseudo
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
            });

            // Clic sur un objet
            this.map.on("singleclick", evt => {
                this.map.forEachFeatureAtPixel(evt.pixel, (f => {
                    this.onClickObjet(f.get("data"));
                }));
            });
        },

        // -----------------------------------------
        // Gestion du clic sur un objet
        // -----------------------------------------
        onClickObjet(objet) {
            alert("Vous avez cliqué sur : " + objet.nom);

            // TYPE : récupérable
            if (objet.type_objet === "recuperable") {
                this.inventaire.push(objet);
            }
        },

        // -----------------------------------------
        // Mode triche (Heatmap ON/OFF)
        // -----------------------------------------
        toggleHeatmap() {
            this.heatmapLayer.setVisible(this.heatmapActive);
        }
    }
});

app.mount("#app");

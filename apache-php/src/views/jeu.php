<?php $pseudo = $pseudo ?? "Joueur"; ?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Hakimi Quest - Jeu</title>

    <!-- OpenLayers -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v10.7.0/ol.css">

    <link rel="stylesheet" href="/public/css/style.css">



</head>
<body>

<header class="header">
    <h1 class="title">⚡ Hakimi Quest</h1>
    <p class="subtitle">« Paris t'attend, jeune Padawan du Parc des Princes »</p>
     <div class="top-right">
        <span class="user-display">👤 <?php echo htmlspecialchars($pseudo); ?></span>
        <a href="/" class="quit-btn">Quitter</a>
    </div>
</header>

<div id="app" class="container" v-cloak>

    <!-- COLONNE DE GAUCHE : INVENTAIRE -->
    <div class="sidebar">
        <h2>🎒 Inventaire</h2>

        <div v-if="inventaire.length === 0" class="empty">
            Aucun objet trouvé...
        </div>

        <ul class="inventory-list">
            <li v-for="obj in inventaire" :key="obj.id">
                <img :src="'/public/img/icons/' + obj.icone" class="icon-small">
                {{ obj.nom }}
            </li>
        </ul>

        <hr>

        <!-- BOUTON TRICHE -->
        <div class="cheat-section">
            <label>
                <input type="checkbox" v-model="heatmapActive" @change="toggleHeatmap">
                🔥 Mode triche (Heatmap)
            </label>
        </div>
    </div>

    <!-- CARTE -->
    <div id="map" class="map">
         <!-- FORMULAIRE DE RECHERCHE -->
         <div class="search-container">
            <form @submit.prevent="searchLocation" class="search-form">
                <input 
                    type="text" 
                    v-model="searchQuery" 
                    placeholder="Rechercher un lieu ou une adresse..."
                    class="search-input"
                >
                <button type="submit" class="search-btn">🔍</button>
                <div v-if="searchResults.length > 0" class="search-results">
                    <div 
                        v-for="(result, index) in searchResults" 
                        :key="index"
                        @click="selectLocation(result)"
                        class="search-result-item"
                    >
                        <strong>{{ result.display_name }}</strong>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- POPUP DE RÉCUPÉRATION D'OBJET -->
    <div v-if="popupVisible && popupMessage" class="objet-popup-overlay" @click="closePopup">
        <div class="objet-popup" @click.stop>
            <button class="popup-close" @click="closePopup">×</button>
            <div class="popup-content">
                <p class="popup-message">{{ popupMessage }}</p>
            </div>
        </div>
    </div>
</div>

<footer class="footer">
    <p>💙 « Comme Hakimi, trouve toujours la passe décisive dans les rues de Paris » 💙</p>
</footer>

<script>
    const joueurPseudo = "<?php echo htmlspecialchars($pseudo); ?>";
</script>


 <!-- OpenLayers -->
<script src="https://cdn.jsdelivr.net/npm/ol@v10.7.0/dist/ol.js"></script>

<!-- Vue.js -->
<script src="https://unpkg.com/vue@3"></script>


<!-- SCRIPT DU JEU -->
<script src="/public/js/jeu.js"></script>

</body>
</html>

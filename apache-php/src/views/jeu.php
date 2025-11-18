<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Hakimi Quest - Jeu</title>

    <!-- OpenLayers -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@latest/ol.css">
    <script src="https://cdn.jsdelivr.net/npm/ol@latest/ol.js"></script>

    <!-- Vue.js -->
    <script src="https://unpkg.com/vue@3"></script>

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

<div id="app" class="container">

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
    <div id="map" class="map"></div>
</div>

<footer class="footer">
    <p>💙 « Comme Hakimi, trouve toujours la passe décisive dans les rues de Paris » 💙</p>
</footer>

<script>
    const joueurPseudo = "<?php echo htmlspecialchars($pseudo); ?>";
</script>
<!-- SCRIPT DU JEU -->
<script src="/public/js/jeu.js"></script>

</body>
</html>

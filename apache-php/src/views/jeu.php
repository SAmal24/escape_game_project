<?php $pseudo = $pseudo ?? "Joueur"; ?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Hakimi Quest - Jeu</title>

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v10.7.0/ol.css">
    <link rel="stylesheet" href="/public/css/style.css">



</head>
<body>

<div id="app" v-cloak>

    <header class="header" v-if="scenarioChoisi">
        <h1 class="title"> Hakimi & PSG Quest</h1>
        <p class="subtitle" v-if="objectifActuel">« {{ objectifActuel }} »</p>
        <p class="subtitle" v-else>« Paris t'attend, jeune Padawan du Parc des Princes »</p>
        <div class="top-right">
            <span class="score-display">Score: {{ score }}</span>
            <span class="user-display"> <i class="fas fa-user-circle"></i> <?php echo htmlspecialchars($pseudo); ?></span>
            <a href="/" class="quit-btn">Quitter</a>
        </div>
    </header>

    <div class="container">

    <div v-if="!scenarioChoisi" class="scenario-selection-overlay">
        <div class="scenario-selection">
            <h2>Choisissez votre scénario</h2>
            <div class="scenarios-grid">
                <div class="scenario-card" @click="choisirScenario('hakimi')">
                    <div class="scenario-icon"></div>
                    <h3>1️ Hakimi Quest</h3>
                    <p>Ouest Paris</p>
                    <p class="scenario-objective">Objectif: trouver la clé d'Hakimi pour le match de la Ligue des Champions</p>
                </div>
                <div class="scenario-card" @click="choisirScenario('messi')">
                    <div class="scenario-icon"></div>
                    <h3>2 Messi Magic Trail</h3>
                    <p>Paris Centre</p>
                    <p class="scenario-objective">Objectif: parcourir Paris en cherchant l'héritage de messi</p>
                </div>
                <div class="scenario-card" @click="choisirScenario('mbappe')">
                    <div class="scenario-icon"></div>
                    <h3>3 Mbappé Speed Run</h3>
                    <p>Nord + Centre</p>
                    <p class="scenario-objective">Objectif: Trident de la Victoire</p>
                </div>
            </div>
        </div>
    </div>

    <template v-if="scenarioChoisi">
    <div class="sidebar">
        <h2> Inventaire</h2>

        <div v-if="inventaire.length === 0" class="empty">
            Aucun objet trouvé...
        </div>

        <ul class="inventory-list">
            <li v-for="obj in inventaire" :key="obj.id">
                <img :src="'/public/img/icons/' + obj.icone" class="icon-small">
                {{ obj.nom }}
            </li>
        </ul>

        <div class="codes-section">
            <h3>Codes</h3>
            <div v-if="codesInventaire.length === 0" class="empty">
                Aucun code trouvé...
            </div>
            <ul v-else class="codes-list">
                <li v-for="code in codesInventaire" :key="code.id">
                    <strong>{{ code.nom }}</strong>
                    <span class="code-value">{{ code.code }}</span>
                </li>
            </ul>
        </div>

        <hr>

        <div class="cheat-section">
            <label>
                <input type="checkbox" v-model="heatmapActive" @change="toggleHeatmap">
                 Mode triche (Heatmap)
            </label>
        </div>
    </div>

    <div id="map" class="map">
        <div class="search-container">
            <form @submit.prevent="searchLocation" class="search-form">
                <input 
                    type="text" 
                    v-model="searchQuery" 
                    placeholder="Rechercher un lieu ou une adresse..."
                    class="search-input"
                >
                <button type="submit" class="search-btn">Search</button>
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

        <!-- PANNEAU D'INDICES -->
        <div class="hint-panel">
            <div class="hint-header">
                <h3> Indices</h3>
                <span class="step-pill" v-if="numeroEtapeCourante > 0">Étape {{ numeroEtapeCourante }}</span>
            </div>
            <div class="hint-current" v-if="indiceActuel">
                <p class="hint-title">{{ objetIndiceActuel ? objetIndiceActuel.nom : 'Objectif' }}</p>
                <p class="hint-text">{{ indiceActuel }}</p>
            </div>
            <p v-else class="hint-placeholder">
                Aucun indice pour l'instant. Explore la carte !
            </p>

            <div class="hint-history" v-if="historiqueIndices.length > 0">
                <h4>Étapes terminées</h4>
                <ul>
                    <li v-for="indice in historiqueIndices" :key="indice.objetId">
                        <strong>{{ indice.titre }}</strong>
                        <span>{{ indice.texte }}</span>
                    </li>
                </ul>
            </div>
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

    <!-- POPUP CODE -->
    <div v-if="codePrompt.visible" class="code-popup-overlay" @click="fermerCodePopup">
        <div class="code-popup" @click.stop>
            <button class="popup-close" @click="fermerCodePopup">×</button>
            <h3>{{ codePrompt.objet ? codePrompt.objet.nom : 'Code requis' }}</h3>
            <p class="code-popup-text">
                Entre le code pour déverrouiller cet objet.
            </p>
            <input 
                type="text" 
                v-model="codePrompt.valeur" 
                maxlength="10"
                class="code-input"
                placeholder="••••"
                @keyup.enter="validerCode"
            >
            <p v-if="codePrompt.erreur" class="code-error">{{ codePrompt.erreur }}</p>
            <div class="code-actions">
                <button class="btn primary" @click="validerCode">Valider</button>
                <button class="btn ghost" @click="fermerCodePopup">Annuler</button>
            </div>
        </div>
    </div>

    <!-- POPUP FIN DE PARTIE -->
    <div v-if="scenarioChoisi && finDePartie" class="fin-partie-overlay">
        <div class="fin-partie-popup">
            <h2>🎉 Partie terminée !</h2>
            <div class="score-final">
                <p class="score-label">Votre score final</p>
                <p class="score-value">{{ score }}</p>
            </div>
            
            <div class="classement-section" v-if="classement.length > 0">
                <h3>Classement des joueurs</h3>
                <table class="classement-table">
                    <thead>
                        <tr>
                            <th>Rang</th>
                            <th>Pseudo</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(entry, index) in classement" :key="entry.id" 
                            :class="{ 'current-player': entry.pseudo === pseudo }">
                            <td>{{ index + 1 }}</td>
                            <td>{{ entry.pseudo }}</td>
                            <td>{{ entry.score }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="fin-partie-actions">
                <button class="btn primary" @click="rejouer">Oui, continuer</button>
                <button class="btn ghost" @click="retourAccueil">Non, quitter</button>
            </div>
        </div>
    </div>
    </template>
    </div>

    <footer class="footer" v-if="scenarioChoisi">
        <p> « Comme Hakimi, trouve toujours la passe décisive dans les rues de Paris » </p>
    </footer>
</div>

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

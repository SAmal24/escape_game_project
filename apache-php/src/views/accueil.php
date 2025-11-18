<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Hakimi Quest – Accueil</title>

    <style>
        body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: url('/public/img/hakimi_bg.jpg') center/cover no-repeat fixed;
            height: 100vh;
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .overlay {
            background: rgba(0,0,0,0.55);
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            width: 450px;
            animation: fadeIn 1.2s ease-in-out;
        }

        h1 {
            font-size: 38px;
            margin-bottom: 10px;
        }

        p.slogan {
            font-size: 18px;
            font-style: italic;
            margin-bottom: 30px;
            opacity: 0.85;
        }

        button {
            background-color: #1E90FF;
            border: none;
            padding: 15px 25px;
            border-radius: 10px;
            color: white;
            font-size: 18px;
            cursor: pointer;
            transition: 0.3s;
        }
        button:hover {
            background-color: #0B63C5;
            transform: scale(1.05);
        }

        /* POPUP */
        .popup-bg {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.65);
            display: none;
            justify-content: center;
            align-items: center;
        }

        .popup {
            background: white;
            padding: 30px;
            border-radius: 15px;
            width: 350px;
            color: black;
            text-align: center;
            animation: fadeIn 0.5s ease;
        }

        input {
            width: 90%;
            padding: 12px;
            margin-top: 15px;
            border-radius: 8px;
            border: 1px solid #ccc;
        }

        .start-btn {
            margin-top: 20px;
            background-color: #0B63C5;
            color: white;
            width: 90%;
        }

        @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>

<body>

<div class="overlay">
    <h1>Hakimi’s Paris Quest</h1>
    <p class="slogan">Pars à la recherche des secrets d’Hakimi<br>au cœur de Paris !</p>

    <button onclick="showPopup()">Commencer le jeu</button>
</div>

<!-- POPUP POUR LE PSEUDO -->
<div class="popup-bg" id="popup">
    <div class="popup">
        <h2>Entrez votre pseudo</h2>

        <input type="text" id="pseudo" placeholder="Ex: PSGMaster75">

        <button class="start-btn" onclick="startGame()">Jouer</button>
    </div>
</div>

<script>
    function showPopup() {
        document.getElementById("popup").style.display = "flex";
    }

    function startGame() {
        const pseudo = document.getElementById("pseudo").value.trim();

        if (pseudo === "") {
            alert("Veuillez entrer un pseudo !");
            return;
        }

        // Redirection avec le pseudo dans l'URL
        window.location.href = "/jeu?pseudo=" + encodeURIComponent(pseudo);
    }
</script>

</body>
</html>

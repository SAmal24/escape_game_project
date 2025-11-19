<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Hakimi Quest – Accueil</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">

    <style>
        :root {
            --psg-blue: #001e5a;
            --psg-red: #ed213a;
            --midnight: #03040f;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: "Poppins", Arial, sans-serif;
            background:
                linear-gradient(130deg, rgba(0, 30, 90, 0.85), rgba(3, 4, 15, 0.95)),
                url('/public/img/parc_princes.jpg') center/cover fixed;
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 40px 20px;
        }

        .overlay {
            background: rgba(0, 0, 0, 0.55);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 45px;
            border-radius: 24px;
            width: min(100%, 1100px);
            animation: fadeIn 1.2s ease-in-out;
            box-shadow: 0 40px 80px rgba(0, 0, 0, 0.45);
        }

        .hero-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 40px;
            align-items: center;
        }

        .hero-text h1 {
            font-size: clamp(42px, 5vw, 58px);
            margin: 0 0 15px;
            letter-spacing: 1px;
        }

        .hero-text h1 span {
            color: var(--psg-red);
        }

        p.slogan {
            font-size: 20px;
            font-style: italic;
            margin-bottom: 35px;
            opacity: 0.9;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 999px;
            padding: 10px 20px;
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-size: 14px;
        }

        .hero-gallery {
            display: grid;
            gap: 16px;
        }

        .hero-card {
            position: relative;
            height: 180px;
            border-radius: 18px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
            background-size: cover;
            background-position: center;
        }

        .hero-card::after {
            content: attr(data-label);
            position: absolute;
            bottom: 12px;
            left: 16px;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 13px;
            letter-spacing: 1px;
            background: rgba(0, 0, 0, 0.55);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .card-hakimi {
            background-image:
                linear-gradient(120deg, rgba(0, 0, 0, 0.1), rgba(0, 30, 90, 0.55)),
                url('/public/img/hakimi_bg.jpg');
        }

        .card-psg {
            background-image:
                linear-gradient(140deg, rgba(3, 4, 15, 0.2), rgba(237, 33, 58, 0.55)),
                url('/public/img/psg_team.jpg');
        }

        .card-parc {
            background-image:
                linear-gradient(140deg, rgba(0, 0, 0, 0.25), rgba(237, 33, 58, 0.45)),
                url('/public/img/parc_nocturne.jpg');
        }

        button {
            background-image: linear-gradient(120deg, var(--psg-red), #ff6f61);
            border: none;
            padding: 16px 32px;
            border-radius: 999px;
            color: white;
            font-size: 18px;
            cursor: pointer;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            box-shadow: 0 20px 40px rgba(237, 33, 58, 0.35);
        }

        button:hover {
            transform: translateY(-3px) scale(1.03);
            box-shadow: 0 25px 60px rgba(237, 33, 58, 0.5);
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
            background: #f5f5f8;
            padding: 30px;
            border-radius: 20px;
            width: 360px;
            color: #111;
            text-align: center;
            animation: fadeIn 0.5s ease;
            border: 1px solid rgba(0, 0, 0, 0.05);
            box-shadow: 0 35px 70px rgba(0, 0, 0, 0.25);
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
            background-image: linear-gradient(120deg, var(--psg-blue), var(--psg-red));
            color: white;
            width: 90%;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>

<body>

<div class="overlay">
    <div class="hero-grid">
        <div class="hero-text">
            <div class="badge">Hakimi & PSG Quest</div>
            <h1>Explore <span>Hakimi</span> et la légende du PSG</h1>
            <p class="slogan">
                Dévoile les secrets croisés d’Achraf Hakimi et du Paris Saint-Germain
                dans une aventure urbaine immersive à travers la capitale.
            </p>
            <button onclick="showPopup()">Commencer le jeu</button>
        </div>

        <div class="hero-gallery">
            <div class="hero-card card-hakimi" data-label="Héros du jeu"></div>
            <div class="hero-card card-psg" data-label="Dynastie PSG"></div>
            <div class="hero-card card-parc" data-label="Parc des Princes"></div>
        </div>
    </div>
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

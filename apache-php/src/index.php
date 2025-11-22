<?php

declare(strict_types=1);

require_once 'flight/Flight.php';

// Route d'accueil - la page principale
Flight::route('/', function() {
    Flight::render('accueil');
});


// ============================================
// Connexion à la base de données PostgreSQL
// ============================================
// J'ai mis les infos de connexion ici directement, c'est plus simple pour le dev
// TODO: peut-être mettre ça dans un fichier de config plus tard si besoin
$host = "db";
$port = 5432;
$dbname = "mydb";
$user = "postgres";
$pass = "postgres";

$conn = pg_connect("host=$host port=$port dbname=$dbname user=$user password=$pass");

if (!$conn) {
    die("Erreur connexion DB"); // Faut pas que ça plante silencieusement
}

Flight::set('db', $conn); // On stocke la connexion pour l'utiliser partout

// ============================================
// Routes des pages
// ============================================
// Route d'accueil (déjà définie plus haut mais bon, on la laisse)
Flight::route('/', function() {
    Flight::render('accueil');
});

// Ancienne version commentée, j'avais testé autre chose avant
//Flight::route('/jeu', function() {
//    Flight::render('jeu');
//});

// Route du jeu principal - récupère le pseudo depuis l'URL
Flight::route('/jeu', function() {
    // Récupérer le pseudo depuis l'URL, sinon mettre "Joueur" par défaut
    $pseudo = isset($_GET['pseudo']) ? $_GET['pseudo'] : "Joueur";

    Flight::render('jeu', [
        'pseudo' => $pseudo
    ]);
});



// ============================================
// API : GET /api/objets
// Récupère tous les objets du jeu avec leurs coordonnées
// ============================================
Flight::route('GET /api/objets', function() {
    $conn = Flight::get('db');

    // Requête SQL pour récupérer les objets avec leurs positions géographiques
    // On utilise ST_X et ST_Y pour extraire la longitude et latitude depuis PostGIS
    // J'avais testé avec ST_AsText mais c'était moins pratique côté JS
    $sql = "
        SELECT o.id, o.nom, o.type_objet, o.icone, o.zoom_min,
               o.id_point,
               o.code_necessaire, o.id_objet_blocant, o.indice,
               o.charge_au_depart,
               ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat
        FROM objets o
        JOIN points p ON o.id_point = p.id
        ORDER BY o.id
    ";

    $res = pg_query($conn, $sql);
    $objets = pg_fetch_all($res);

    // Retourner en JSON directement
    Flight::json($objets);
});



// ============================================
// API : GET /api/objets/{id}
// Récupère les infos détaillées d'un objet spécifique
// ============================================
Flight::route('GET /api/objets/@id', function($id) {
    $conn = Flight::get('db');

    // On utilise pg_query_params pour éviter les injections SQL
    $sql = "
        SELECT o.*, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat
        FROM objets o
        JOIN points p ON o.id_point = p.id
        WHERE o.id = $1
    ";

    $result = pg_query_params($conn, $sql, [$id]);
    $objet = pg_fetch_assoc($result);

    Flight::json($objet);
});

// ============================================
// API : POST /api/scores
// Sauvegarde le score d'un joueur (cumulatif)
// ============================================
Flight::route('POST /api/scores', function() {
    $conn = Flight::get('db');
    $data = json_decode(Flight::request()->getBody(), true);
    
    $pseudo = $data['pseudo'] ?? '';
    $score = intval($data['score'] ?? 0);
    
    // Validation basique
    if (empty($pseudo) || $score < 0) {
        Flight::json(['error' => 'Données invalides'], 400);
        return;
    }
    
    // On essaie d'abord avec ON CONFLICT (PostgreSQL 9.5+)
    // Ça permet d'insérer ou mettre à jour en une seule requête
    // C'est plus élégant que de faire SELECT puis UPDATE ou INSERT
    $upsertSql = "
        INSERT INTO scores (pseudo, score)
        VALUES ($1, $2)
        ON CONFLICT (pseudo)
        DO UPDATE SET
            score = scores.score + EXCLUDED.score,
            date_partie = CURRENT_TIMESTAMP
        RETURNING id, score
    ";
    
    // Le @ supprime les warnings si la requête échoue
    // On gère l'erreur manuellement après
    $result = @pg_query_params($conn, $upsertSql, [$pseudo, $score]);
    
    if ($result === false) {
        $errorMessage = pg_last_error($conn);
        error_log("Erreur UPSERT scores: " . $errorMessage);

        // Fallback manuel si la contrainte UNIQUE n'existe pas encore
        // Ça peut arriver si la table n'a pas été créée avec la bonne contrainte
        $checkSql = "SELECT id, score FROM scores WHERE pseudo = $1 ORDER BY date_partie DESC LIMIT 1";
        $checkResult = pg_query_params($conn, $checkSql, [$pseudo]);
        $existing = pg_fetch_assoc($checkResult);

        if ($existing) {
            // Le joueur existe déjà, on met à jour son score
            $newScore = intval($existing['score']) + $score;
            $updateSql = "UPDATE scores SET score = $1, date_partie = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, score";
            $updateResult = pg_query_params($conn, $updateSql, [$newScore, $existing['id']]);
            $row = pg_fetch_assoc($updateResult);
        } else {
            // Nouveau joueur, on l'insère
            $insertSql = "INSERT INTO scores (pseudo, score) VALUES ($1, $2) RETURNING id, score";
            $insertResult = pg_query_params($conn, $insertSql, [$pseudo, $score]);
            $row = pg_fetch_assoc($insertResult);
        }
    } else {
        // L'UPSERT a fonctionné, on récupère le résultat
        $row = pg_fetch_assoc($result);
    }

    if (!$row) {
        Flight::json(['error' => 'Impossible de sauvegarder le score'], 500);
        return;
    }

    Flight::json([
        'success' => true,
        'id' => intval($row['id']),
        'score' => intval($row['score'])
    ]);
});

// ============================================
// API : GET /api/scores/{pseudo}
// Récupère le score total d'un joueur spécifique
// ============================================
Flight::route('GET /api/scores/@pseudo', function($pseudo) {
    $conn = Flight::get('db');

    $sql = "SELECT score FROM scores WHERE pseudo = $1 LIMIT 1";
    $result = pg_query_params($conn, $sql, [$pseudo]);
    $row = pg_fetch_assoc($result);

    if ($row) {
        Flight::json([
            'pseudo' => $pseudo,
            'score' => intval($row['score'])
        ]);
    } else {
        // Le joueur n'existe pas encore, on retourne 0
        Flight::json([
            'pseudo' => $pseudo,
            'score' => 0
        ]);
    }
});

// ============================================
// API : GET /api/scores
// Récupère le classement général (top 20)
// ============================================
Flight::route('GET /api/scores', function() {
    $conn = Flight::get('db');
    
    // Classement par score décroissant, puis par date si égalité
    $sql = "
        SELECT id, pseudo, score, date_partie
        FROM scores
        ORDER BY score DESC, date_partie DESC
        LIMIT 20
    ";
    
    $result = pg_query($conn, $sql);
    $scores = pg_fetch_all($result) ?: []; // Si pas de résultats, retourner un tableau vide
    
    Flight::json($scores);
});



// ============================================
// Démarrer l'application Flight
// ============================================
Flight::start();

?>
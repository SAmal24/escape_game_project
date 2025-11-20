<?php

declare(strict_types=1);

require_once 'flight/Flight.php';

Flight::route('/', function() {
    Flight::render('accueil');
});


// ----------------------------------------------------
// Connexion PostgreSQL
// ----------------------------------------------------
$host = "db";
$port = 5432;
$dbname = "mydb";
$user = "postgres";
$pass = "postgres";

$conn = pg_connect("host=$host port=$port dbname=$dbname user=$user password=$pass");

if (!$conn) {
    die("Erreur connexion DB");
}

Flight::set('db', $conn);

// ----------------------------------------------------
// Pages HTML
// ----------------------------------------------------
Flight::route('/', function() {
    Flight::render('accueil');
});

//Flight::route('/jeu', function() {
  //  Flight::render('jeu');
//});



Flight::route('/jeu', function() {

    $pseudo = isset($_GET['pseudo']) ? $_GET['pseudo'] : "Joueur";

    Flight::render('jeu', [
        'pseudo' => $pseudo
    ]);
});



// ----------------------------------------------------
// API : GET api/objets
// Renvoie tous les objets avec leurs informations
// ----------------------------------------------------
Flight::route('GET /api/objets', function() {
    $conn = Flight::get('db');

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

    Flight::json($objets);
});



// ----------------------------------------------------
// API : GET api/objets/{id}
// Renvoie les données détaillées d’un objet
// ----------------------------------------------------
Flight::route('GET /api/objets/@id', function($id) {
    $conn = Flight::get('db');

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

// ----------------------------------------------------
// API : POST api/scores
// Sauvegarde ou met à jour le score d'un joueur
// ----------------------------------------------------
Flight::route('POST /api/scores', function() {
    $conn = Flight::get('db');
    $data = json_decode(Flight::request()->getBody(), true);
    
    $pseudo = $data['pseudo'] ?? '';
    $score = intval($data['score'] ?? 0);
    
    if (empty($pseudo) || $score < 0) {
        Flight::json(['error' => 'Données invalides'], 400);
        return;
    }
    
    // Insérer ou mettre à jour le score (cumul des points)
    $upsertSql = "
        INSERT INTO scores (pseudo, score)
        VALUES ($1, $2)
        ON CONFLICT (pseudo)
        DO UPDATE SET
            score = scores.score + EXCLUDED.score,
            date_partie = CURRENT_TIMESTAMP
        RETURNING id, score
    ";
    
    $result = @pg_query_params($conn, $upsertSql, [$pseudo, $score]);
    
    if ($result === false) {
        $errorMessage = pg_last_error($conn);
        error_log("Erreur UPSERT scores: " . $errorMessage);

        // Fallback manuel si la contrainte UNIQUE n'existe pas encore
        $checkSql = "SELECT id, score FROM scores WHERE pseudo = $1 ORDER BY date_partie DESC LIMIT 1";
        $checkResult = pg_query_params($conn, $checkSql, [$pseudo]);
        $existing = pg_fetch_assoc($checkResult);

        if ($existing) {
            $newScore = intval($existing['score']) + $score;
            $updateSql = "UPDATE scores SET score = $1, date_partie = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, score";
            $updateResult = pg_query_params($conn, $updateSql, [$newScore, $existing['id']]);
            $row = pg_fetch_assoc($updateResult);
        } else {
            $insertSql = "INSERT INTO scores (pseudo, score) VALUES ($1, $2) RETURNING id, score";
            $insertResult = pg_query_params($conn, $insertSql, [$pseudo, $score]);
            $row = pg_fetch_assoc($insertResult);
        }
    } else {
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

// ----------------------------------------------------
// API : GET api/scores/{pseudo}
// Récupère le score cumulé d'un joueur
// ----------------------------------------------------
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
        Flight::json([
            'pseudo' => $pseudo,
            'score' => 0
        ]);
    }
});

// ----------------------------------------------------
// API : GET api/scores
// Récupère le classement des scores
// ----------------------------------------------------
Flight::route('GET /api/scores', function() {
    $conn = Flight::get('db');
    
    $sql = "
        SELECT id, pseudo, score, date_partie
        FROM scores
        ORDER BY score DESC, date_partie DESC
        LIMIT 20
    ";
    
    $result = pg_query($conn, $sql);
    $scores = pg_fetch_all($result) ?: [];
    
    Flight::json($scores);
});



// ----------------------------------------------------
// Lancer l'application
// ----------------------------------------------------
Flight::start();

?>
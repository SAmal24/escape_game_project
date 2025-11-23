<?php

declare(strict_types=1);

require_once 'flight/Flight.php';

Flight::route('/', function() {
    Flight::render('accueil');
});

// Connexion DB
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

Flight::route('/jeu', function() {
    $pseudo = isset($_GET['pseudo']) ? $_GET['pseudo'] : "Joueur";
    Flight::render('jeu', ['pseudo' => $pseudo]);
});
// API objets
Flight::route('GET /api/objets', function() {
    $conn = Flight::get('db');
    $sql = "
        SELECT o.id, o.nom, o.type_objet, o.icone, o.zoom_min,
               o.id_point, o.code_necessaire, o.id_objet_blocant, o.indice,
               o.charge_au_depart,
               ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat
        FROM objets o
        JOIN points p ON o.id_point = p.id
        ORDER BY o.id
    ";
    $res = pg_query($conn, $sql);
    Flight::json(pg_fetch_all($res));
});

Flight::route('GET /api/objets/@id', function($id) {
    $conn = Flight::get('db');
    $sql = "
        SELECT o.*, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat
        FROM objets o
        JOIN points p ON o.id_point = p.id
        WHERE o.id = $1
    ";
    $result = pg_query_params($conn, $sql, [$id]);
    Flight::json(pg_fetch_assoc($result));
});

// API scores
Flight::route('POST /api/scores', function() {
    $conn = Flight::get('db');
    $data = json_decode(Flight::request()->getBody(), true);
    $pseudo = $data['pseudo'] ?? '';
    $score = intval($data['score'] ?? 0);
    
    if (empty($pseudo) || $score < 0) {
        Flight::json(['error' => 'Données invalides'], 400);
        return;
    }
    
    $upsertSql = "
        INSERT INTO scores (pseudo, score)
        VALUES ($1, $2)
        ON CONFLICT (pseudo)
        DO UPDATE SET score = scores.score + EXCLUDED.score, date_partie = CURRENT_TIMESTAMP
        RETURNING id, score
    ";
    
    $result = @pg_query_params($conn, $upsertSql, [$pseudo, $score]);
    
    if ($result === false) {
        // fallback si upsert fail
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

    Flight::json(['success' => true, 'id' => intval($row['id']), 'score' => intval($row['score'])]);
});

Flight::route('GET /api/scores/@pseudo', function($pseudo) {
    $conn = Flight::get('db');
    $sql = "SELECT score FROM scores WHERE pseudo = $1 LIMIT 1";
    $result = pg_query_params($conn, $sql, [$pseudo]);
    $row = pg_fetch_assoc($result);
    
    Flight::json([
        'pseudo' => $pseudo,
        'score' => $row ? intval($row['score']) : 0
    ]);
});

Flight::route('GET /api/scores', function() {
    $conn = Flight::get('db');
    $sql = "SELECT id, pseudo, score, date_partie FROM scores ORDER BY score DESC, date_partie DESC LIMIT 20";
    $result = pg_query($conn, $sql);
    Flight::json(pg_fetch_all($result) ?: []);
});

Flight::start();

?>
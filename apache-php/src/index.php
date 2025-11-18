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
// Renvoie tous les objets visibles au démarrage du jeu
// ----------------------------------------------------
Flight::route('GET /api/objets', function() {
    $conn = Flight::get('db');

    $sql = "
        SELECT o.id, o.nom, o.type_objet, o.icone, o.zoom_min,
               ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat
        FROM objets o
        JOIN points p ON o.id_point = p.id
        WHERE o.charge_au_depart = TRUE
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
// Lancer l'application
// ----------------------------------------------------
Flight::start();

?>
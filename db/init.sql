-- Activer PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS points CASCADE;

-- Créer une table points avec un champ géométrie
CREATE TABLE points (
    id SERIAL PRIMARY KEY,
    name TEXT,
    geom geometry(Point, 4326)
);


---------------------------------------------------------
-- TYPES D'OBJETS (liste fermée)
---------------------------------------------------------

DROP TABLE IF EXISTS types_objets CASCADE;

CREATE TABLE types_objets (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);



---------------------------------------------------------
-- TABLE OBJETS (la table principale du jeu)
---------------------------------------------------------

DROP TABLE IF EXISTS objets CASCADE;

CREATE TABLE objets (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    type_objet VARCHAR(50) REFERENCES types_objets(code),
    code_necessaire VARCHAR(10),
    id_objet_blocant INT REFERENCES objets(id),
    id_point INT REFERENCES points(id) ON DELETE CASCADE,
    zoom_min INT DEFAULT 14,
    icone VARCHAR(255),
    indice TEXT,
    charge_au_depart BOOLEAN DEFAULT FALSE
);


---------------------------------------------------------
-- TABLE SCORES
---------------------------------------------------------

DROP TABLE IF EXISTS scores CASCADE;

CREATE TABLE scores (
    id SERIAL PRIMARY KEY,
    pseudo VARCHAR(50) NOT NULL,
    temps INT NOT NULL,
    date_partie TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


---------------------------------------------------------
-- INSERTION DES POINTS (scénario Hakimi’s Paris Quest)
---------------------------------------------------------

INSERT INTO points (name, geom) VALUES
('Tour Eiffel', ST_SetSRID(ST_MakePoint(2.294481, 48.858370), 4326)),   -- id = 1
('Arc de Triomphe', ST_SetSRID(ST_MakePoint(2.295028, 48.873792), 4326)), -- id = 2
('Trocadéro', ST_SetSRID(ST_MakePoint(2.287247, 48.862773), 4326)),       -- id = 3
('Parc des Princes', ST_SetSRID(ST_MakePoint(2.253030, 48.841388), 4326)),-- id = 4
('Pont Mirabeau', ST_SetSRID(ST_MakePoint(2.275975, 48.846231), 4326));   -- id = 5


INSERT INTO types_objets (code, description) VALUES
('recuperable', 'Objet récupérable'),
('code', 'Objet affichant un code à 4 chiffres'),
('bloque_objet', 'Objet bloqué par un autre objet'),
('bloque_code', 'Objet bloqué par un code'),
('final', 'Objet final');



---------------------------------------------------------
-- INSERTION DES OBJETS DU JEU
---------------------------------------------------------

-- 1. Chaussure de Vitesse (récupérable)
INSERT INTO objets 
(nom, type_objet, id_point, charge_au_depart, icone)
VALUES
('Chaussure de Vitesse', 'recuperable', 1, TRUE, 'speed_boots.png');

-- 2. Casque Audio de Concentration (bloqué par un objet)
INSERT INTO objets 
(nom, type_objet, id_objet_blocant, indice, id_point, icone)
VALUES
('Casque Audio de Concentration', 'bloque_objet', 1,
'Tu n’iras pas loin si tu n’entends pas les supporters',
2, 'headset.png');

-- 3. Téléphone Cryptex (code = 1970)
INSERT INTO objets 
(nom, type_objet, code_necessaire, id_point, charge_au_depart, icone)
VALUES
('Téléphone Cryptex', 'code', '1970', 3, TRUE, 'phone.png');

-- 4. Carte d’Entraînement (bloqué par code 1970)
INSERT INTO objets 
(nom, type_objet, code_necessaire, indice, id_point, icone)
VALUES
('Carte d’Entraînement', 'bloque_code', '1970',
'Cherche là où résonnent les chants',
4, 'training_card.png');

-- 5. Le Sésame d’Hakimi (final)
INSERT INTO objets 
(nom, type_objet, id_objet_blocant, id_point, icone)
VALUES
('Le Sésame d’Hakimi', 'final', 4, 5, 'golden_key.png');


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

---- Points de scénario 1
INSERT INTO points (name, geom) VALUES
('Tour Eiffel', ST_SetSRID(ST_MakePoint(2.294481, 48.858370), 4326)),   -- id = 1
('Arc de Triomphe', ST_SetSRID(ST_MakePoint(2.295028, 48.873792), 4326)), -- id = 2
('Trocadéro', ST_SetSRID(ST_MakePoint(2.287247, 48.862773), 4326)),       -- id = 3
('Parc des Princes', ST_SetSRID(ST_MakePoint(2.253030, 48.841388), 4326)),-- id = 4
('Pont Mirabeau', ST_SetSRID(ST_MakePoint(2.275975, 48.846231), 4326));   -- id = 5

---- Points de scénario 2
INSERT INTO points (name, geom) VALUES
('Champs-Élysées', ST_SetSRID(ST_MakePoint(2.307247,48.869798),4326)), -- id = 6
('Louvre', ST_SetSRID(ST_MakePoint(2.335841,48.860846),4326)),         -- id = 7
('Gare Saint-Lazare', ST_SetSRID(ST_MakePoint(2.324532,48.875379),4326)), -- id = 8
('Parc Monceau', ST_SetSRID(ST_MakePoint(2.309878,48.879915),4326)),   -- id = 9
('Stade Charléty', ST_SetSRID(ST_MakePoint(2.345249,48.819212),4326)); -- id =10
-- SCENARIO 3 : Mbappé Speed Run
INSERT INTO points (name, geom) VALUES
('La Villette', ST_SetSRID(ST_MakePoint(2.388443,48.88999),4326)), -- id = 11
('Sacré-Cœur', ST_SetSRID(ST_MakePoint(2.343104,48.886705),4326)), -- id =12
('Châtelet', ST_SetSRID(ST_MakePoint(2.34706,48.858144),4326)),    -- id =13
('Gare de Lyon', ST_SetSRID(ST_MakePoint(2.375283,48.844279),4326)), -- id =14
('Place de la Concorde', ST_SetSRID(ST_MakePoint(2.321236,48.865633),4326)); -- id =15

---------------------------------------------------------
-- INSERTION DES TYPES D'OBJETS
---------------------------------------------------------

INSERT INTO types_objets (code, description) VALUES
('recuperable', 'Objet récupérable'),
('code', 'Objet affichant un code à 4 chiffres'),
('bloque_objet', 'Objet bloqué par un autre objet'),
('bloque_code', 'Objet bloqué par un code'),
('final', 'Objet final');



---------------------------------------------------------
-- INSERTION DES OBJETS DU JEU scénario 1
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


---------------------------------------------------------
-- INSERTION DES OBJETS DU JEU scénario 2
---------------------------------------------------------

INSERT INTO objets (nom,type_objet,id_point,charge_au_depart,icone,indice)
VALUES
('Balle Lumineuse','recuperable',6,TRUE,'magic_ball.png',
'Là où les rêves deviennent lumières');

INSERT INTO objets (nom,type_objet,id_objet_blocant,id_point,icone,indice)
VALUES
('Bracelet de Dribble','bloque_objet',6,7,'dribble_bracelet.png',
'La beauté de l’art inspire les meilleurs dribbles');

INSERT INTO objets (nom,type_objet,code_necessaire,id_point,charge_au_depart,icone,indice)
VALUES
('Montre Temps Arrêté','code','827',8,TRUE,'stopped_watch.png',
'Son premier numéro au Barça');

INSERT INTO objets (nom,type_objet,code_necessaire,id_point,icone,indice)
VALUES
('Gants de Magie','bloque_code','827',9,'magic_gloves.png',
'Dans un coin calme, la magie continue');

INSERT INTO objets (nom,type_objet,id_objet_blocant,id_point,icone,indice)
VALUES
('La Pulga d’Or','final',9,10,'golden_pulga.png',
'Là où la vitesse est reine');


---------------------------------------------------------
-- INSERTION DES OBJETS DU JEU scénario 3
---------------------------------------------------------   
INSERT INTO objets (nom,type_objet,id_point,charge_au_depart,icone,indice)
VALUES ('Chaussures Éclairs','recuperable',11,TRUE,'thunder_shoes.png',
'Le sprint commence au Nord');

INSERT INTO objets (nom,type_objet,id_objet_blocant,id_point,icone,indice)
VALUES ('Ballon Supersonique','bloque_objet',11,12,'super_ball.png',
'Là-haut, Paris à tes pieds');

INSERT INTO objets (nom,type_objet,code_necessaire,id_point,charge_au_depart,icone,indice)
VALUES ('Ticket Secret','code','10',13,TRUE,'secret_ticket.png',
'Son numéro en EDF');

INSERT INTO objets (nom,type_objet,code_necessaire,id_point,icone,indice)
VALUES ('Jeton de Compétition','bloque_code','10',14,'competition_token.png',
'Pour aller toujours plus loin');

INSERT INTO objets (nom,type_objet,id_objet_blocant,id_point,icone,indice)
VALUES ('Trident de la Victoire','final',14,15,'victory_trident.png',
'Victoire au cœur de Paris');

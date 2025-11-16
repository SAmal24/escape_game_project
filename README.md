# Docker Starter Kit

Construit un environnement Docker avec Apache+PHP+Flight, Postgres/PostGIS, pgAdmin, GeoServer.

## Structure générale

L’environnement est composé de 4 services (définis dans `docker-compose.yml`) :

| Service                | Nom interne | Rôle                                    | Ports exposés (hôte:docker) | Volume principal                         |
| ---------------------- | ----------- | --------------------------------------- | --------------------------- | ---------------------------------------- |
| **Apache+PHP**         | web         | Serveur web pour application Flight PHP | `1234:80`                   | `./apache-php/src:/var/www/html`         |
| **PostgreSQL+PostGIS** | db          | Base de données spatiale                | `5432`                      | `pg_data:/var/lib/postgresql/data`       |
| **pgAdmin**            | pgadmin     | Interface web pour gérer Postgres       | `5050:80`                   | `pgadmin_data:/var/lib/pgadmin`          |
| **GeoServer**          | geoserver   | Serveur cartographique (WMS, WFS, WCS)  | `8080:8080`                 | `geoserver_data:/opt/geoserver/data_dir` |

## Détails des services

### Apache+PHP+Flight

- basé sur `./apache-php/Dockerfile`
- fichiers sources dans `./apache-php/src`
- http://localhost:1234

### Postgres+PostGIS

- user: `postgres`, pass: `postgres`, base: `mydb`, port: `5432`
- exécute `./db/init.sql` au premier démarrage (contruit une table points, avec 3 points)

### pgadmin

- user: `admin@admin.com`, pass: `admin`
- permet de se connecter à postgres si besoin (host `db`, port `5432`, user/pass, sans SSL)
- http://localhost:5050

### GeoServer

- user: `admin`, pass: `geoserver`
- http://localhost:8080/geoserver

## Volumes & persistance

Les volumes Docker permettent de conserver les données même si le conteneur est supprimé et/ou relancé :

- un volume pour Apache+PHP (monté sur le dossier `./apache-php/src`)
- trois autres volumes Docker pour les données (attention, les données de ces volumes ne sont pas accessibles en local, voir «Sauvegarde» plus loin)

```yml
volumes:
  pg_data:
  pgadmin_data:
  geoserver_data:
```

- `pg_data` stocke la base PostGIS (schémas, données, utilisateurs)
- `pgadmin_data` stocke les données pgadmin (connexions)
- `geoserver_data` stocke la configuration GeoServer (workspaces)

## Commandes de base

```sh
# lance la stack Docker
docker compose up
docker compose up -d # en mode daemon

# arrête la stack
docker compose down
docker compose down -v # supprime en plus les volumes
```

## Sauvegarde

Pour récupérer en local les données de la BDD et de GeoServer, exécutez les scripts respectifs depuis la racine du projet

```sh
# Copie des workspaces GeoServer
# docker compose cp <container>:<from> <to>
docker compose cp geoserver:/opt/geoserver/data_dir/workspaces/. ./geoserver-workspaces/

# Export SQL de la base (dump)
docker compose exec -t db pg_dump --inserts -U postgres -d mydb > "./db/backup.sql"
```

- un dossier `./geoserver-workspaces` est créé pour les données des workspaces GeoServer
- un fichier `./db/backup.sql` est créé pour un dump de la BDD

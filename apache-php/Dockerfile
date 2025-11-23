FROM php:8.2-apache

# Installer extensions PHP nécessaires (incluant curl pour le proxy GeoServer)
RUN apt-get update && apt-get install -y libpq-dev unzip git curl && docker-php-ext-install pdo pdo_pgsql pgsql

# Activer mod_rewrite
RUN a2enmod rewrite

# Copier le code source
COPY src/ /var/www/html/

# Droits
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

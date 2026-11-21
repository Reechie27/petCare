# PetCare Laravel backend

This Laravel folder is a scaffold for the PetCare backend API.

## Install dependencies

Because PHP and Composer are not available in this environment, you need to install them on your machine first and then run:

```bash
cd laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

The app expects a MySQL database named `petcare` with a user `petcare` and password `petcare123`.

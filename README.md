# SIGMAN

Sistema de Gestão de Manutenção para a frota de embarcações da FURG. Centraliza o controle de embarcações, equipamentos, ordens de serviço, docagens e solicitações de serviço, com dashboard, notificações e geração de relatórios.

## Stack

- **Backend:** Laravel 13 (PHP 8.3), PostgreSQL, Laravel Sanctum, Laravel Reverb (WebSockets)
- **Frontend:** React 18 + Inertia.js, Tailwind CSS, Vite
- **Visualização:** ApexCharts, Recharts, React Google Charts, React Leaflet (mapas), React Three Fiber (3D)
- **Testes:** Pest

## Requisitos

- PHP >= 8.3 com Composer
- Node.js e npm
- PostgreSQL

## Instalação (ambiente local)

```bash
git clone git@github.com:FROTA-FURG/sigman.git
cd sigman
composer run setup
```

O comando `composer run setup` instala as dependências PHP e JS, cria o `.env` a partir do `.env.example`, gera a `APP_KEY`, roda as migrations e builda os assets.

Configure o `.env` com as credenciais do seu banco e demais serviços (nunca versione esse arquivo nem inclua segredos no README — use um gerenciador de senhas para credenciais compartilhadas com a equipe).

## Desenvolvimento

Sobe o servidor Laravel, a fila, os logs (Pail) e o Vite em paralelo:

```bash
composer run dev
```

Ou individualmente:

```bash
php artisan serve
npm run dev
```

## Tarefas agendadas

Verifica ordens de serviço (OS) que devem ser disparadas na data prevista:

```bash
php artisan app:check-scheduled-os
```

## Testes

```bash
composer run test
```

## Deploy

O deploy é feito em uma VPS própria. Credenciais de acesso (SSH, banco de dados, e-mail) ficam no gerenciador de senhas da equipe

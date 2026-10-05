#!/usr/bin/env python3
"""
Sobe a tela de Análise de Óleo na VPS -- tudo num comando só.

Rode de dentro da pasta do projeto no servidor:

    cd /var/www/sigman
    python3 src/AnaliseOleo/subir_analise_oleo.py            # pergunta antes de cada passo
    python3 src/AnaliseOleo/subir_analise_oleo.py --simular  # só mostra o que faria
    python3 src/AnaliseOleo/subir_analise_oleo.py --sim      # responde "sim" pra tudo

O que ele faz, em ordem:
  1. Confere o ambiente (pasta do projeto, .env, php/composer/npm, git).
  2. Backup do banco (pg_dump) e do storage/app em ~/backups -- antes de mexer.
  3. git pull do branch atual.
  4. composer install + npm ci + npm run build.
  5. php artisan migrate (cria as tabelas oil_*).
  6. Carga da planilha: oil-analysis:import em modo de conferência e, se
     você confirmar, de verdade. Os dados já estão prontos no repositório
     (src/AnaliseOleo/analise_oleo.json, extraídos da planilha de gestão).
  7. Limpa caches, acerta dono das pastas e confere o limite de upload do PHP.

Variáveis do banco: lidas do .env do próprio servidor (DB_HOST, DB_PORT,
DB_DATABASE, DB_USERNAME, DB_PASSWORD) -- nada de senha neste arquivo.

Só usa a biblioteca padrão do Python 3.
"""
import argparse
import datetime as dt
import os
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
JSON_PLANILHA = RAIZ / 'src/AnaliseOleo/analise_oleo.json'
BACKUPS = Path.home() / 'backups'
USUARIO_WEB = 'www-data'

# Cores só se o terminal suportar.
_COR = sys.stdout.isatty()
def _c(cod, t): return f'\033[{cod}m{t}\033[0m' if _COR else t
def titulo(t): print('\n' + _c('1;34', f'==> {t}'))
def ok(t): print(_c('32', f'  ✔ {t}'))
def aviso(t): print(_c('33', f'  ! {t}'))
def erro(t): print(_c('31', f'  ✘ {t}'))


class Subida:
    def __init__(self, args):
        self.args = args
        self.env = {}
        self.carimbo = dt.datetime.now().strftime('%Y%m%d-%H%M')

    # -- utilidades --------------------------------------------------------

    def perguntar(self, texto):
        if self.args.sim or self.args.simular:
            return True
        resp = input(_c('1', f'  ? {texto} [s/N] ')).strip().lower()
        return resp in ('s', 'sim', 'y', 'yes')

    def rodar(self, cmd, env_extra=None, checar=True, capturar=False):
        exibir = cmd if isinstance(cmd, str) else ' '.join(cmd)
        print(_c('2', f'    $ {exibir}'))
        if self.args.simular:
            return subprocess.CompletedProcess(cmd, 0, '', '')
        env = {**os.environ, **(env_extra or {})}
        r = subprocess.run(cmd, cwd=RAIZ, env=env, shell=isinstance(cmd, str),
                           text=True, capture_output=capturar)
        if checar and r.returncode != 0:
            if capturar:
                print(r.stdout, r.stderr)
            raise SystemExit(_c('31', f'Falhou: {exibir} (código {r.returncode}). Nada depois deste passo foi executado.'))
        return r

    def ler_env(self):
        env = {}
        for linha in (RAIZ / '.env').read_text(encoding='utf-8').splitlines():
            linha = linha.strip()
            if not linha or linha.startswith('#') or '=' not in linha:
                continue
            chave, valor = linha.split('=', 1)
            env[chave.strip()] = valor.strip().strip('"').strip("'")
        return env

    # -- passos ------------------------------------------------------------

    def conferir_ambiente(self):
        titulo('1/7 Conferindo o ambiente')
        if not (RAIZ / 'artisan').exists() or not (RAIZ / '.env').exists():
            raise SystemExit(_c('31', f'Não parece a pasta do SIGMAN: {RAIZ} (falta artisan ou .env).'))
        ok(f'Projeto: {RAIZ}')

        self.env = self.ler_env()
        faltando = [k for k in ('DB_DATABASE', 'DB_USERNAME') if not self.env.get(k)]
        if faltando:
            raise SystemExit(_c('31', f'.env sem {", ".join(faltando)}.'))
        ok(f"Banco: {self.env.get('DB_DATABASE')} em {self.env.get('DB_HOST', '127.0.0.1')}:{self.env.get('DB_PORT', '5432')}")

        for prog in ('php', 'composer', 'npm', 'git'):
            if shutil.which(prog):
                ok(f'{prog} encontrado')
            else:
                aviso(f'{prog} não encontrado no PATH')

        r = subprocess.run(['git', 'status', '--porcelain'], cwd=RAIZ, text=True, capture_output=True)
        alterados = [l for l in r.stdout.splitlines() if l.strip()]
        if alterados:
            aviso(f'{len(alterados)} arquivo(s) alterado(s) direto no servidor -- o git pull pode conflitar:')
            for l in alterados[:10]:
                print(f'      {l}')
            if not self.perguntar('Continuar mesmo assim?'):
                raise SystemExit('Cancelado.')
        else:
            ok('Nenhuma alteração local no servidor')

        ramo = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=RAIZ, text=True, capture_output=True).stdout.strip()
        ok(f'Branch atual: {ramo}')

    def backup(self):
        titulo('2/7 Backup (banco + storage/app)')
        if self.args.pular_backup:
            aviso('Backup pulado (--pular-backup).')
            return
        if not self.perguntar(f'Gerar backup em {BACKUPS}?'):
            aviso('Backup não gerado.')
            return
        destino = BACKUPS / f'sigman-{self.carimbo}-antes-analise-oleo'
        if not self.args.simular:
            destino.mkdir(parents=True, exist_ok=True)

        if not shutil.which('pg_dump'):
            raise SystemExit(_c('31', 'pg_dump não encontrado -- instale o cliente do PostgreSQL ou rode com --pular-backup.'))
        self.rodar(
            ['pg_dump', '-Fc',
             '-h', self.env.get('DB_HOST', '127.0.0.1'),
             '-p', self.env.get('DB_PORT', '5432'),
             '-U', self.env['DB_USERNAME'],
             '-f', str(destino / 'banco.dump'),
             self.env['DB_DATABASE']],
            env_extra={'PGPASSWORD': self.env.get('DB_PASSWORD', '')},
        )
        self.rodar(['tar', 'czf', str(destino / 'storage-app.tar.gz'), 'storage/app'])
        commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=RAIZ, text=True, capture_output=True).stdout.strip()
        if not self.args.simular:
            (destino / 'commit.txt').write_text(commit + '\n')
            os.chmod(destino, 0o700)
        ok(f'Backup em {destino} (commit {commit[:8]})')
        print(_c('2', f'    Para voltar: git checkout {commit[:8]} && pg_restore --clean --if-exists -d {self.env["DB_DATABASE"]} {destino}/banco.dump'))

    def atualizar_codigo(self):
        titulo('3/7 Atualizando o código (git pull)')
        if self.args.pular_pull:
            aviso('git pull pulado (--pular-pull).')
        elif self.perguntar('Rodar git pull?'):
            self.rodar(['git', 'pull'])
        if not self.args.simular and not JSON_PLANILHA.exists():
            raise SystemExit(_c('31', f'{JSON_PLANILHA.relative_to(RAIZ)} não existe -- a Análise de Óleo ainda não chegou neste branch.'))
        ok('Código da Análise de Óleo presente')

    def dependencias_e_build(self):
        titulo('4/7 Dependências e build do frontend')
        if self.args.pular_build:
            aviso('Build pulado (--pular-build).')
            return
        if self.perguntar('Rodar composer install, npm ci e npm run build?'):
            self.rodar(['composer', 'install', '--no-dev', '--optimize-autoloader', '--no-interaction'])
            self.rodar(['npm', 'ci'])
            self.rodar(['npm', 'run', 'build'])
            ok('Build concluído')

    def migrar(self):
        titulo('5/7 Banco: migrations (tabelas oil_*)')
        r = self.rodar(['php', 'artisan', 'migrate:status'], capturar=True, checar=False)
        pendentes = [l for l in (r.stdout or '').splitlines() if 'Pending' in l]
        if not self.args.simular:
            if pendentes:
                print('  Pendentes:')
                for l in pendentes:
                    print(f'      {l.strip()}')
            else:
                ok('Nenhuma migration pendente')
                return
        if self.perguntar('Aplicar as migrations?'):
            self.rodar(['php', 'artisan', 'migrate', '--force'])
            ok('Migrations aplicadas')

    def importar(self):
        titulo('6/7 Carga da planilha de Análise de Óleo')
        print('  Conferência (nada é gravado):')
        self.rodar(['php', 'artisan', 'oil-analysis:import', '--dry-run'])
        print(_c('2', '    Esperado numa base nova: 27 pontos de coleta, 204 amostras, 28 itens vigentes e 36 de histórico.'))
        print(_c('2', '    Pode rodar de novo sem duplicar: o que já existe é mantido.'))
        if self.perguntar('Gravar a carga no banco?'):
            self.rodar(['php', 'artisan', 'oil-analysis:import'])
            ok('Carga gravada')

    def finalizar(self):
        titulo('7/7 Caches, permissões e limites de upload')
        self.rodar(['php', 'artisan', 'optimize:clear'])

        if hasattr(os, 'geteuid') and os.geteuid() == 0:
            self.rodar(['chown', '-R', f'{USUARIO_WEB}:{USUARIO_WEB}', 'storage', 'bootstrap/cache'])
            ok(f'storage/ e bootstrap/cache/ com dono {USUARIO_WEB}')
        else:
            aviso(f'Não está como root: rode "sudo chown -R {USUARIO_WEB}:{USUARIO_WEB} storage bootstrap/cache".')

        # Laudos em PDF: o PHP do servidor precisa aceitar o tamanho do arquivo.
        r = subprocess.run(['php', '-r', 'echo ini_get("upload_max_filesize")."|".ini_get("post_max_size");'],
                           cwd=RAIZ, text=True, capture_output=True)
        if r.returncode == 0 and '|' in r.stdout:
            up, post = r.stdout.strip().split('|')
            print(f'  PHP (linha de comando): upload_max_filesize={up}, post_max_size={post}')
            aviso('O PHP do site (php-fpm) pode ter outro php.ini. Para laudos de até 20 MB use '
                  'upload_max_filesize=20M e post_max_size=50M (e client_max_body_size 50M no nginx), '
                  'depois reinicie o php-fpm e o nginx.')

    def executar(self):
        if self.args.simular:
            print(_c('1;33', 'MODO SIMULAÇÃO: só mostra os comandos, não executa nada.'))
        passos = [self.conferir_ambiente, self.backup, self.atualizar_codigo,
                  self.dependencias_e_build, self.migrar, self.importar, self.finalizar]
        if self.args.somente_importacao:
            passos = [self.conferir_ambiente, self.migrar, self.importar, self.finalizar]
        for passo in passos:
            passo()
        titulo('Pronto')
        ok('Análise de Óleo no ar: menu lateral > Análise de Óleo (/oil-analysis)')


def main():
    p = argparse.ArgumentParser(description='Sobe a tela de Análise de Óleo na VPS.')
    p.add_argument('--simular', action='store_true', help='Só mostra o que faria, sem executar nada.')
    p.add_argument('--sim', action='store_true', help='Responde "sim" para todas as perguntas.')
    p.add_argument('--pular-backup', action='store_true', help='Não gera backup antes.')
    p.add_argument('--pular-pull', action='store_true', help='Não roda git pull (código já atualizado).')
    p.add_argument('--pular-build', action='store_true', help='Não roda composer/npm.')
    p.add_argument('--somente-importacao', action='store_true',
                   help='Só migrations + carga da planilha (ex.: planilha atualizada).')
    try:
        Subida(p.parse_args()).executar()
    except KeyboardInterrupt:
        print('\nInterrompido.')
        sys.exit(1)


if __name__ == '__main__':
    main()

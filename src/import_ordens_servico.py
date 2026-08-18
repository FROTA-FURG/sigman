"""
Gera as Ordens de Serviço a partir do planejamento (planejamentoAS/CMI/LL.json).

Cada linha do plano é uma atividade recorrente ("faça X neste equipamento a
cada Y período"). O jeito que isso vira OS depende da embarcação:

  - AS e CMI: cada semana marcada com uma cor da legenda vira 1 OS 'open'
    (pendente de aprovação) com a data daquela semana. Semana marcada de
    vermelho no AS ("Indefinido", confirmado com o usuário que significa
    "retirado do plano") vira OS cancelled. Linha sem nenhuma semana marcada
    (ex.: o motor de emergência do AS, que troca óleo a cada 400h e não tem
    data de calendário) vira 1 OS aberta sem data.
  - LL: a marcação de semana da planilha não é confiável (mesma semana
    aparece pra periodicidades bem diferentes na mesma linha) -- confirmado
    com o usuário tratar toda linha como o caso do motor de 400h do AS:
    1 OS aberta, sem data, com a periodicidade do texto da planilha.

Toda OS gerada aqui nasce pendente de aprovação: no SIGMAN quem agenda
('scheduled') ou dispara ('in_progress') é o engenheiro, pelo modal de
disparo, e a aba "Planejamento" só lista OS com status 'open'. Se o import
já gravasse 'scheduled'/'completed', a OS pularia o portão de aprovação e
nunca apareceria pra alguém aprovar.

Pré-requisito: rodar import_equipamentos.py (com --apply) antes deste script
pra a mesma embarcação.

Uso:
    .venv/bin/python import_ordens_servico.py --vessel as              # dry-run
    .venv/bin/python import_ordens_servico.py --vessel cmi --apply      # grava
    .venv/bin/python import_ordens_servico.py --vessel ll --apply --ano 2027
"""
import argparse
import json
import sys
import uuid
from collections import Counter
from datetime import date
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

DEFAULT_PRIORITY = "medium"  # a planilha não informa prioridade por atividade

# Vocabulário de periodicidade usado pelas Ordens de Serviço no SIGMAN.
# Quinzenal/Diario/Semanal foram adicionados durante o import do AS;
# Bianual/Trianual/Quadrienal/Sexênio durante o import do CMI/LL (também
# adicionados no frontend: WorkOrders/Index.jsx, Show.jsx,
# WeeklyProgressTable.jsx, FutureOS.jsx, CreateOSModal.jsx,
# EditWorkOrderModal.jsx, FullPlan.jsx).
PERIODICITY_SLUG = {
    "Quinzenal": "biweekly",
    "Mensal": "monthly",
    "Bimestral": "bimonthly",
    "Trimestral": "quarterly",
    "Semestral": "semiannual",
    "Anual": "annual",
    "Diario": "daily",
    "Semanal": "weekly",
    "Docagem": "docking",
    "Bianual": "biennial",
    "Bi-Anual": "biennial",
    "Trianual": "triennial",
    "Quadrienal": "quadrennial",
    "Sexênio": "sexennial",
}


def parse_semana_as(chave, ano):
    """'02/01 à 08/01 ' -> date(ano, 1, 2). Retorna None se a chave for inválida."""
    chave = chave.strip()
    if chave.lower() == "null" or not chave:
        return None
    inicio = chave.split("à")[0].strip()
    try:
        dia, mes = inicio.split("/")
        return date(ano, int(mes), int(dia))
    except (ValueError, IndexError):
        print(f"  [aviso] não consegui interpretar a semana {chave!r}, pulando.")
        return None


def parse_semana_iso(chave, ano):
    """'9.0' -> segunda-feira da semana ISO 9 do ano. Retorna None se inválida."""
    chave = chave.strip()
    if chave.lower() == "null" or not chave:
        return None
    try:
        semana = int(float(chave))
        return date.fromisocalendar(ano, semana, 1)
    except (ValueError, IndexError):
        print(f"  [aviso] não consegui interpretar a semana {chave!r}, pulando.")
        return None


VESSEL_CONFIGS = {
    "as": dict(
        vessel_name="Atlântico Sul",
        plano_path=BASE_DIR / "planejamentoAS.json",
        tag_overrides={
            ("AS01-SMP-MCA01", "Motor de Combustão Auxiliar V12 - MWM - D233"): "AS01-SMP-MCA05",
        },
        tag_fanout={},
        exclude_tags=set(),
        periodicidade_fix={
            "Trimetral": "Trimestral",
            "Aunal": "Anual",
            "BImestral": "Bimestral",
        },
        # Semanas marcadas com uma cor que não bate com nenhuma das 6 da
        # legenda gravam literalmente o texto "Indefinido" -> confirmado
        # com o usuário que significa "retirado do plano" -> cancelled.
        valor_indefinido="Indefinido",
        legenda_valores_validos={"Quinzenal", "Mensal", "Bimestral", "Trimestral", "Semestral", "Anual"},
        parse_semana=parse_semana_as,
        sempre_aberta=False,
    ),
    "as_v2": dict(
        vessel_name="Atlântico Sul",
        plano_path=BASE_DIR / "planejamentoAS_v2.json",
        tag_overrides={},
        tag_fanout={},
        exclude_tags=set(),
        periodicidade_fix={
            "Semestra": "Semestral",
            "Annual": "Anual",
            "biAnual": "Bianual",
        },
        valor_indefinido=None,  # esse plano não usa mais a marcação de "retirado do plano"
        # FF990000 é uma variante de vermelho-escuro do Anual (FF980000) --
        # 1 dígito de diferença no hex, sempre em linhas cujo texto de
        # periodicidade já é alguma variante de "Anual". Tratada aqui como
        # válida (mesmo efeito de agendamento que Anual).
        legenda_valores_validos={"Quinzenal", "Mensal", "Bimestral", "Trimestral", "Semestral", "Anual", "FF990000"},
        parse_semana=parse_semana_as,
        sempre_aberta=False,
    ),
    "cmi": dict(
        vessel_name="Ciências do Mar 1",
        plano_path=BASE_DIR / "planejamentoCMI.json",
        tag_overrides={
            ("CM01-SMC-GPEBB", "Guincho de pesca BB"): "CM01-SMC-GPEBB/BE",
        },
        # As 2 atividades da tag combinada CM01-SPP-CREBB/BE (trocador de
        # calor, troca de óleo) valem pras duas caixas redutoras -- gera 1
        # OS pra cada uma (CREBB e CREBE), confirmado com o usuário.
        tag_fanout={
            "CM01-SPP-CREBB/BE": ["CM01-SPP-CREBB", "CM01-SPP-CREBE"],
        },
        exclude_tags={"ítem 9"},
        periodicidade_fix={
            "semestral": "Semestral",
            # tem semanas Trimestral marcadas normalmente -- "350 hr" é só
            # o contexto de troca de óleo do manual, a data vem da cor.
            "350 hr/Trimestral": "Trimestral",
        },
        valor_indefinido=None,  # CMI não tem nenhuma cor "retirada do plano"
        legenda_valores_validos={"Trimestral", "Semestral", "Anual", "Bimestral", "Mensal", "Docagem"},
        parse_semana=parse_semana_iso,
        sempre_aberta=False,
    ),
    "ll": dict(
        vessel_name="Lancha Larus",
        plano_path=BASE_DIR / "planejamentoLL.json",
        tag_overrides={
            ("LL01-SHI", "Sistema Hidráulico"): "LL01-SHI-01",
            ("LL01-SHI", "Guincho de Pesca"): "LL01-SHI-02",
            ("LL01-SHI", "Guincho de Molinete"): "LL01-SHI-03",
        },
        tag_fanout={},
        exclude_tags=set(),
        periodicidade_fix={
            "Semestral/500h": "Semestral",
            "Semestral/1000h": "Semestral",
        },
        valor_indefinido=None,
        legenda_valores_validos=set(),  # não usado -- LL ignora a marcação de semana
        parse_semana=None,
        sempre_aberta=True,
    ),
}


def load_db_config():
    env = dotenv_values(PROJECT_ROOT / ".env")
    return {
        "host": env.get("DB_HOST", "127.0.0.1"),
        "port": env.get("DB_PORT", "5432"),
        "dbname": env.get("DB_DATABASE"),
        "user": env.get("DB_USERNAME"),
        "password": env.get("DB_PASSWORD"),
    }


def iter_marcacoes(linha):
    """Percorre as semanas marcadas de uma linha, nos dois formatos de JSON.

    Formato antigo (planejamentoCMI/LL.json): {"9.0": "Trimestral"} -- só a
    periodicidade, sem duração.
    Formato novo (planejamentoAS_v2.json): {"semana": ..., "periodicidade":
    ..., "horas": 0.5} -- inclui as horas escritas na célula.

    Retorna sempre (semana, periodicidade, horas).
    """
    for entrada in linha["datas"]:
        if "semana" in entrada:
            yield entrada["semana"], entrada["periodicidade"], entrada.get("horas")
        else:
            for semana, valor in entrada.items():
                yield semana, valor, None


def resolve_tags(linha, cfg):
    """Retorna a(s) tag(s) de equipamento que essa linha do plano afeta.
    Normalmente 1, mas linhas de fan-out (ex.: CREBB/BE -> CREBB+CREBE)
    retornam mais de uma -- a mesma atividade vira 1 OS em cada equipamento.
    """
    tag = linha["tag"].strip()
    if tag in cfg["tag_fanout"]:
        return cfg["tag_fanout"][tag]
    desc = linha["descricao_do_eqto"]
    desc = desc.strip() if isinstance(desc, str) else desc
    return [cfg["tag_overrides"].get((tag, desc), tag)]


def normalize_periodicidade(valor, cfg):
    if not valor:
        return None
    valor = valor.strip()
    return cfg["periodicidade_fix"].get(valor, valor)


def periodicity_slug(periodicidade_normalizada):
    if not periodicidade_normalizada:
        return None
    return PERIODICITY_SLUG.get(periodicidade_normalizada, periodicidade_normalizada)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vessel", required=True, choices=sorted(VESSEL_CONFIGS), help="Embarcação a importar.")
    parser.add_argument("--apply", action="store_true", help="Grava de verdade. Sem isso, só relatório.")
    parser.add_argument("--ano", type=int, default=2026, help="Ano de referência do plano (padrão: 2026).")
    args = parser.parse_args()
    cfg = VESSEL_CONFIGS[args.vessel]

    hoje = date.today()

    with open(cfg["plano_path"], encoding="utf-8") as f:
        plano = json.load(f)

    conn = psycopg2.connect(**load_db_config())
    cur = conn.cursor()

    cur.execute("SELECT id, tag FROM vessels WHERE name = %s", (cfg["vessel_name"],))
    rows = cur.fetchall()
    if len(rows) != 1:
        sys.exit(f"Esperava encontrar exatamente 1 embarcação chamada {cfg['vessel_name']!r}, encontrei {len(rows)}.")
    vessel_id, vessel_tag = rows[0]

    plan_tags = sorted({
        tag
        for linha in plano["equipamentos"] if linha["tag"].strip() not in cfg["exclude_tags"]
        for tag in resolve_tags(linha, cfg)
    })
    cur.execute(
        "SELECT tag_number, id, series_number, model, manufacturer FROM equipment "
        "WHERE vessel_id = %s AND tag_number = ANY(%s)",
        (vessel_id, plan_tags),
    )
    equip_por_tag = {r[0]: {"id": r[1], "series_number": r[2], "model": r[3], "manufacturer": r[4]} for r in cur.fetchall()}

    faltando = set(plan_tags) - set(equip_por_tag)
    if faltando:
        sys.exit(
            "Os equipamentos abaixo ainda não existem no banco — rode import_equipamentos.py "
            f"(--vessel {args.vessel} --apply) antes deste script:\n  " + "\n  ".join(sorted(faltando))
        )

    # Próximo número de OS disponível pra essa embarcação (LL0001, LL0002, ...)
    cur.execute("SELECT os_number FROM work_orders WHERE os_number LIKE %s ORDER BY os_number DESC LIMIT 1", (vessel_tag + "%",))
    ultima = cur.fetchone()
    proximo_numero = (int(ultima[0].replace(vessel_tag, "")) + 1) if ultima else 1

    # Assinatura das OS já existentes (equipment_id, descrição, data) pra não duplicar se rodar de novo.
    equip_ids = [e["id"] for e in equip_por_tag.values()]
    cur.execute(
        "SELECT equipment_id, description, created_at::date FROM work_orders WHERE equipment_id = ANY(%s::uuid[])",
        (equip_ids,),
    )
    ja_existentes = {(str(r[0]), r[1], r[2]) for r in cur.fetchall()}

    novas_os = []
    pulos_null = 0
    pulos_duplicada = 0
    cores_desconhecidas = Counter()

    for linha in plano["equipamentos"]:
        if linha["tag"].strip() in cfg["exclude_tags"]:
            continue

        tags = resolve_tags(linha, cfg)
        periodicidade_norm = normalize_periodicidade(linha["periodicidade"], cfg)
        slug = periodicity_slug(periodicidade_norm)
        descricao = linha["atividade"] or "(atividade sem descrição no plano)"

        if cfg["sempre_aberta"]:
            linhas_a_criar = [{"created_at": hoje, "status": "open", "completed_at": None, "estimated_hours": None}]
        else:
            datas_validas = []
            for semana_key, valor, horas in iter_marcacoes(linha):
                data = cfg["parse_semana"](str(semana_key), args.ano)
                if data is None:
                    pulos_null += 1
                    continue
                if valor not in cfg["legenda_valores_validos"] and valor != cfg["valor_indefinido"]:
                    cores_desconhecidas[valor] += 1
                    continue
                datas_validas.append((data, valor, horas))

            if not datas_validas:
                linhas_a_criar = [{"created_at": hoje, "status": "open", "completed_at": None, "estimated_hours": None}]
            else:
                linhas_a_criar = []
                for data, valor, horas in datas_validas:
                    # OS importada do plano nasce SEMPRE 'open' (pendente de
                    # aprovação), com a data planejada. Não cabe ao import
                    # decidir 'scheduled' nem 'completed': no SIGMAN quem
                    # agenda/dispara é o engenheiro pelo modal de disparo, e
                    # 'completed' significa serviço realmente executado.
                    # Se a data já passou, a OS fica pendente e simplesmente
                    # aparece como atrasada -- que é a informação verdadeira.
                    # A exceção é o 'Indefinido' (semana em vermelho = tirada
                    # do plano), que não é etapa de fluxo e sim um fato da
                    # própria planilha.
                    if valor == cfg["valor_indefinido"]:
                        status, completed_at = "cancelled", None
                    else:
                        status, completed_at = "open", None
                    linhas_a_criar.append({"created_at": data, "status": status, "completed_at": completed_at, "estimated_hours": horas})

        for tag in tags:
            equip = equip_por_tag[tag]
            for item in linhas_a_criar:
                assinatura = (str(equip["id"]), descricao, item["created_at"])
                if assinatura in ja_existentes:
                    pulos_duplicada += 1
                    continue
                ja_existentes.add(assinatura)

                novas_os.append({
                    "id": str(uuid.uuid4()),
                    "equipment_id": equip["id"],
                    "os_number": f"{vessel_tag}{proximo_numero:04d}",
                    "tag_number": tag,
                    "series_number_id": equip["series_number"],
                    "description": descricao,
                    "model": equip["model"],
                    "manufacturer": equip["manufacturer"],
                    "maintenance_type": "preventive",
                    "priority": DEFAULT_PRIORITY,
                    "status": item["status"],
                    "periodicity": slug,
                    "estimated_hours": item["estimated_hours"],
                    "created_at": item["created_at"],
                    "completed_at": item["completed_at"],
                })
                proximo_numero += 1

    # --- Relatório -----------------------------------------------------------
    por_status = Counter(os_["status"] for os_ in novas_os)
    print(f"Plano: {len(plano['equipamentos'])} linhas (equipamento+atividade), ano de referência {args.ano}, hoje = {hoje.isoformat()}")
    print(f"OS novas a criar: {len(novas_os)}")
    for status, qtd in sorted(por_status.items()):
        print(f"  - {status}: {qtd}")
    print(f"Entradas puladas (coluna 'null' / semana ilegível): {pulos_null}")
    print(f"Entradas já existentes no banco (não duplicadas): {pulos_duplicada}")
    if cores_desconhecidas:
        print(f"[ATENÇÃO] Valores não reconhecidos encontrados em 'datas' (nem legenda, nem indefinido): {dict(cores_desconhecidas)}")
    print()

    if not args.apply:
        print("[DRY-RUN] Nada foi gravado. Rode de novo com --apply para gravar de verdade.")
        cur.close()
        conn.close()
        return

    if novas_os:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO work_orders (
                id, equipment_id, os_number, tag_number, series_number_id, description,
                model, manufacturer, maintenance_type, priority, status, periodicity,
                in_52_week_plan, estimated_hours, intern_status, created_at, updated_at, completed_at
            ) VALUES %s
            """,
            [
                (
                    os_["id"], os_["equipment_id"], os_["os_number"], os_["tag_number"], os_["series_number_id"],
                    os_["description"], os_["model"], os_["manufacturer"], os_["maintenance_type"], os_["priority"],
                    os_["status"], os_["periodicity"],
                    # Tudo que sai deste script vem de uma planilha de plano
                    # de 52 semanas -> nasce já marcado como do plano.
                    True,
                    os_["estimated_hours"],
                    "pending", os_["created_at"], date.today(), os_["completed_at"],
                )
                for os_ in novas_os
            ],
        )
        conn.commit()

    print(f"{len(novas_os)} Ordens de Serviço criadas com sucesso.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

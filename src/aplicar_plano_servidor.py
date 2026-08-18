"""
Aplica o manifesto do plano (plano_as_para_servidor.json) num banco SIGMAN.

O mesmo script roda na máquina local e no servidor da nuvem -- ele lê o .env
do projeto, então o destino é o banco daquele ambiente. É idempotente: pode
rodar quantas vezes precisar.

Como casa cada OS do manifesto com o banco:
    (equipamento, descrição da atividade, data)
Esse trio é a identidade da OS no plano. Se achar, ATUALIZA (horas, status,
conclusão, flag do plano) preservando o os_number que já existe. Se não
achar, CRIA com o próximo os_number livre da embarcação.

Nunca apaga nada: OS que existem no banco e não estão no manifesto ficam
como estão (é onde vivem as corretivas e preditivas do dia a dia).

Uso:
    .venv/bin/python aplicar_plano_servidor.py            # dry-run
    .venv/bin/python aplicar_plano_servidor.py --apply     # grava
"""
import argparse
import json
import sys
import uuid
from collections import Counter
from datetime import date, datetime
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
MANIFESTO_PATH = BASE_DIR / "plano_as_para_servidor.json"


def load_db_config():
    env = dotenv_values(PROJECT_ROOT / ".env")
    return {
        "host": env.get("DB_HOST", "127.0.0.1"),
        "port": env.get("DB_PORT", "5432"),
        "dbname": env.get("DB_DATABASE"),
        "user": env.get("DB_USERNAME"),
        "password": env.get("DB_PASSWORD"),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Grava de verdade. Sem isso, só relatório.")
    parser.add_argument("--manifesto", default=str(MANIFESTO_PATH), help="Caminho do JSON do plano.")
    args = parser.parse_args()

    with open(args.manifesto, encoding="utf-8") as f:
        manifesto = json.load(f)

    vessel_name = manifesto["embarcacao"]["nome"]
    print(f"Manifesto: {Path(args.manifesto).name} (gerado em {manifesto['gerado_em']})")
    print(f"Embarcação: {vessel_name}")
    print(f"Regra de conclusão: até {manifesto['regras']['data_corte_concluidas']}\n")

    conn = psycopg2.connect(**load_db_config())
    cur = conn.cursor()

    cur.execute("SELECT id, tag FROM vessels WHERE name = %s", (vessel_name,))
    rows = cur.fetchall()
    if len(rows) != 1:
        sys.exit(f"Esperava 1 embarcação chamada {vessel_name!r}, encontrei {len(rows)}.")
    vessel_id, vessel_tag = rows[0]

    # --- Equipamentos ------------------------------------------------------
    tags_manifesto = [e["tag"] for e in manifesto["equipamentos"]]
    cur.execute(
        "SELECT tag_number, id, series_number, model, manufacturer FROM equipment "
        "WHERE vessel_id = %s AND tag_number = ANY(%s)",
        (vessel_id, tags_manifesto),
    )
    equip_por_tag = {
        r[0]: {"id": r[1], "series_number": r[2], "model": r[3], "manufacturer": r[4]}
        for r in cur.fetchall()
    }

    equip_a_criar = [e for e in manifesto["equipamentos"] if e["tag"] not in equip_por_tag]
    print(f"Equipamentos: {len(equip_por_tag)} já existem, {len(equip_a_criar)} a criar")
    for e in equip_a_criar:
        print(f"  + {e['tag']:<20} {e['nome']}")

    if args.apply and equip_a_criar:
        for e in equip_a_criar:
            novo_id = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO equipment (id, vessel_id, tag_number, name, criticality, status, created_at, updated_at) "
                "VALUES (%s, %s, %s, %s, 'A', 'active', now(), now())",
                (novo_id, vessel_id, e["tag"], e["nome"]),
            )
            equip_por_tag[e["tag"]] = {"id": novo_id, "series_number": None, "model": None, "manufacturer": None}

    faltando = {e["tag"] for e in manifesto["equipamentos"]} - set(equip_por_tag)
    if faltando and not args.apply:
        print("  (no dry-run os equipamentos novos ainda não existem; as OS deles apareceriam como 'a criar')")

    # --- OS já existentes, indexadas pelo trio de identidade ---------------
    cur.execute(
        """
        SELECT wo.id, wo.os_number, e.tag_number, wo.description, wo.created_at::date,
               wo.estimated_hours, wo.status, wo.completed_at, wo.in_52_week_plan
        FROM work_orders wo
        JOIN equipment e ON e.id = wo.equipment_id
        WHERE e.vessel_id = %s
        """,
        (vessel_id,),
    )
    existentes = {}
    for r in cur.fetchall():
        existentes[(r[2], r[3], r[4])] = {
            "id": r[0], "os_number": r[1], "estimated_hours": r[5],
            "status": r[6], "completed_at": r[7], "in_52_week_plan": r[8],
        }

    cur.execute(
        "SELECT os_number FROM work_orders WHERE os_number LIKE %s ORDER BY os_number DESC LIMIT 1",
        (vessel_tag + "%",),
    )
    ultima = cur.fetchone()
    proximo_numero = (int(ultima[0].replace(vessel_tag, "")) + 1) if ultima else 1

    a_criar, a_atualizar, sem_mudanca = [], [], 0
    mudancas = Counter()

    for os_ in manifesto["ordens_servico"]:
        tag = os_["tag_equipamento"]
        data = datetime.fromisoformat(os_["data"]).date()
        chave = (tag, os_["descricao"], data)
        atual = existentes.get(chave)

        horas = os_["horas_estimadas"]
        concluida_em = datetime.fromisoformat(os_["concluida_em"]).date() if os_["concluida_em"] else None

        if atual is None:
            a_criar.append((os_, tag, data, horas, concluida_em))
            continue

        diff = {}
        if (float(atual["estimated_hours"]) if atual["estimated_hours"] is not None else None) != horas:
            diff["horas"] = (atual["estimated_hours"], horas)
        if atual["status"] != os_["status"]:
            diff["status"] = (atual["status"], os_["status"])
        atual_conclusao = atual["completed_at"].date() if atual["completed_at"] else None
        if atual_conclusao != concluida_em:
            diff["conclusao"] = (atual_conclusao, concluida_em)
        if bool(atual["in_52_week_plan"]) is not True:
            diff["plano"] = (atual["in_52_week_plan"], True)

        if diff:
            a_atualizar.append((atual, os_, horas, concluida_em, diff))
            for campo in diff:
                mudancas[campo] += 1
        else:
            sem_mudanca += 1

    print(f"\nOrdens de Serviço do manifesto: {len(manifesto['ordens_servico'])}")
    print(f"  a criar          : {len(a_criar)}")
    print(f"  a atualizar      : {len(a_atualizar)}")
    for campo, qtd in sorted(mudancas.items()):
        print(f"      {campo}: {qtd}")
    print(f"  já conferem      : {sem_mudanca}")

    if not args.apply:
        print("\n[DRY-RUN] Nada foi gravado. Rode de novo com --apply para gravar.")
        cur.close()
        conn.close()
        return

    for atual, os_, horas, concluida_em, _diff in a_atualizar:
        cur.execute(
            """
            UPDATE work_orders
            SET estimated_hours = %s, status = %s, completed_at = %s,
                in_52_week_plan = true, updated_at = now()
            WHERE id = %s
            """,
            (horas, os_["status"], concluida_em, atual["id"]),
        )

    for os_, tag, data, horas, concluida_em in a_criar:
        equip = equip_por_tag[tag]
        cur.execute(
            """
            INSERT INTO work_orders (
                id, equipment_id, os_number, tag_number, series_number_id, description,
                model, manufacturer, maintenance_type, priority, status, periodicity,
                in_52_week_plan, estimated_hours, intern_status, created_at, updated_at, completed_at
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'medium',%s,%s,true,%s,'pending',%s,now(),%s)
            """,
            (
                str(uuid.uuid4()), equip["id"], f"{vessel_tag}{proximo_numero:04d}", tag,
                equip["series_number"], os_["descricao"], equip["model"], equip["manufacturer"],
                os_["tipo_manutencao"], os_["status"], os_["periodicidade"], horas,
                data, concluida_em,
            ),
        )
        proximo_numero += 1

    conn.commit()
    print(f"\n{len(a_atualizar)} OS atualizadas, {len(a_criar)} criadas.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

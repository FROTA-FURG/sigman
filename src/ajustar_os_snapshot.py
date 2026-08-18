"""
Ajusta o estado das Ordens de Serviço pra um "retrato" operacional mais
realista: cria OS novas (preventiva/corretiva/preditiva) usando os
equipamentos já cadastrados, resolve o excesso de preventivas atrasadas da
AS, e nivela a carga da semana atual pra caber na capacidade da equipe.

Passos (nessa ordem, cada um depende do anterior):

  1. Cria as OS novas pedidas por embarcação/tipo, usando equipamentos já
     existentes no banco (sem vínculo com o plano de 52 semanas importado).
  2. Preventivas da AS que estão "atrasadas" (status open/scheduled com data
     no passado) viram in_progress, exceto as 3 mais antigas -- essas ficam
     como estão, de propósito, pra continuarem aparecendo como atrasadas.
  3. Nivela a semana atual (todas as embarcações somadas) pra no máximo ~15
     OS / 33h estimadas: mantém as in_progress (já em execução) e as de
     maior prioridade dentro do orçamento, empurra o excedente pra semana
     seguinte (+7 dias), normalizando status open -> scheduled quando a
     nova data cai no futuro.

estimated_hours é preenchido (campo praticamente vazio no banco hoje) em
toda OS tocada por este script, com uma faixa plausível por tipo de
manutenção, pra o cálculo de horas ser real e reaproveitável depois.

Uso:
    .venv/bin/python ajustar_os_snapshot.py            # dry-run
    .venv/bin/python ajustar_os_snapshot.py --apply      # grava de verdade
"""
import argparse
import random
import sys
import uuid
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Seed fixa -- garante que o dry-run mostre exatamente o que o --apply grava.
random.seed(1337)

NOVAS_OS = {
    "AS":  {"preventive": 0,  "corrective": 6, "predictive": 3},
    "CM1": {"preventive": 20, "corrective": 4, "predictive": 7},
    "LL":  {"preventive": 0,  "corrective": 2, "predictive": 1},
}

SEMANA_ATUAL_MAX_OS = 15
SEMANA_ATUAL_MAX_HORAS = 33.0

FAIXA_HORAS = {
    "preventive": (1.0, 3.0),
    "corrective": (2.0, 6.0),
    "predictive": (2.0, 5.0),
}

TAREFAS = {
    "preventive": [
        "Inspeção geral e verificação de parâmetros de funcionamento",
        "Lubrificação de componentes conforme manual do fabricante",
        "Troca de filtros e verificação de fixações",
        "Limpeza geral e verificação de vazamentos",
        "Verificação de folgas e reaperto de conexões",
        "Checklist de rotina e teste de acionamento",
    ],
    "corrective": [
        "Vazamento de óleo identificado durante ronda de máquinas",
        "Ruído anormal reportado pela tripulação durante operação",
        "Falha no acionamento constatada em teste de partida",
        "Substituição de componente danificado",
        "Reparo emergencial solicitado pela praça de máquinas",
        "Correção de superaquecimento identificado em inspeção",
        "Vibração excessiva reportada durante operação",
    ],
    "predictive": [
        "Análise de vibração programada conforme plano de monitoramento",
        "Coleta de amostra de óleo para análise laboratorial",
        "Termografia de componentes elétricos e conexões",
        "Monitoramento de desgaste por ultrassom",
        "Inspeção preditiva de condição operacional",
        "Medição de parâmetros para acompanhamento de tendência",
    ],
}

PRIORIDADE_PESOS = {
    "preventive": (["low", "medium", "high"], [30, 60, 10]),
    "corrective": (["medium", "high", "critical"], [30, 50, 20]),
    "predictive": (["low", "medium", "high"], [20, 65, 15]),
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


def sortear_horas(tipo):
    baixo, alto = FAIXA_HORAS[tipo]
    return round(random.uniform(baixo, alto), 1)


def gerar_status_data(tipo, hoje):
    if tipo == "preventive":
        # Filler futuro, fora da semana atual de propósito.
        data = hoje + timedelta(days=random.randint(10, 56))
        return "scheduled", data
    if tipo == "corrective":
        status = random.choices(["open", "in_progress"], weights=[70, 30])[0]
        data = hoje - timedelta(days=random.randint(0, 3))
        return status, data
    # predictive
    status = random.choices(["open", "scheduled", "in_progress"], weights=[40, 40, 20])[0]
    data = hoje + timedelta(days=random.randint(-2, 5))
    return status, data


def gerar_novas_os(cur, hoje):
    """Cria as linhas das OS novas (ainda não gravadas) por embarcação/tipo."""
    linhas = []
    for tag, spec in NOVAS_OS.items():
        cur.execute("SELECT id, tag FROM vessels WHERE tag = %s", (tag,))
        vessel_id, vessel_tag = cur.fetchone()

        cur.execute(
            "SELECT id, tag_number, name, series_number, model, manufacturer "
            "FROM equipment WHERE vessel_id = %s ORDER BY tag_number",
            (vessel_id,),
        )
        equipamentos = cur.fetchall()
        if not equipamentos:
            sys.exit(f"Embarcação {tag} não tem equipamentos cadastrados.")

        cur.execute("SELECT os_number FROM work_orders WHERE os_number LIKE %s ORDER BY os_number DESC LIMIT 1", (vessel_tag + "%",))
        ultima = cur.fetchone()
        proximo_numero = (int(ultima[0].replace(vessel_tag, "")) + 1) if ultima else 1

        for tipo, qtd in spec.items():
            opcoes, pesos = PRIORIDADE_PESOS[tipo]
            for _ in range(qtd):
                equip_id, equip_tag, equip_nome, serie, modelo, fabricante = random.choice(equipamentos)
                status, data = gerar_status_data(tipo, hoje)
                tarefa = random.choice(TAREFAS[tipo])
                linhas.append({
                    "id": str(uuid.uuid4()),
                    "equipment_id": equip_id,
                    "vessel_tag": vessel_tag,
                    "os_number": f"{vessel_tag}{proximo_numero:04d}",
                    "tag_number": equip_tag,
                    "series_number_id": serie,
                    "description": f"{tarefa} — {equip_nome}",
                    "model": modelo,
                    "manufacturer": fabricante,
                    "maintenance_type": tipo,
                    "priority": random.choices(opcoes, weights=pesos)[0],
                    "status": status,
                    "periodicity": None,
                    "estimated_hours": sortear_horas(tipo),
                    "created_at": data,
                    "completed_at": None,
                })
                proximo_numero += 1
    return linhas


def buscar_atrasadas_as(cur, hoje):
    """Preventivas da AS com status open/scheduled e data no passado."""
    cur.execute("""
        SELECT wo.id, wo.created_at::date, wo.estimated_hours
        FROM work_orders wo
        JOIN equipment e ON e.id = wo.equipment_id
        JOIN vessels v ON v.id = e.vessel_id
        WHERE v.tag = 'AS' AND wo.maintenance_type = 'preventive'
          AND wo.status IN ('open', 'scheduled') AND wo.created_at::date < %s
        ORDER BY wo.created_at ASC, wo.id ASC
    """, (hoje,))
    return cur.fetchall()


def buscar_semana_atual(cur):
    """Todas as OS não-canceladas com created_at na semana atual (seg-dom), já ordenadas
    pra seleção: in_progress primeiro, depois por prioridade, depois por data."""
    cur.execute("""
        SELECT wo.id, wo.status, wo.priority, wo.maintenance_type, wo.estimated_hours, wo.created_at::date
        FROM work_orders wo
        WHERE wo.created_at::date >= date_trunc('week', now())::date
          AND wo.created_at::date < date_trunc('week', now())::date + 7
          AND wo.status != 'cancelled'
    """)
    return cur.fetchall()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Grava de verdade. Sem isso, só relatório.")
    args = parser.parse_args()

    conn = psycopg2.connect(**load_db_config())
    cur = conn.cursor()
    cur.execute("SELECT now()::date")
    hoje = cur.fetchone()[0]

    # --- Passo 1: novas OS -----------------------------------------------
    novas_os = gerar_novas_os(cur, hoje)
    por_vessel_tipo = Counter((l["vessel_tag"], l["maintenance_type"]) for l in novas_os)

    print(f"Hoje (banco): {hoje.isoformat()}")
    print(f"\n=== Passo 1: {len(novas_os)} OS novas ===")
    for (tag, tipo), qtd in sorted(por_vessel_tipo.items()):
        print(f"  {tag:<4} {tipo:<12} {qtd}")

    # --- Passo 2: atrasadas da AS -> in_progress, deixando 3 -------------
    atrasadas = buscar_atrasadas_as(cur, hoje)
    n_manter_atrasada = 3
    mover_para_progresso = atrasadas[n_manter_atrasada:]
    ficam_atrasadas = atrasadas[:n_manter_atrasada]

    print(f"\n=== Passo 2: preventivas atrasadas da AS ===")
    print(f"  Total atrasadas hoje (status open/scheduled, data passada): {len(atrasadas)}")
    print(f"  Vão para in_progress: {len(mover_para_progresso)}")
    print(f"  Continuam atrasadas (as 3 mais antigas, propositalmente): {len(ficam_atrasadas)}")
    for _id, dt, _h in ficam_atrasadas:
        print(f"    - {_id}  vencida em {dt}")

    # --- Passo 3: nivelar semana atual ------------------------------------
    # Simula o pós-estado: pega o que já existe na semana atual + as novas
    # OS que caíram nela, decide quem fica x quem é empurrado.
    existentes_semana = buscar_semana_atual(cur)

    # Semana atual real (segunda a domingo)
    inicio_semana = hoje - timedelta(days=hoje.weekday())
    fim_semana = inicio_semana + timedelta(days=6)

    # buscar_semana_atual() leu o banco ANTES do passo 2 gravar as atrasadas
    # como in_progress (as escritas de verdade só acontecem mais abaixo,
    # depois de todo o cálculo/relatório) -- sem essa correção em memória,
    # essas linhas entrariam aqui com status desatualizado, disputariam
    # orçamento como se fossem candidatas normais e, se perdessem,
    # acabariam sendo empurradas pra semana seguinte, desfazendo o passo 2.
    ids_movidos = {str(r[0]) for r in mover_para_progresso}

    candidatos = []
    for _id, status, priority, tipo, horas, dt in existentes_semana:
        if str(_id) in ids_movidos:
            status = "in_progress"
        horas = float(horas) if horas is not None else sortear_horas(tipo)
        candidatos.append({"id": _id, "status": status, "priority": priority, "created_at": dt, "estimated_hours": horas, "nova": False, "tipo": tipo})
    for l in novas_os:
        if inicio_semana <= l["created_at"] <= fim_semana:
            candidatos.append({"id": l["id"], "status": l["status"], "priority": l["priority"], "created_at": l["created_at"], "estimated_hours": l["estimated_hours"], "nova": True, "tipo": l["maintenance_type"]})

    PRIORIDADE_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    em_progresso = [c for c in candidatos if c["status"] == "in_progress"]
    resto = sorted(
        (c for c in candidatos if c["status"] != "in_progress"),
        key=lambda c: (PRIORIDADE_RANK.get(c["priority"], 9), c["created_at"]),
    )

    mantidos = list(em_progresso)
    horas_acumuladas = sum(c["estimated_hours"] for c in em_progresso)
    empurrados = []
    for c in resto:
        if len(mantidos) < SEMANA_ATUAL_MAX_OS and horas_acumuladas + c["estimated_hours"] <= SEMANA_ATUAL_MAX_HORAS:
            mantidos.append(c)
            horas_acumuladas += c["estimated_hours"]
        else:
            empurrados.append(c)

    print(f"\n=== Passo 3: semana atual ({inicio_semana} a {fim_semana}) ===")
    print(f"  Candidatos (existentes + novas que caíram na semana): {len(candidatos)}")
    print(f"  Mantidos na semana atual: {len(mantidos)} ({horas_acumuladas:.1f}h) -- {len(em_progresso)} já em andamento")
    print(f"  Empurrados pra semana seguinte (+7 dias): {len(empurrados)}")

    if not args.apply:
        print("\n[DRY-RUN] Nada foi gravado. Rode de novo com --apply para gravar de verdade.")
        cur.close()
        conn.close()
        return

    # --- Aplicando -----------------------------------------------------------
    if novas_os:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO work_orders (
                id, equipment_id, os_number, tag_number, series_number_id, description,
                model, manufacturer, maintenance_type, priority, status, periodicity,
                estimated_hours, intern_status, created_at, updated_at, completed_at
            ) VALUES %s
            """,
            [
                (
                    l["id"], l["equipment_id"], l["os_number"], l["tag_number"], l["series_number_id"],
                    l["description"], l["model"], l["manufacturer"], l["maintenance_type"], l["priority"],
                    l["status"], l["periodicity"], l["estimated_hours"], "pending",
                    l["created_at"], date.today(), l["completed_at"],
                )
                for l in novas_os
            ],
        )

    if mover_para_progresso:
        ids = [str(r[0]) for r in mover_para_progresso]
        cur.execute("UPDATE work_orders SET status = 'in_progress', updated_at = now() WHERE id = ANY(%s::uuid[])", (ids,))

    # Backfill de estimated_hours nas atrasadas (as 3 que ficam + as que moveram, se ainda nulo)
    for _id, _dt, horas in atrasadas:
        if horas is None:
            cur.execute("UPDATE work_orders SET estimated_hours = %s WHERE id = %s", (sortear_horas("preventive"), _id))

    # Empurra o excedente da semana atual pra semana seguinte.
    for c in empurrados:
        nova_data = c["created_at"] + timedelta(days=7)
        novo_status = "scheduled" if c["status"] == "open" else c["status"]
        cur.execute(
            "UPDATE work_orders SET created_at = %s, status = %s, estimated_hours = %s, updated_at = now() WHERE id = %s",
            (nova_data, novo_status, c["estimated_hours"], c["id"]),
        )

    # Preenche estimated_hours em quem ficou na semana atual e ainda não tinha.
    for c in mantidos:
        if not c["nova"]:
            cur.execute("UPDATE work_orders SET estimated_hours = %s WHERE id = %s AND estimated_hours IS NULL", (c["estimated_hours"], c["id"]))

    conn.commit()
    print(f"\n{len(novas_os)} OS novas criadas, {len(mover_para_progresso)} atrasadas movidas pra in_progress, "
          f"{len(empurrados)} empurradas pra semana seguinte.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

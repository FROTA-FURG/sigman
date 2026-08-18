"""
Importa os equipamentos do planejamento (planejamentoAS/CMI/LL.json) pra cada
embarcação.

Antes de cadastrar os equipamentos do plano, remove o(s) equipamento(s) de
demonstração já cadastrados na embarcação — decisão confirmada com o usuário
pra AS/CMI/LL, sabendo que isso apaga em cascata as Ordens de Serviço
vinculadas a eles.

Uso:
    .venv/bin/python import_equipamentos.py --vessel as             # dry-run
    .venv/bin/python import_equipamentos.py --vessel cmi --apply     # grava de verdade
    .venv/bin/python import_equipamentos.py --vessel ll
"""
import argparse
import json
import sys
import uuid
from pathlib import Path

import psycopg2
from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

VESSEL_CONFIGS = {
    "as": dict(
        vessel_name="Atlântico Sul",
        plano_path=BASE_DIR / "planejamentoAS.json",
        # A tag AS01-SMP-MCA01 aparece no plano para dois motores físicos
        # diferentes (D232 e D233) — erro de digitação na planilha de
        # origem. Damos ao D233 a próxima tag disponível na sequência já
        # usada pelos outros motores auxiliares.
        tag_overrides={
            ("AS01-SMP-MCA01", "Motor de Combustão Auxiliar V12 - MWM - D233"): "AS01-SMP-MCA05",
        },
        # AS01-SMS-GMU01 não tem descrição na planilha (célula mesclada que
        # o openpyxl só lê na primeira linha do grupo). Nome inferido a
        # partir das atividades (óleo/filtros hidráulicos, regulagem de
        # pressão "do giro").
        description_overrides={
            "AS01-SMS-GMU01": "Unidade Hidráulica de Manobra",
        },
        exclude_tags=set(),
        demo_equipment_tags=["AS-CMA-LUB-BA", "AS-PPA-EST-F", "AS-CMA-LUB-FO", "AS-CMA-LUB-BO"],
    ),
    "as_v2": dict(
        vessel_name="Atlântico Sul",
        # Plano novo (Plano 52 semanas AS.xlsx), extraído por
        # extract_as_v2_fixed.py -- já vem sem colisão de tag/descrição e
        # sem as linhas de lubrificação (excluídas na extração, por
        # decisão do usuário). Só cria os equipamentos novos que ainda não
        # existem; os 7 que já estavam cadastrados (COM01/COM02/MCA01-04/
        # MCP01) são reaproveitados como estão.
        plano_path=BASE_DIR / "planejamentoAS_v2.json",
        tag_overrides={},
        description_overrides={},
        exclude_tags=set(),
        demo_equipment_tags=[],
    ),
    "cmi": dict(
        vessel_name="Ciências do Mar 1",
        plano_path=BASE_DIR / "planejamentoCMI.json",
        tag_overrides={
            # "Guincho de pesca BB" (sem número de modelo, 2 atividades) é o
            # mesmo guincho que "Guincho de pesca N1GRD-H2.000-80" (tag
            # combinada BB/BE, 5 atividades) -- confirmado com o usuário
            # juntar num equipamento só (a tag combinada aparece primeiro no
            # plano, então o nome com modelo vira o canônico).
            ("CM01-SMC-GPEBB", "Guincho de pesca BB"): "CM01-SMC-GPEBB/BE",
        },
        # As 3 tags abaixo aparecem no plano com dois nomes -- o nome
        # genérico ("Unidade Eletro Hidráulica NN") só é usado na linha de
        # "coletar amostra de óleo"; as demais linhas (inspeção, troca de
        # vedação etc.) usam o nome descritivo. Mesmo equipamento físico,
        # inconsistência de preenchimento na planilha -- confirmado com o
        # usuário usar o nome descritivo como canônico.
        description_overrides={
            "CM01-SHI-UEH01": "Central hidráulica do Guincho de Pesca e Oceanográfico - NAVALSUL",
            "CM01-SHI-UEH02": "Central hidráulica Munck e Guincho da âncora - NAVALSUL",
            "CM01-SHI-UEH03": "Central hidráulica do Leme - Dtecto",
        },
        exclude_tags={
            # "ítem 9" não é equipamento -- é uma nota de rodapé da planilha
            # (troca de líquido de arrefecimento do MCP) que caiu na
            # extração por engano.
            "ítem 9",
            # CM01-SPP-CREBB/BE não vira equipamento próprio -- suas 2
            # atividades (trocador de calor, troca de óleo) são duplicadas
            # nas duas caixas redutoras já existentes (CREBB e CREBE) pelo
            # import_ordens_servico.py, confirmado com o usuário.
            "CM01-SPP-CREBB/BE",
        },
        demo_equipment_tags=["CM1-CMA-LUB-BO"],
    ),
    "ll": dict(
        vessel_name="Lancha Larus",
        plano_path=BASE_DIR / "planejamentoLL.json",
        # LL01-SHI agrupa 3 equipamentos físicos distintos (Sistema
        # Hidráulico, Guincho de Pesca, Guincho de Molinete) sob uma tag só
        # -- confirmado com o usuário separar em 3 tags.
        tag_overrides={
            ("LL01-SHI", "Sistema Hidráulico"): "LL01-SHI-01",
            ("LL01-SHI", "Guincho de Pesca"): "LL01-SHI-02",
            ("LL01-SHI", "Guincho de Molinete"): "LL01-SHI-03",
        },
        description_overrides={},
        exclude_tags=set(),
        demo_equipment_tags=["LL-CMA-ACO-FA"],
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


def build_equipment_list(plano, cfg):
    """Agrupa as linhas do plano em equipamentos únicos (tag -> nome)."""
    equipamentos = {}
    ordem = []

    for linha in plano["equipamentos"]:
        tag = linha["tag"].strip()
        if tag in cfg["exclude_tags"]:
            continue

        desc = linha["descricao_do_eqto"]
        desc = desc.strip() if isinstance(desc, str) else desc

        override_tag = cfg["tag_overrides"].get((tag, desc))
        if override_tag:
            tag = override_tag

        if tag not in equipamentos:
            nome = desc or cfg["description_overrides"].get(tag)
            if not nome:
                raise ValueError(
                    f"Equipamento com tag {tag!r} não tem descrição e não há "
                    f"nome definido em description_overrides."
                )
            equipamentos[tag] = nome
            ordem.append(tag)

    return [(tag, equipamentos[tag]) for tag in ordem]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vessel", required=True, choices=sorted(VESSEL_CONFIGS), help="Embarcação a importar.")
    parser.add_argument(
        "--apply", action="store_true",
        help="Grava as mudanças de verdade. Sem essa flag, só mostra o que seria feito."
    )
    args = parser.parse_args()
    cfg = VESSEL_CONFIGS[args.vessel]

    with open(cfg["plano_path"], encoding="utf-8") as f:
        plano = json.load(f)

    equipment_list = build_equipment_list(plano, cfg)

    print(f"{len(equipment_list)} equipamentos únicos encontrados no plano:")
    for tag, nome in equipment_list:
        print(f"  - {tag:<20} {nome}")
    print()

    conn = psycopg2.connect(**load_db_config())
    cur = conn.cursor()

    cur.execute("SELECT id, tag FROM vessels WHERE name = %s", (cfg["vessel_name"],))
    rows = cur.fetchall()
    if len(rows) != 1:
        sys.exit(f"Esperava encontrar exatamente 1 embarcação chamada {cfg['vessel_name']!r}, encontrei {len(rows)}.")
    vessel_id, vessel_tag = rows[0]
    print(f"Embarcação: {cfg['vessel_name']} (id={vessel_id}, tag={vessel_tag})\n")

    # --- Passo 1: equipamentos de demonstração a remover -------------------
    demo_tags = cfg["demo_equipment_tags"]
    cur.execute(
        "SELECT id, tag_number FROM equipment WHERE vessel_id = %s AND tag_number = ANY(%s)",
        (vessel_id, demo_tags),
    )
    demo_rows = cur.fetchall()
    demo_ids = [r[0] for r in demo_rows]

    if demo_ids:
        cur.execute("SELECT COUNT(*) FROM work_orders WHERE equipment_id = ANY(%s::uuid[])", (demo_ids,))
        os_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM service_requests WHERE equipment_id = ANY(%s::uuid[])", (demo_ids,))
        sr_count = cur.fetchone()[0]
        print(f"Equipamentos de demonstração encontrados: {len(demo_ids)}")
        print(f"  -> {os_count} Ordens de Serviço serão apagadas em cascata")
        print(f"  -> {sr_count} Solicitações de Serviço ficarão sem equipamento vinculado (nullOnDelete)")
    else:
        print("Nenhum equipamento de demonstração encontrado (já foi removido antes?).")
    print()

    # --- Passo 2: quais tags do plano já existem no banco ------------------
    plan_tags = [tag for tag, _ in equipment_list]
    cur.execute(
        "SELECT tag_number FROM equipment WHERE vessel_id = %s AND tag_number = ANY(%s)",
        (vessel_id, plan_tags),
    )
    existing_tags = {r[0] for r in cur.fetchall()}
    to_insert = [(tag, nome) for tag, nome in equipment_list if tag not in existing_tags]

    if existing_tags:
        print(f"{len(existing_tags)} equipamentos do plano já existem no banco e serão pulados (script é seguro pra rodar de novo):")
        for tag in sorted(existing_tags):
            print(f"  - {tag}")
        print()

    print(f"{len(to_insert)} equipamentos novos serão inseridos.")

    if not args.apply:
        print("\n[DRY-RUN] Nada foi gravado. Rode de novo com --apply para gravar de verdade.")
        cur.close()
        conn.close()
        return

    # --- Aplicando de verdade -----------------------------------------------
    if demo_ids:
        cur.execute("DELETE FROM equipment WHERE id = ANY(%s::uuid[])", (demo_ids,))
        print(f"\n{len(demo_ids)} equipamentos de demonstração apagados ({os_count} OS em cascata).")

    for tag, nome in to_insert:
        cur.execute(
            """
            INSERT INTO equipment (id, vessel_id, tag_number, name, criticality, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, 'A', 'active', now(), now())
            """,
            (str(uuid.uuid4()), vessel_id, tag, nome),
        )

    conn.commit()
    print(f"{len(to_insert)} equipamentos inseridos com sucesso.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

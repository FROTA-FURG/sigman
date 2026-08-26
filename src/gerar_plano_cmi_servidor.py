"""
Transforma o plano extraído da planilha do CMI (planejamentoCMI_v2.json) no
manifesto que vai ser aplicado no banco -- mesmo esquema do
gerar_plano_servidor.py (AS), adaptado pras particularidades desta planilha.

Regras aplicadas aqui (e não no aplicador, pra decisão ficar registrada no
arquivo em vez de escondida em código):

  - Semana marcada -> 1 OS na data daquela semana (segunda-feira).
  - Horas = número escrito dentro da célula colorida.
  - OS com data <= DATA_CORTE_CONCLUIDAS -> status 'completed' (serviço já
    realizado), com a própria data como conclusão.
  - OS depois do corte -> 'open' (pendente de aprovação do engenheiro).
  - Periodicidade em texto livre (ex.: "350h/Trimestral", "semestral",
    "Bi-Anual") é normalizada pro slug usado no sistema: quando tem "/", só
    a parte depois da barra importa (o intervalo por hora de uso na
    planilha não tem onde entrar no cadastro da OS hoje).

Uso:
    .venv/bin/python gerar_plano_cmi_servidor.py
"""
import json
from collections import Counter
from datetime import date
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PLANO_PATH = BASE_DIR / "planejamentoCMI_v2.json"
SAIDA_PATH = BASE_DIR / "plano_cmi_para_servidor.json"

VESSEL_NAME = "Ciências do Mar 1"
VESSEL_TAG = "CM1"
ANO_REFERENCIA = 2026

# Confirmado com o usuário: tudo com data até hoje já foi executado.
DATA_CORTE_CONCLUIDAS = date(2026, 8, 25)

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
    "Trianual": "triennial",
    "Quadrienal": "quadrennial",
    "Sexênio": "sexennial",
}

PERIODICIDADE_FIX = {
    "Semestra": "Semestral",
    "Annual": "Anual",
    "biAnual": "Bianual",
    "semestral": "Semestral",  # planilha CMI usa minúscula em algumas linhas
    "Bi-Anual": "Bianual",
}


def parse_semana(chave, ano):
    """'02/01 à 08/01 ' -> date(ano, 1, 2)."""
    chave = str(chave).strip()
    if not chave or chave.lower() == "null":
        return None
    inicio = chave.split("à")[0].strip()
    try:
        dia, mes = inicio.split("/")
        return date(ano, int(mes), int(dia))
    except (ValueError, IndexError):
        print(f"  [aviso] semana ilegível: {chave!r}")
        return None


def slug_periodicidade(texto):
    if not texto:
        return None
    texto = str(texto).strip()
    if "/" in texto:
        # "350h/Trimestral", "350 hr/Trimestral" -- o intervalo por hora de
        # uso é só informativo aqui, o que importa pra periodicidade da OS
        # é a parte de calendário depois da barra.
        texto = texto.split("/")[-1].strip()
    texto = PERIODICIDADE_FIX.get(texto, texto)
    return PERIODICITY_SLUG.get(texto, texto)


def main():
    with open(PLANO_PATH, encoding="utf-8") as f:
        plano = json.load(f)

    equipamentos = {}
    ordens = []
    sem_horas = 0
    periodicidades_nao_mapeadas = set()

    for linha in plano["equipamentos"]:
        tag = linha["tag"].strip()
        nome = (linha["descricao_do_eqto"] or "").strip()
        equipamentos.setdefault(tag, nome)

        descricao = linha["atividade"] or "(atividade sem descrição no plano)"
        slug = slug_periodicidade(linha["periodicidade"])
        if slug and slug not in PERIODICITY_SLUG.values():
            periodicidades_nao_mapeadas.add((linha["periodicidade"], slug))

        for marca in linha["datas"]:
            data = parse_semana(marca["semana"], ANO_REFERENCIA)
            if data is None:
                continue

            horas = marca.get("horas")
            if horas is None:
                sem_horas += 1

            concluida = data <= DATA_CORTE_CONCLUIDAS

            ordens.append({
                "tag_equipamento": tag,
                "descricao": descricao,
                "tipo_manutencao": "preventive",
                "periodicidade": slug,
                "data": data.isoformat(),
                "horas_estimadas": horas,
                "status": "completed" if concluida else "open",
                "concluida_em": data.isoformat() if concluida else None,
                "plano_52_semanas": True,
            })

    manifesto = {
        "gerado_em": date.today().isoformat(),
        "origem": "Plano52CMI.xlsx (aba 'PCM CMI 2024')",
        "embarcacao": {"nome": VESSEL_NAME, "tag": VESSEL_TAG},
        "regras": {
            "ano_referencia": ANO_REFERENCIA,
            "data_corte_concluidas": DATA_CORTE_CONCLUIDAS.isoformat(),
            "observacao": (
                "OS com data até a data de corte entram como 'completed'; "
                "as demais entram como 'open' (pendente de aprovação do engenheiro). "
                "Horas vêm do número escrito na célula colorida da semana."
            ),
        },
        "equipamentos": [{"tag": t, "nome": n} for t, n in equipamentos.items()],
        "ordens_servico": ordens,
    }

    with open(SAIDA_PATH, "w", encoding="utf-8") as f:
        json.dump(manifesto, f, indent=2, ensure_ascii=False)

    por_status = Counter(o["status"] for o in ordens)
    total_horas = sum(o["horas_estimadas"] or 0 for o in ordens)

    print(f"Manifesto gravado em {SAIDA_PATH.name}")
    print(f"  equipamentos      : {len(equipamentos)}")
    print(f"  ordens de serviço : {len(ordens)}")
    for st, qtd in sorted(por_status.items()):
        print(f"    - {st}: {qtd}")
    print(f"  horas totais      : {total_horas:.1f} Hh ({sem_horas} OS sem horas na planilha)")
    print(f"  corte 'concluída' : até {DATA_CORTE_CONCLUIDAS.isoformat()}")
    if periodicidades_nao_mapeadas:
        print(f"  [ATENÇÃO] periodicidades sem slug conhecido (ficaram como texto cru): {periodicidades_nao_mapeadas}")


if __name__ == "__main__":
    main()

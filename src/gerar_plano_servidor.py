"""
Transforma o plano extraído da planilha (planejamentoAS_v2.json) no manifesto
que vai ser aplicado no banco -- aqui e no servidor da nuvem.

O manifesto é autocontido de propósito: traz os equipamentos e cada Ordem de
Serviço já resolvida (data real, horas, status), sem depender da planilha nem
de qual é o estado atual do banco de destino. Assim o mesmo arquivo pode ser
aplicado numa base que ainda não tem nada e numa que já tem o plano
importado, com o mesmo resultado final.

Regras aplicadas aqui (e não no aplicador, pra decisão ficar registrada no
arquivo em vez de escondida em código):

  - Semana marcada -> 1 OS na data daquela semana (segunda-feira).
  - Horas = número escrito dentro da célula colorida.
  - OS com data <= DATA_CORTE_CONCLUIDAS -> status 'completed' (serviço já
    realizado), com a própria data como conclusão.
  - OS depois do corte -> 'open' (pendente de aprovação do engenheiro).

Uso:
    .venv/bin/python gerar_plano_servidor.py
"""
import json
from collections import Counter
from datetime import date
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PLANO_PATH = BASE_DIR / "planejamentoAS_v2.json"
SAIDA_PATH = BASE_DIR / "plano_as_para_servidor.json"

VESSEL_NAME = "Atlântico Sul"
VESSEL_TAG = "AS"
ANO_REFERENCIA = 2026

# Confirmado com o usuário: tudo com data até este dia já foi executado.
DATA_CORTE_CONCLUIDAS = date(2026, 8, 14)

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
}

# Vermelho-escuro fora da legenda, 1 dígito de diferença do Anual (FF980000)
# e sempre em linha cujo texto de periodicidade já é variante de "Anual".
COR_VARIANTE_ANUAL = "FF990000"


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
    texto = PERIODICIDADE_FIX.get(str(texto).strip(), str(texto).strip())
    return PERIODICITY_SLUG.get(texto, texto)


def main():
    with open(PLANO_PATH, encoding="utf-8") as f:
        plano = json.load(f)

    equipamentos = {}
    ordens = []
    sem_horas = 0

    for linha in plano["equipamentos"]:
        tag = linha["tag"].strip()
        nome = (linha["descricao_do_eqto"] or "").strip()
        equipamentos.setdefault(tag, nome)

        descricao = linha["atividade"] or "(atividade sem descrição no plano)"
        slug = slug_periodicidade(linha["periodicidade"])

        for marca in linha["datas"]:
            data = parse_semana(marca["semana"], ANO_REFERENCIA)
            if data is None:
                continue

            valor = marca["periodicidade"]
            # A cor sem legenda cai no mesmo tratamento do Anual.
            periodicidade_os = slug if valor != COR_VARIANTE_ANUAL else (slug or "annual")

            horas = marca.get("horas")
            if horas is None:
                sem_horas += 1

            concluida = data <= DATA_CORTE_CONCLUIDAS

            ordens.append({
                "tag_equipamento": tag,
                "descricao": descricao,
                "tipo_manutencao": "preventive",
                "periodicidade": periodicidade_os,
                "data": data.isoformat(),
                "horas_estimadas": horas,
                "status": "completed" if concluida else "open",
                "concluida_em": data.isoformat() if concluida else None,
                "plano_52_semanas": True,
            })

    manifesto = {
        "gerado_em": date.today().isoformat(),
        "origem": "Plano 52 semanas AS.xlsx (aba 'Plano de 52 Semanas AS')",
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


if __name__ == "__main__":
    main()

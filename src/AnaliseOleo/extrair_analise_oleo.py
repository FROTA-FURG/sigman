# -*- coding: utf-8 -*-
"""
Extrai a "Ferramenta de Gestão de Análise de Óleo" (.xlsb) para o JSON que
a tela Análise de Óleo consome no frontend.

Por enquanto não há backend nem banco para análise de óleo: este JSON é a
fonte de dados da tela. Para atualizar, rode de novo apontando para a versão
nova da planilha:

    python src/AnaliseOleo/extrair_analise_oleo.py "docs/Ferramenta ... .xlsb"

Saída: src/AnaliseOleo/analise_oleo.json -- carregada no banco por `php artisan oil-analysis:import`.
"""
import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

from pyxlsb import open_workbook

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / 'src/AnaliseOleo/analise_oleo.json'

# ---------------------------------------------------------------------------
# Famílias de equipamento. Cada uma mede parâmetros diferentes; as posições
# de coluna foram conferidas em todas as abas da família (ver README ao lado).
# `sentido`: 'max' = acima do limite é ruim; 'min' = abaixo é ruim (TBN);
# 'faixa' = fora de [inf, sup] é ruim (viscosidade).
# ---------------------------------------------------------------------------
FAMILIAS = {
    'motor': {
        'rotulo': 'Motor de Combustão',
        'grupos': [
            ('Físico-Químicos', [
                ('agua', 'Água', 'ppm', 'max'),
                ('viscosidade', 'Viscosidade a 40°C', 'cSt', 'faixa'),
                ('tbn', 'TBN', 'mgKOH/g', 'min'),
                ('fuligem', 'Fuligem', 'abs/cm⁻¹', 'max'),
            ]),
            ('Espectrometria', [
                ('fe', 'Fe', 'ppm', 'max'), ('al', 'Al', 'ppm', 'max'),
                ('cr', 'Cr', 'ppm', 'max'), ('cu', 'Cu', 'ppm', 'max'),
                ('pb', 'Pb', 'ppm', 'max'), ('sn', 'Sn', 'ppm', 'max'),
                ('si', 'Si', 'ppm', 'max'),
            ]),
            ('Infravermelho', [
                ('glicol', 'Glicol', '%', 'max'),
                ('nitracao', 'Nitração', 'abs/cm⁻¹', 'max'),
                ('sulfatacao', 'Sulfatação', 'abs/cm⁻¹', 'max'),
                ('oxidacao', 'Oxidação', 'abs/cm⁻¹', 'max'),
            ]),
        ],
        # Dados da amostra: coluna -> campo
        'amostra': {0: 'numero', 1: 'laboratorio', 2: 'produto', 3: 'viscosidadeNominal',
                    4: 'volume', 5: 'horasServico', 6: 'reposicao', 7: 'produtoTrocado', 8: 'dataColeta'},
        'resultados': {9: 'agua', 10: 'viscosidade', 11: 'tbn', 12: 'fuligem', 13: 'fe', 14: 'al',
                       15: 'cr', 16: 'cu', 17: 'pb', 18: 'sn', 19: 'si', 20: 'glicol',
                       21: 'nitracao', 22: 'sulfatacao', 23: 'oxidacao'},
        'condicao': 24,
        # Limite amarelo não tem Nitração; o vermelho tem.
        'limiteAmarelo': {25: 'agua', 26: 'viscosidade_inf', 27: 'viscosidade_sup', 28: 'tbn', 29: 'fuligem',
                          30: 'fe', 31: 'al', 32: 'cr', 33: 'cu', 34: 'pb', 35: 'sn', 36: 'si',
                          37: 'glicol', 38: 'sulfatacao', 39: 'oxidacao'},
        'limiteVermelho': {40: 'agua', 41: 'viscosidade_inf', 42: 'viscosidade_sup', 43: 'tbn', 44: 'fuligem',
                           45: 'fe', 46: 'al', 47: 'cr', 48: 'cu', 49: 'pb', 50: 'sn', 51: 'si',
                           52: 'glicol', 53: 'nitracao', 54: 'sulfatacao', 55: 'oxidacao'},
    },
    'redutora': {
        'rotulo': 'Caixa Redutora / Reversora',
        'grupos': [
            ('Físico-Químicos', [
                ('agua', 'Água', 'ppm', 'max'),
                ('viscosidade', 'Viscosidade a 40°C', 'cSt', 'faixa'),
                ('tan', 'TAN', 'mgKOH/g', 'max'),
            ]),
            ('Espectrometria', [
                ('fe', 'Fe', 'ppm', 'max'), ('cu', 'Cu', 'ppm', 'max'), ('si', 'Si', 'ppm', 'max'),
            ]),
        ],
        # Redutora não tem coluna de laboratório.
        'amostra': {0: 'numero', 1: 'produto', 2: 'viscosidadeNominal', 3: 'volume', 4: 'horasServico',
                    5: 'reposicao', 6: 'produtoTrocado', 7: 'dataColeta'},
        'resultados': {8: 'agua', 9: 'viscosidade', 10: 'tan', 11: 'fe', 12: 'cu', 13: 'si'},
        'condicao': 14,
        'limiteAmarelo': {15: 'agua', 16: 'viscosidade_inf', 17: 'viscosidade_sup', 18: 'tan',
                          19: 'fe', 20: 'cu', 21: 'si', 22: 'oxidacao'},
        'limiteVermelho': {23: 'agua', 24: 'viscosidade_inf', 25: 'viscosidade_sup', 26: 'tan',
                           27: 'fe', 28: 'cu', 29: 'si', 30: 'oxidacao'},
    },
    'hidraulica': {
        'rotulo': 'Unidade Hidráulica',
        'grupos': [
            ('Físico-Químicos', [
                ('agua', 'Água', 'ppm', 'max'),
                ('viscosidade', 'Viscosidade a 40°C', 'cSt', 'faixa'),
                ('tan', 'TAN', 'mgKOH/g', 'max'),
            ]),
            ('Contagem de Partículas', [
                ('nas', 'Classe NAS', 'NAS', 'max'),
            ]),
            ('Espectrometria', [
                ('cu', 'Cu', 'ppm', 'max'), ('fe', 'Fe', 'ppm', 'max'), ('cr', 'Cr', 'ppm', 'max'),
                ('pb', 'Pb', 'ppm', 'max'), ('si', 'Si', 'ppm', 'max'),
            ]),
        ],
        'amostra': {0: 'numero', 1: 'laboratorio', 2: 'produto', 3: 'viscosidadeNominal', 4: 'volume',
                    5: 'horasServico', 6: 'reposicao', 7: 'produtoTrocado', 8: 'dataColeta'},
        'resultados': {9: 'agua', 10: 'viscosidade', 11: 'tan', 12: 'nas', 13: 'cu', 14: 'fe',
                       15: 'cr', 16: 'pb', 17: 'si'},
        'condicao': 18,
        # Na hidráulica o "amarelo" é chamado de Limites Aceitáveis e a
        # contagem de partículas tem três faixas (verde/amarelo/vermelho).
        # O amarelo não tem TAN; o vermelho tem.
        'limiteAmarelo': {19: 'agua', 20: 'viscosidade_inf', 21: 'viscosidade_sup', 23: 'nas',
                          24: 'cu', 25: 'fe', 26: 'cr', 27: 'pb', 28: 'si'},
        'limiteVerdeExtra': {22: 'nas'},
        'limiteVermelho': {29: 'agua', 30: 'viscosidade_inf', 31: 'viscosidade_sup', 32: 'tan', 33: 'nas',
                           34: 'cu', 35: 'fe', 36: 'cr', 37: 'pb', 38: 'si'},
    },
}

EMBARCACOES = [
    {'tag': 'AS', 'nome': 'Atlântico Sul'},
    {'tag': 'CM1', 'nome': 'Ciências do Mar 1'},
    {'tag': 'LL', 'nome': 'Lancha Larus'},
]

ABAS_PLANO = {'AS': 'PLANO DE AÇÃO AS', 'CM1': 'PLANO DE AÇÃO CMI', 'LL': 'PLANO DE AÇÃO LL'}
ABAS_HISTORICO = {'AS': 'ARMAZ. PLANOS DE AÇÃO NOc-AS', 'CM1': 'ARMAZ. PLANOS DE AÇÃO LEF-CMI',
                  'LL': 'ARMAZ. PLANOS DE AÇÃO LL'}

# Equipamentos do plano de ação cujo TAG não bate com o da aba de análises
# (a planilha usa códigos diferentes em cada lugar). Chave = TAG normalizado
# do plano, valor = id do equipamento.
ALIAS_PLANO = {
    'AS01-SAF-CREMOL': 'AS01-SMC-CRE03',   # Caixa Redutora Molinete
    'AS01-SMC-CRE01': 'AS01-SMP-CRE02',    # Caixa Redutora MCA01 (código antigo no histórico)
    'LL01-SPP-CREBB': 'LL01-SPP-REDBB',
    'LL01-SPP-CREBE': 'LL01-SPP-REDBE',
}


def serial_para_iso(valor):
    """Data serial do Excel -> 'aaaa-mm-dd'. Texto/traço/vazio -> None."""
    if isinstance(valor, (int, float)) and valor > 20000:
        return (date(1899, 12, 30) + timedelta(days=int(valor))).isoformat()
    return None


def numero(valor):
    if isinstance(valor, (int, float)):
        return round(float(valor), 4)
    return None


def texto(valor):
    if valor is None:
        return None
    s = str(valor).strip()
    return s if s and s != '-' else None


def normalizar_tag(tag):
    """Tira espaços e troca '_' por '-'; unifica CMI/CM01 como prefixo CM1."""
    t = re.sub(r'\s+', '', str(tag or '')).replace('_', '-').upper()
    return t


def chave_equipamento(tag):
    """Chave estável para casar plano <-> aba: sem prefixo de embarcação
    variável (CMI vs CM01) -- a embarcação vem à parte."""
    t = normalizar_tag(tag)
    t = ALIAS_PLANO.get(t, t)
    return t.split('-', 1)[1] if '-' in t else t


def embarcacao_da_tag(tag):
    t = normalizar_tag(tag)
    if t.startswith('AS'):
        return 'AS'
    if t.startswith('CM'):
        return 'CM1'
    if t.startswith('LL'):
        return 'LL'
    return None


def familia_da_aba(n_colunas, cabecalho):
    if 'Fuligem' in cabecalho:
        return 'motor'
    if any('Partículas' in c for c in cabecalho):
        return 'hidraulica'
    return 'redutora'


def ler_linhas(wb, aba):
    with wb.get_sheet(aba) as sh:
        return [[c.v for c in row] for row in sh.rows()]


def extrair_equipamento(aba, linhas):
    cabecalho = [str(v or '') for v in linhas[8]]
    familia = familia_da_aba(len(cabecalho), cabecalho)
    spec = FAMILIAS[familia]

    titulo = str(linhas[0][0] or '')
    partes = [p.strip() for p in titulo.split('\n') if p.strip()]
    nome = partes[1] if len(partes) > 1 else aba
    tag_titulo = partes[2].replace('TAG:', '').strip() if len(partes) > 2 else aba
    tag = normalizar_tag(tag_titulo)

    amostras = []
    limites = None
    for linha in linhas[9:]:
        if not linha or not isinstance(linha[0], (int, float)):
            continue

        def col(i):
            return linha[i] if i < len(linha) else None

        amostra = {}
        for i, campo in spec['amostra'].items():
            v = col(i)
            if campo == 'dataColeta':
                amostra[campo] = serial_para_iso(v)
            elif campo in ('laboratorio', 'produto', 'produtoTrocado'):
                amostra[campo] = texto(v)
            else:
                amostra[campo] = numero(v)
        amostra['numero'] = int(amostra['numero']) if amostra.get('numero') else None
        amostra['resultados'] = {campo: numero(col(i)) for i, campo in spec['resultados'].items()}
        amostra['condicao'] = texto(col(spec['condicao']))
        amostra.setdefault('laboratorio', None)

        # Linha reservada para uma coleta que ainda não aconteceu: sem data e
        # sem resultado. A fórmula da planilha marca "Intervir" nelas por
        # padrão, o que na tela viraria uma análise crítica sem dado algum.
        tem_resultado = any(v is not None for v in amostra['resultados'].values())
        if not amostra['dataColeta'] and not tem_resultado:
            continue

        amostras.append(amostra)

        # Os limites se repetem em toda linha; fica o da amostra mais recente.
        limites = {
            'amarelo': {campo: numero(col(i)) for i, campo in spec['limiteAmarelo'].items()},
            'vermelho': {campo: numero(col(i)) for i, campo in spec['limiteVermelho'].items()},
        }
        if 'limiteVerdeExtra' in spec:
            limites['verde'] = {campo: numero(col(i)) for i, campo in spec['limiteVerdeExtra'].items()}

    return {
        'id': normalizar_tag(aba),
        'tag': tag,
        'nome': nome.title() if nome.isupper() else nome,
        'embarcacao': embarcacao_da_tag(aba),
        'familia': familia,
        'amostras': amostras,
        'limites': limites or {'amarelo': {}, 'vermelho': {}},
    }


def extrair_linhas_plano(linhas, inicio, mapa_colunas):
    itens = []
    for linha in linhas[inicio:]:
        def col(nome):
            i = mapa_colunas.get(nome)
            return linha[i] if i is not None and i < len(linha) else None

        equipamento = texto(col('Equipamento'))
        if not equipamento:
            continue
        partes = [p.strip() for p in re.split(r'\n|\s{3,}', equipamento) if p.strip()]
        tag = partes[-1].replace('TAG:', '').strip() if len(partes) > 1 else None
        nome = partes[0] if len(partes) > 1 else equipamento

        itens.append({
            'equipamento': nome,
            'tag': normalizar_tag(tag) if tag else None,
            'frequenciaMeses': numero(col('Frequência de Coleta (mês)')),
            'dataColeta': serial_para_iso(col('Data da Coleta')),
            'dataProximaColeta': serial_para_iso(col('Data da Próxima Coleta')),
            'frequenciaHoras': numero(col('Frequência de Coleta (horas)')),
            'horimetroAtual': numero(col('Horímetro Atual')),
            'horimetroProximaColeta': numero(col('Horímetro da próxima coleta')),
            'condicao': texto(col('Condição da Amostra')),
            'acao': texto(col('Ação')),
            'observacoes': texto(col('Observações')),
            'responsaveis': texto(col('Responsáveis')),
            'prazo': serial_para_iso(col('Prazo para Execução')),
        })
    return itens


def mapa_do_cabecalho(linha):
    return {re.sub(r'\s+', ' ', str(v)).strip(): i for i, v in enumerate(linha) if v not in (None, '')}


def main():
    arquivo = Path(sys.argv[1]) if len(sys.argv) > 1 else next((RAIZ / 'docs').glob('*nálise de Óleo*.xlsb'))

    equipamentos = []
    planos = {}
    historico = {}
    data_referencia = None

    with open_workbook(str(arquivo)) as wb:
        for aba in wb.sheets:
            if aba.startswith(('GRÁFICO', 'Gráfico', 'PLANO', 'ARMAZ', 'MENU', 'ATLÂNTICO', 'CIÊNCIAS', 'LANCHA')):
                continue
            equipamentos.append(extrair_equipamento(aba, ler_linhas(wb, aba)))

        for emb, aba in ABAS_PLANO.items():
            linhas = ler_linhas(wb, aba)
            # "Data Atual" da planilha = data de referência do plano.
            for linha in linhas[:4]:
                if linha and str(linha[0] or '').strip() == 'Data Atual':
                    data_referencia = serial_para_iso(linha[1])
            idx = next(i for i, l in enumerate(linhas) if 'Equipamento' in [str(v or '').strip() for v in l])
            planos[emb] = extrair_linhas_plano(linhas, idx + 1, mapa_do_cabecalho(linhas[idx]))

        for emb, aba in ABAS_HISTORICO.items():
            linhas = ler_linhas(wb, aba)
            idx = next((i for i, l in enumerate(linhas) if 'Equipamento' in [str(v or '').strip() for v in l]), None)
            historico[emb] = extrair_linhas_plano(linhas, idx + 1, mapa_do_cabecalho(linhas[idx])) if idx is not None else []

    # Liga cada linha de plano/histórico ao equipamento da aba de análises.
    por_chave = {(e['embarcacao'], chave_equipamento(e['id'])): e['id'] for e in equipamentos}
    nao_ligados = []
    for emb, colecao in list(planos.items()) + list(historico.items()):
        for item in colecao:
            eq_id = por_chave.get((emb, chave_equipamento(item['tag']))) if item['tag'] else None
            item['equipamentoId'] = eq_id
            if not eq_id:
                nao_ligados.append((emb, item['tag'], item['equipamento']))

    familias = {
        chave: {
            'rotulo': spec['rotulo'],
            'grupos': [
                {'nome': nome, 'parametros': [
                    {'chave': c, 'rotulo': r, 'unidade': u, 'sentido': s} for c, r, u, s in params
                ]}
                for nome, params in spec['grupos']
            ],
        }
        for chave, spec in FAMILIAS.items()
    }

    saida = {
        'fonte': arquivo.name,
        'dataReferencia': data_referencia,
        'embarcacoes': EMBARCACOES,
        'familias': familias,
        'equipamentos': equipamentos,
        'planosAcao': planos,
        'historicoPlanosAcao': historico,
    }

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding='utf-8')

    print(f'Gerado: {SAIDA.relative_to(RAIZ)}')
    print(f'Equipamentos: {len(equipamentos)} | Amostras: {sum(len(e["amostras"]) for e in equipamentos)}')
    for emb in ('AS', 'CM1', 'LL'):
        eqs = [e for e in equipamentos if e['embarcacao'] == emb]
        print(f'  {emb}: {len(eqs)} equipamentos, plano com {len(planos.get(emb, []))} itens, '
              f'histórico com {len(historico.get(emb, []))} registros')
    if nao_ligados:
        print(f'Linhas de plano sem equipamento correspondente ({len(nao_ligados)}):')
        for emb, tag, nome in nao_ligados:
            print(f'  {emb} | {tag} | {nome}')


if __name__ == '__main__':
    main()

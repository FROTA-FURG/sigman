import React from 'react';
import { Link } from '@inertiajs/react';

const TABS = [
    { key: 'planning', label: 'Métricas' },
    { key: 'future', label: 'Planejamento' },
    { key: 'weekly', label: 'Andamento' },
    { key: 'calendar', label: 'Calendário' },
];

/**
 * Barra de abas de Ordens de Serviço. As 4 primeiras trocam de vista sem
 * sair da página (usado só dentro de WorkOrders/Index.jsx); "Janela de
 * Execução" é uma página própria (tem CRUD/histórico dela), então é
 * sempre um Link -- ela só entra na mesma barra visualmente pra parecer
 * mais uma aba do módulo de OS, não uma tela separada.
 */
export default function WorkOrdersTabBar({ activeTab, onTabClick }) {
    return (
        <div className="flex items-center">
            {TABS.map(tab => (
                <button
                    key={tab.key}
                    onClick={() => onTabClick(tab.key)}
                    className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === tab.key ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    {tab.label}
                </button>
            ))}

            <Link
                href={route('execution-windows.index')}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'execution-windows' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
                Janela de Execução
                <span
                    className="group relative flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-300 hover:bg-slate-600"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                    !
                    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 p-3 text-left text-xs font-normal normal-case leading-relaxed text-slate-300 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                        Um lote de OS agrupado numa janela de datas em que a embarcação está disponível (fora do plano de cruzeiro). Não muda a data prevista de cada OS, só a data de início real -- é a ferramenta pra reorganizar a execução conforme a disponibilidade, sem perder o que era originalmente planejado.
                    </span>
                </span>
            </Link>
        </div>
    );
}

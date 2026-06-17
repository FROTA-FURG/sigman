import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Chart } from "react-google-charts";

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export default function FullPlan({ workOrders = [], equipments = [], users = [] }) {

    const [chartMode, setChartMode] = useState('monthly'); 
    const [chartYear, setChartYear] = useState(new Date().getFullYear());
    const [chartMonth, setChartMonth] = useState(new Date().getMonth());

    const handlePrevYear = () => setChartYear(y => y - 1);
    const handleNextYear = () => setChartYear(y => y + 1);

    const handlePrevMonth = () => {
        if (chartMonth === 0) {
            setChartMonth(11);
            setChartYear(y => y - 1);
        } else {
            setChartMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (chartMonth === 11) {
            setChartMonth(0);
            setChartYear(y => y + 1);
        } else {
            setChartMonth(m => m + 1);
        }
    };

    const metrics = useMemo(() => {
        const now = new Date();
        const activeStatuses = ['open', 'in_progress'];
        
        let totalActive = 0;
        let totalOverdue = 0;
        let totalAhead = 0; 
        let awaitingApproval = [];
        const periodCounts = { monthly: 0, bimonthly: 0, quarterly: 0, semiannual: 0, annual: 0, docking: 0, avulsa: 0 };

        workOrders.forEach(os => {
            const isActive = activeStatuses.includes(os.status);
            const isCompleted = os.status === 'completed';
            const osDate = os.created_at ? new Date(os.created_at) : now;
            
            if (isActive) totalActive++;

            const diffTime = Math.abs(now - osDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (isActive && diffDays > 15) totalOverdue++;

            if (isCompleted && os.updated_at) {
                const updateDate = new Date(os.updated_at);
                const completionDiff = Math.ceil(Math.abs(updateDate - osDate) / (1000 * 60 * 60 * 24));
                if (completionDiff <= 2) totalAhead++;
            }

            if (os.status === 'open' && (os.maintenance_type === 'preventive' || os.maintenance_type === 'predictive')) {
                awaitingApproval.push(os);
            }

            if (os.periodicity && periodCounts[os.periodicity] !== undefined) {
                periodCounts[os.periodicity]++;
            } else {
                periodCounts.avulsa++;
            }
        });

        const pieData = [
            { name: 'Mensal', value: periodCounts.monthly, color: '#65a30d' }, 
            { name: 'Bimestral', value: periodCounts.bimonthly, color: '#3b82f6' }, 
            { name: 'Trimestral', value: periodCounts.quarterly, color: '#4ade80' }, 
            { name: 'Semestral', value: periodCounts.semiannual, color: '#f97316' }, 
            { name: 'Anual', value: periodCounts.annual, color: '#dc2626' }, 
            { name: 'Docagem', value: periodCounts.docking, color: '#cbd5e1' }, 
            { name: 'Avulsa', value: periodCounts.avulsa, color: '#64748b' }, 
        ].filter(item => item.value > 0); 

        const googleChartData = [
            ["Periodicidade", "Quantidade"],
            ...pieData.map(item => [item.name, item.value])
        ];

        const googleChartColors = pieData.map(item => item.color);

        return { 
            totalActive, 
            totalOverdue, 
            totalAhead, 
            pieData, 
            googleChartData,
            googleChartColors,
            awaitingApproval: awaitingApproval.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6) 
        };
    }, [workOrders]);

    const barChartData = useMemo(() => {
        const vesselStats = {};

        workOrders.forEach(os => {
            if (!os.created_at) return;
            
            const [datePart] = os.created_at.split('T');
            const [yearStr, monthStr] = datePart.split('-');
            const osYear = parseInt(yearStr, 10);
            const osMonth = parseInt(monthStr, 10) - 1; 

            if (chartMode === 'annual' && osYear !== chartYear) return;
            if (chartMode === 'monthly' && (osYear !== chartYear || osMonth !== chartMonth)) return;

            const vesselTag = os.equipment?.vessel?.tag || 'Sem Emb.';
            if (!vesselStats[vesselTag]) {
                vesselStats[vesselTag] = { name: vesselTag, Corretiva: 0, Preventiva: 0, Preditiva: 0 };
            }

            if (os.maintenance_type === 'corrective') vesselStats[vesselTag].Corretiva++;
            else if (os.maintenance_type === 'preventive') vesselStats[vesselTag].Preventiva++;
            else if (os.maintenance_type === 'predictive') vesselStats[vesselTag].Preditiva++;
        });

        return Object.values(vesselStats);
    }, [workOrders, chartMode, chartYear, chartMonth]);

    const KpiCard = ({ title, value, subtitle, icon, trendColor }) => (
        <div className="flex flex-col justify-between rounded-lg border border-slate-700/50 bg-slate-800/40 p-2.5 shadow-sm hover:bg-slate-800/60 transition-colors">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
                    <h4 className="mt-0.5 text-lg font-bold text-white">{value}</h4>
                </div>
                <div className={`rounded p-1.5 ${trendColor}`}>{icon}</div>
            </div>
            <p className="mt-1 text-[9px] font-medium text-slate-500 truncate">{subtitle}</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full gap-2 pb-2 overflow-y-auto custom-scrollbar">
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-shrink-0">
                <KpiCard 
                    title="OS Ativas" value={metrics.totalActive} subtitle="Trabalhos em andamento"
                    trendColor="bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                />
                <KpiCard 
                    title="OS Atrasadas" value={metrics.totalOverdue} subtitle="Mais de 15 dias em aberto"
                    trendColor="bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <KpiCard 
                    title="OS Adiantadas" value={metrics.totalAhead} subtitle="Concluídas antes do prazo"
                    trendColor="bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                />
                <KpiCard 
                    title="Fila Aprovação" value={metrics.awaitingApproval.length} subtitle="Necessitam peças"
                    trendColor="bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20"
                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0">
                
                <div className="col-span-1 lg:col-span-2 flex flex-col rounded-xl border border-slate-700/50 bg-slate-800/30 p-2.5 shadow-sm overflow-hidden">
                    <div className="mb-2 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between flex-shrink-0">
                        <h3 className="text-xs font-bold text-white">Carga de Trabalho por Embarcação</h3>
                        
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex rounded-lg bg-slate-900/80 p-0.5 ring-1 ring-slate-700/50">
                                <button onClick={() => setChartMode('all')} className={`rounded px-2 py-1 text-[10px] font-medium transition-all ${chartMode === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Todas</button>
                                <button onClick={() => setChartMode('annual')} className={`rounded px-2 py-1 text-[10px] font-medium transition-all ${chartMode === 'annual' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Anual</button>
                                <button onClick={() => setChartMode('monthly')} className={`rounded px-2 py-1 text-[10px] font-medium transition-all ${chartMode === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Mensal</button>
                            </div>

                            {(chartMode === 'annual' || chartMode === 'monthly') && (
                                <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/50 px-2 py-1 text-[10px] font-medium text-slate-400 ring-1 ring-slate-700/50 select-none">
                                    <button onClick={handlePrevYear} className="px-1 hover:text-white transition-colors">&laquo;</button>
                                    <span className="cursor-pointer hover:text-slate-300 transition-colors" onClick={handlePrevYear}>{chartYear - 1}</span>
                                    <span className="text-[11px] font-bold text-blue-400">{chartYear}</span>
                                    <span className="cursor-pointer hover:text-slate-300 transition-colors" onClick={handleNextYear}>{chartYear + 1}</span>
                                    <button onClick={handleNextYear} className="px-1 hover:text-white transition-colors">&raquo;</button>
                                </div>
                            )}

                            {chartMode === 'monthly' && (
                                <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/50 px-2 py-1 text-[10px] font-medium text-slate-400 ring-1 ring-slate-700/50 select-none">
                                    <button onClick={handlePrevMonth} className="px-1 hover:text-white transition-colors">&laquo;</button>
                                    <span className="cursor-pointer hover:text-slate-300 transition-colors uppercase" onClick={handlePrevMonth}>{MONTHS[chartMonth === 0 ? 11 : chartMonth - 1]}</span>
                                    <span className="text-[11px] font-bold text-blue-400 uppercase">{MONTHS[chartMonth]}</span>
                                    <span className="cursor-pointer hover:text-slate-300 transition-colors uppercase" onClick={handleNextMonth}>{MONTHS[chartMonth === 11 ? 0 : chartMonth + 1]}</span>
                                    <button onClick={handleNextMonth} className="px-1 hover:text-white transition-colors">&raquo;</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full flex-1 flex flex-col justify-end min-h-[180px]">
                        {barChartData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-xs italic text-slate-500">
                                Nenhuma Ordem de Serviço encontrada.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }}
                                        cursor={{fill: '#1e293b'}}
                                    />
                                    <Bar dataKey="Corretiva" fill="#FF4560" radius={[4, 4, 0, 0]} maxBarSize={25} />
                                    <Bar dataKey="Preventiva" fill="#008FFB" radius={[4, 4, 0, 0]} maxBarSize={25} />
                                    <Bar dataKey="Preditiva" fill="#00E396" radius={[4, 4, 0, 0]} maxBarSize={25} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    
                    {barChartData.length > 0 && (
                        <div className="mt-1 flex flex-wrap justify-center gap-3 pt-1.5 flex-shrink-0 border-t border-slate-700/50">
                            <div className="flex items-center gap-1"><span className="block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: '#FF4560' }}></span><span className="text-[9px] font-medium text-slate-300">Corretiva</span></div>
                            <div className="flex items-center gap-1"><span className="block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: '#008FFB' }}></span><span className="text-[9px] font-medium text-slate-300">Preventiva</span></div>
                            <div className="flex items-center gap-1"><span className="block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: '#00E396' }}></span><span className="text-[9px] font-medium text-slate-300">Preditiva</span></div>
                        </div>
                    )}
                </div>

                <div className="col-span-1 rounded-xl border border-slate-700/50 bg-slate-800/30 p-2.5 shadow-sm flex flex-col overflow-hidden">
                    <h3 className="mb-2 text-xs font-bold text-white flex-shrink-0">OS Planejadas</h3>
                    
                    <div className="w-full flex-1 flex justify-center items-center" style={{ height: '220px' }}>
                        {metrics.pieData.length > 0 ? (
                            <Chart
                                chartType="PieChart"
                                data={metrics.googleChartData}
                                width="100%"
                                height="100%"
                                options={{
                                    is3D: true,
                                    backgroundColor: 'transparent',
                                    legend: 'none', 
                                    colors: metrics.googleChartColors, 
                                    chartArea: { left: 0, top: 10, right: 0, bottom: 10, width: '100%', height: '100%' },
                                    pieSliceText: 'percentage', 
                                    pieSliceTextStyle: { fontSize: 10, bold: true },
                                    tooltip: { textStyle: { color: '#0f172a', fontSize: 11 }, showColorCode: true }
                                }}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-xs italic text-slate-500">
                                Sem dados de periodicidade.
                            </div>
                        )}
                    </div>

                    <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-1.5 pt-1.5 border-t border-slate-700/50 flex-shrink-0">
                        {metrics.pieData.map((entry, index) => (
                            <div key={`pie-legend-${index}`} className="flex items-center gap-1 m-0 p-0">
                                <span className="block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }}></span>
                                <span className="text-[9px] font-medium text-slate-300 whitespace-nowrap">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
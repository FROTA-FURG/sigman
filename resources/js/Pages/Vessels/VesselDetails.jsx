import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import VesselModel from './components/VesselModel';
import CreateWorkOrderModal from '@/Pages/WorkOrders/components/CreateOSModal';
import EditVesselModal from './components/EditVesselModal';
import VesselReportPDF from './components/VesselReportPDF';
import CreateServiceRequestModal from '../ServiceRequests/ServiceRequests/CreateSRModal';

export default function VesselShow({ vessel, equipments = [], users = [] }) {
    const [isOpenCreateOS, setIsOpenCreateOS] = useState(false);
    const [isOpenCreateSS, setIsOpenCreateSS] = useState(false);
    const [isOpenEditVessel, setIsOpenEditVessel] = useState(false);
    
    const handleIsOpenOS = (id) => {
        setIsOpenCreateOS(true);
    };

    // Badge para Saúde da Máquina (Operacional vs Problema)
    const renderOperationalBadge = (status) => {
        switch (status) {
            case 'Operacional': 
                return <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">Operacional</span>;
            case 'Com Problema': 
            case 'Falha Crítica':
                return <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">Com Problema</span>;
            case 'Em Manutenção': 
                return <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20">Em Manutenção</span>;
            default: 
                return <span className="inline-flex items-center rounded-md bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-500/20">{status}</span>;
        }
    };

    // Badge para Posição Física (Navegando vs Atracada)
    const renderNavigationBadge = (navStatus) => {
        switch (navStatus) {
            case 'Navegando': 
                return <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">Navegando</span>;
            case 'Atracada': 
                return <span className="inline-flex items-center rounded-md bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-500/20">Atracada</span>;
            case 'Fundeada': 
                return <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20">Fundeada</span>;
            default: 
                return <span className="inline-flex items-center rounded-md bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-500/20">{navStatus}</span>;
        }
    };


    return (
        <SIGMANLayout>
            <Head title={`${vessel.name} | Detalhes | SIGMAN`} />
            
            <CreateWorkOrderModal 
                isOpen={isOpenCreateOS} 
                onClose={() => setIsOpenCreateOS(false)}
                equipments={equipments}
                users={users} 
            />

            <CreateServiceRequestModal 
                isOpen={isOpenCreateSS} 
                onClose={() => setIsOpenCreateSS(false)} 
            />

            <EditVesselModal 
                isOpen={isOpenEditVessel}
                onClose={() => setIsOpenEditVessel(false)}
                vessel={vessel}
            />

            {/* Cabeçalho com botão de voltar */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-4">
                    <Link 
                        href={route('vessels.index')} // Ajuste para a sua rota real
                        className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold leading-tight text-white">{vessel.name}</h2>
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-300">{vessel.tag}</span>
                        </div>
                        <p className="text-sm text-slate-400">{vessel.type}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <PDFDownloadLink 
                        document={<VesselReportPDF vessel={vessel} />} 
                        fileName={`Relatorio_${vessel.tag}_${new Date().getTime()}.pdf`}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 flex items-center justify-center"
                    >
                        {({ blob, url, loading, error }) => 
                            loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Gerando PDF...
                                </span>
                            ) : (
                                "Gerar Relatório"
                            )
                        }
                    </PDFDownloadLink>

                    <button 
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                        onClick={() => setIsOpenCreateOS(true)}
                    >
                        Nova Ordem de Serviço
                    </button>

                    <button 
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                        onClick={() => setIsOpenCreateSS(true)}
                    >
                        Nova Solicitação de Serviço
                    </button>
                </div>
            </div>

            {/* Layout Dividido (Split Screen) */}
            {/* O h-[calc(100vh-140px)] garante que a tela ocupe o espaço restante sem quebrar a página toda */}
            <div className="flex h-[calc(100vh-140px)] flex-col gap-6 lg:flex-row">
                
                {/* LADO ESQUERDO: Visualização 3D (50%) */}
                <div className="h-full w-full lg:w-1/2 overflow-hidden rounded-xl border border-slate-800 shadow-xl bg-slate-900">
                    {/* Como ajustamos o VesselModel para h-full, ele vai preencher toda essa div perfeitamente */}
                    <VesselModel 
                        modelPath={vessel.modelPath}
                        vesselName={vessel.name} 
                    />
                </div>

                {/* LADO DIREITO: Informações e Detalhes (50%) com Scroll Próprio */}
                <div className="h-full w-full lg:w-1/2 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-6">
                    
                    <div className="rounded-xl bg-[#0b203c]/90 border border-slate-800 p-6 shadow-lg backdrop-blur-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Status Atual</h3>
                            <button 
                                onClick={() => setIsOpenEditVessel(true)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                                title="Editar Embarcação"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg bg-slate-900/50 p-4 border border-slate-800">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Índice de Saúde</span>
                                <div className="mt-1 flex items-end gap-2">
                                    <span className={`text-3xl font-black ${vessel.healthScore >= 90 ? 'text-emerald-500' : vessel.healthScore >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>{vessel.healthScore}%</span>
                                </div>
                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                    <div className={`h-full rounded-full ${vessel.healthScore >= 90 ? 'bg-emerald-500' : vessel.healthScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${vessel.healthScore}%` }} />
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-900/50 p-4 border border-slate-800">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Última Docagem</span>
                                <div className="mt-1">
                                    <span className="text-xl font-bold text-white">{vessel.lastInspection}</span>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-900/50 p-4 border border-slate-800">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Localização</span>
                                <div className="mt-1 flex items-center gap-1.5">
                                    <svg className="h-4 w-4 shrink-0 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span className="text-sm font-bold text-white">{vessel.location || 'Não informada'}</span>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-900/50 p-4 border border-slate-800">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Navegação</span>
                                <div className="mt-1.5">{renderNavigationBadge(vessel.navigationStatus)}</div>
                            </div>
                        </div>
                    </div>

                    {/* TELEMETRIA (dados futuros — sensores ainda não integrados) */}
                    <div className="rounded-xl bg-[#0b203c]/90 border border-slate-800 p-6 shadow-lg backdrop-blur-md">
                        <div className="mb-4 flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white">Telemetria</h3>
                            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-400/80 ring-1 ring-inset ring-sky-500/20">Em breve</span>
                            <span className="ml-auto text-[11px] text-slate-500">Sensores ainda não integrados</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                { label: 'Posição', unit: 'GPS' },
                                { label: 'Velocidade', unit: 'kn' },
                                { label: 'Temp. Motor', unit: '°C' },
                                { label: 'Pressão Óleo', unit: 'bar' },
                                { label: 'Combustível', unit: '%' },
                                { label: 'Bateria', unit: 'V' },
                                { label: 'Rumo', unit: '°' },
                                { label: 'Horímetro', unit: 'h' },
                            ].map((m) => (
                                <div key={m.label} className="flex flex-col items-center rounded-lg border border-dashed border-slate-700/70 bg-slate-900/30 py-3 text-center">
                                    <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{m.label}</span>
                                    <span className="text-sm font-bold text-slate-600">— <span className="text-[10px] font-medium text-slate-600">{m.unit}</span></span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Card de Especificações */}
                    <div className="rounded-xl bg-[#0b203c]/90 border border-slate-800 p-6 shadow-lg backdrop-blur-md">
                        <h3 className="text-lg font-bold text-white mb-4">Especificações Técnicas</h3>
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                            <div className="border-t border-slate-800 pt-3">
                                <dt className="text-xs font-medium text-slate-500">Construtor</dt>
                                <dd className="mt-1 text-sm font-semibold text-white">{vessel.builder}</dd>
                            </div>
                            <div className="border-t border-slate-800 pt-3">
                                <dt className="text-xs font-medium text-slate-500">Ano de Construção</dt>
                                <dd className="mt-1 text-sm font-semibold text-white">{vessel.year}</dd>
                            </div>
                           <div className="border-t border-slate-800 pt-3">
                                <dt className="text-xs font-medium text-slate-500">Comprimento (LOA)</dt>
                                <dd className="mt-1 text-sm font-semibold text-white">{vessel.dimensions.length}</dd>
                            </div>
                            <div className="border-t border-slate-800 pt-3">
                                {/* Corrigido: Comprimento */}
                                <dt className="text-xs font-medium text-slate-500">Comprimento de Boca</dt> 
                                <dd className="mt-1 text-sm font-semibold text-white">{vessel.dimensions.beam}</dd>
                            </div>
                            <div className="border-t border-slate-800 pt-3">
                                <dt className="text-xs font-medium text-slate-500">Calado</dt>
                                <dd className="mt-1 text-sm font-semibold text-white">{vessel.dimensions.draft}</dd>
                            </div>
                            <div className="border-t border-slate-800 pt-3">
                                <dt className="text-xs font-medium text-slate-500">Capacidade de Tripulação</dt>
                                {/* Atualizado para camelCase */}
                                <dd className="mt-1 text-sm font-semibold text-white">{vessel.crewCapacity}</dd> 
                            </div>
                            <div className="border-t border-slate-800 pt-3">
                                <dt className="text-xs font-medium text-slate-500">Qntd. Equipamentos</dt>
                                {/* Puxando a contagem dinâmica do banco */}
                                <dd className="mt-1 text-sm font-semibold text-white">{vessel.equipmentsCount}</dd>
                            </div>

                            <div className="border-t border-slate-800 pt-3">
                                <dt className="text-xs font-medium text-slate-500">Status Operacional</dt>
                                <dd className="mt-1 text-sm font-semibold text-white">{renderOperationalBadge(vessel.status)}</dd>
                            </div>
                            <div className="border-t border-slate-800 pt-3">
                                <dt className="text-xs font-medium text-slate-500">Status de Navegação</dt>
                                <dd className="mt-1 text-sm font-semibold text-white">{renderNavigationBadge(vessel.navigationStatus)}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Card de Manutenção Ativa */}
                    <div className="rounded-xl bg-slate-800/40 border border-slate-800 p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-4">Métricas de Manutenção</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col border-l-2 border-blue-500 pl-4">
                                <span className="text-sm font-medium text-slate-400">Ordens de Serviço</span>
                                <span className="text-2xl font-bold text-white">{vessel.activeWOs}</span>
                            </div>
                            <div className="flex flex-col border-l-2 border-emerald-500 pl-4">
                                <span className="text-sm font-medium text-slate-400">Solicitações Pendentes</span>
                                <span className="text-2xl font-bold text-white">{vessel.pendingSRs}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </SIGMANLayout>
    );
}
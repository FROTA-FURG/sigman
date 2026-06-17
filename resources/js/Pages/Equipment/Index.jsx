import SIGMANLayout from '@/Layouts/SIGMANLayout';
import { Head, usePage} from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import CreateNodeModal from './Equipments/CreateNodeModal';
import EditNodeModal from './Equipments/EditNodeModal';
import DeleteNodeModal from './Equipments/DeleteNodeModal';

// Definição das Estruturas Fixas
const VESSELS = [
    { id: 'AS', name: 'Atlântico Sul', prefix: 'AS', num: '01'},
    { id: 'CM01', name: 'Ciências do Mar', prefix: 'CM01', num: '02' },
    { id: 'LL', name: 'Lancha Larus', prefix: 'LL', num: '03' },
];

const SECTIONS = [
    { id: 'CMA', name: 'Casa de Máquinas', prefix: 'CMA' },
    { id: 'PPA', name: 'Popa', prefix: 'PPA' },
];

const SYSTEMS = {
    'CMA': [
        { id: 'SPP', name: 'Sistema de Propulsão', prefix: 'SPP' },
        { id: 'LUB', name: 'Lubrificação', prefix: 'LUB' },
        { id: 'ACO', name: 'Ar Comprimido', prefix: 'ACO' },
        { id: 'SEL', name: 'Sistema Elétrico', prefix: 'SEL' },
    ],
    'PPA': [
        { id: 'ACN', name: 'Ancoragem', prefix: 'ACN' },
        { id: 'ACO', name: 'Ar Comprimido', prefix: 'ACO' },
        { id: 'EST', name: 'Estrutural', prefix: 'EST' },
    ]
};

// Componente Recursivo da Árvore
const TreeNode = ({ node, level = 0, selectedNode, onSelect, toggleNode, expandedNodes }) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;

    const getIcon = (type) => {
        switch (type) {
            case 'vessel': return <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v20m-7-7c0 3.866 3.134 7 7 7s7-3.134 7-7m-7 7v-4m14 4v-4M12 2a3 3 0 110 6 3 3 0 010-6z" /></svg>;
            case 'section': return <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
            case 'system': return <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>;
            case 'equipment': return <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
            case 'component': return <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>;
            default: return null;
        }
    };

    return (
        <div className="select-none">
            <div 
                className={`flex items-center py-1.5 px-2 cursor-pointer rounded-lg transition-colors duration-200 ${isSelected ? 'bg-blue-600/20 ring-1 ring-blue-500/50' : 'hover:bg-slate-800/50'}`}
                style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
                onClick={() => onSelect(node)}
            >
                <div className="w-5 flex justify-center items-center mr-1" onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}>
                    {hasChildren && <svg className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
                </div>
                <div className="flex items-center gap-2 overflow-hidden">
                    {getIcon(node.type)}
                    <span className={`text-sm truncate ${isSelected ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}>{node.name}</span>
                    {node.tag && <span className="hidden sm:inline-flex items-center rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400">{node.tag}</span>}
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 border-l border-slate-700/50" style={{ left: `${level * 1.5 + 1.25}rem` }}></div>
                    {node.children.map(child => (
                        <TreeNode key={child.id} node={child} level={level + 1} selectedNode={selectedNode} onSelect={onSelect} toggleNode={toggleNode} expandedNodes={expandedNodes} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function Index({ equipmentTree }) {
    // Busca os dados do usuário autenticado no Laravel
    const { auth } = usePage().props;
    
    const structuredTree = useMemo(() => {
        if (!equipmentTree) return [];

        return equipmentTree.map(vessel => {
            const structuredChildren = SECTIONS.map(section => {
                const systemsForSection = SYSTEMS[section.prefix] || [];
                
                const systemNodes = systemsForSection.map(sys => ({
                    id: `${vessel.id}-${section.prefix}-${sys.prefix}`,
                    type: 'system',
                    name: sys.name,
                    prefix: sys.prefix,
                    status: 'active',
                    children: [] 
                }));

                return {
                    id: `${vessel.id}-${section.prefix}`,
                    type: 'section',
                    name: section.name,
                    prefix: section.prefix,
                    status: 'active',
                    children: systemNodes
                };
            });

            const uncategorizedNode = {
                id: `${vessel.id}-OUTROS`,
                type: 'section',
                name: 'Não Categorizados / Outros',
                prefix: 'OUTROS',
                status: 'inactive',
                children: []
            };

            if (vessel.children && vessel.children.length > 0) {
                vessel.children.forEach(equipment => {
                    let placed = false;
                    
                    if (equipment.tag) {
                        const parts = equipment.tag.split('-'); 
                        
                        if (parts.length >= 3) {
                            const sectionPrefix = parts[1]; 
                            const systemPrefix = parts[2];  

                            const sectionNode = structuredChildren.find(s => s.prefix === sectionPrefix);
                            if (sectionNode) {
                                const systemNode = sectionNode.children.find(sys => sys.prefix === systemPrefix);
                                if (systemNode) {
                                    systemNode.children.push(equipment);
                                    placed = true;
                                }
                            }
                        }
                    }

                    if (!placed) {
                        uncategorizedNode.children.push(equipment);
                    }
                });
            }

            if (uncategorizedNode.children.length > 0) {
                structuredChildren.push(uncategorizedNode);
            }

            return {
                ...vessel,
                children: structuredChildren
            };
        });
    }, [equipmentTree]);

    const [selectedNode, setSelectedNode] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const allowedRoles = ['intern', 'coordinator', 'engineer', 'dev'];
    const hasPermission = auth?.user && allowedRoles.includes(auth.user.role);

    // Esconde os botões se for uma seção (virtual) ou embarcação
    const canEditOrDelete = hasPermission && selectedNode && !['section', 'vessel'].includes(selectedNode.type);

    useEffect(() => {
        if (structuredTree && structuredTree.length > 0 && !selectedNode) {
            setSelectedNode(structuredTree[0]);
            setExpandedNodes(new Set([structuredTree[0].id]));
        }
    }, [structuredTree, selectedNode]);

    const toggleNode = (nodeId) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeId)) newExpanded.delete(nodeId);
        else newExpanded.add(nodeId);
        setExpandedNodes(newExpanded);
    };
    
    const renderStatus = (status) => {
        if (!status) return null;
        if (status === 'active') return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Operacional</span>;
        if (status === 'inactive') return <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500"></span>Inativo / Atenção</span>;
        if (status === 'in_maintenance') return <span className="inline-flex items-center rounded-md bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-400 ring-1 ring-inset ring-orange-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>Em Manutenção</span>;
        if (status === 'decommissioned') return <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>Descomissionado</span>;
        return <span className="text-slate-400">{status}</span>;
    };

    const renderCriticality = (criticality) => {
        if (!criticality) return null;
        if (criticality === 'A') return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Classe A</span>;
        if (criticality === 'B') return <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500"></span>Classe B</span>;
        if (criticality === 'C') return <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>Classe C</span>;
        return <span className="text-slate-400">{criticality}</span>;
    };


    console.log("item",selectedNode);
    return (
        <SIGMANLayout>
            <Head title="Árvore de Equipamentos | SIGMAN" />

            <CreateNodeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} selectedParent={selectedNode} />
            <EditNodeModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} nodeData={selectedNode} />
            <DeleteNodeModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} nodeData={selectedNode} />
                
            <div className="flex h-full flex-col space-y-4">
                
                <div className="flex shrink-0 items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white">Árvore de Equipamentos</h2>
                        <p className="text-xs text-slate-400">Navegue pela hierarquia de componentes da frota.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <input type="text" placeholder="Buscar equipamento, TAG..." className="w-64 rounded-md border-slate-700 bg-slate-900 py-1.5 pl-3 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                        >
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Adicionar Nó
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
                    
                    {/* ESQUERDA: Árvore */}
                    <div className="lg:w-1/3 flex flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md">
                        <div className="border-b border-slate-700/50 bg-slate-900/50 px-4 py-3">
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Estrutura Hierárquica</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {structuredTree.map(node => (
                                <TreeNode key={node.id} node={node} selectedNode={selectedNode} onSelect={setSelectedNode} toggleNode={toggleNode} expandedNodes={expandedNodes} />
                            ))}
                        </div>
                    </div>

                    {/* DIREITA: Detalhes */}
                    <div className="lg:w-2/3 flex flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md">
                        {selectedNode ? (
                            <>
                                <div className="border-b border-slate-700/50 bg-slate-900/50 p-6 flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                                                {selectedNode.type === 'vessel' ? 'Embarcação' : selectedNode.type === 'section' ? 'Seção' : selectedNode.type === 'system' ? 'Sistema' : selectedNode.type === 'equipment' ? 'Equipamento' : 'Componente'}
                                            </span>
                                            {selectedNode.tag && <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300 ring-1 ring-slate-700">{selectedNode.tag}</span>}
                                        </div>
                                        <h3 className="text-2xl font-bold text-white">{selectedNode.name}</h3>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        {renderStatus(selectedNode.status)}
                                        
                                        {canEditOrDelete && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <button 
                                                    onClick={() => setIsEditModalOpen(true)}
                                                    className="flex items-center rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white ring-1 ring-inset ring-slate-700"
                                                >
                                                    <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    Editar
                                                </button>
                                                
                                                <button 
                                                    onClick={() => setIsDeleteModalOpen(true)}
                                                    className="flex items-center rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300 ring-1 ring-inset ring-red-500/20"
                                                >
                                                    <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    Excluir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                    <h4 className="text-sm font-semibold text-white mb-4 border-b border-slate-800 pb-2">Especificações Técnicas</h4>
                                    
                                    {['equipment', 'component'].includes(selectedNode.type) ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
                                            <div className="bg-slate-900/50 p-4 rounded-lg ring-1 ring-slate-800 col-span-1 sm:col-span-2">
                                                <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Número de Série (S/N)</span>
                                                <span className="text-sm font-medium text-slate-200 font-mono tracking-wider">
                                                    {selectedNode.series_number || 'Não especificado'}
                                                </span>
                                            </div>

                                            <div className="bg-slate-900/50 p-4 rounded-lg ring-1 ring-slate-800">
                                                <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Marca / Fabricante</span>
                                                <span className="text-sm font-medium text-slate-200">{selectedNode.manufacturer || 'Não especificado'}</span>
                                            </div>
                                            <div className="bg-slate-900/50 p-4 rounded-lg ring-1 ring-slate-800">
                                                <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Modelo</span>
                                                <span className="text-sm font-medium text-slate-200">{selectedNode.model || 'Não especificado'}</span>
                                            </div>
                                            <div className="bg-slate-900/50 p-4 rounded-lg ring-1 ring-slate-800">
                                                <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Criticidade</span>
                                                <span className="text-sm font-medium text-slate-200">{renderCriticality(selectedNode.criticality) || 'Não especificado'}</span>
                                            </div>
                                            <div className="bg-slate-900/50 p-4 rounded-lg ring-1 ring-slate-800">
                                                <span className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Última Inspeção</span>
                                                {/* Puxa a data do banco ou mostra Sem Registro */}
                                                <span className="text-sm font-medium text-slate-200">{selectedNode.last_inspection || 'Sem registro'}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-8 p-4 bg-slate-900/30 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-center">
                                            <p className="text-sm text-slate-500">Detalhes de fabricação e modelo se aplicam apenas a equipamentos específicos.</p>
                                        </div>
                                    )}

                                    <h4 className="text-sm font-semibold text-white mb-4 border-b border-slate-800 pb-2">Ordens de Serviço Relacionadas</h4>
                                    
                                    {/* Ocultado provisoriamente porque o módulo de OS ainda não existe */}
                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-900/30 rounded-lg border border-dashed border-slate-700">
                                        <svg className="h-10 w-10 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="text-sm text-slate-400">Nenhuma OS encontrada.</p>
                                    </div>

                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center p-6 text-center">
                                <div>
                                    <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                                    <h3 className="text-sm font-medium text-slate-300">Nenhum item selecionado</h3>
                                    <p className="text-xs text-slate-500 mt-1">Clique em um nó na árvore ao lado para visualizar os detalhes.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SIGMANLayout>
    );
}
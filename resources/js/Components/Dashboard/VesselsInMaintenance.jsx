export default function VesselsInMaintenance() {
    return (
        <div className="col-span-1 flex flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
                <h3 className="text-base font-semibold text-white">Embarcações em Manutenção</h3>
            </div>
            <ul className="flex-1 divide-y divide-slate-800 overflow-y-auto">
                {[
                    { name: 'Atlântico Sul', task: 'Docagem' },
                    { name: 'Ciências do Mar', task: 'Sistema Elétrico' },
                    { name: 'Lancha Larus', task: 'Reparos no Motor' },
                ].map((vessel, index) => (
                    <li key={index} className="cursor-pointer px-6 py-4 transition hover:bg-slate-800/50">
                        <div className="flex items-center">
                            <div className="mr-4 rounded bg-slate-800 p-2 text-slate-400">🚢</div>
                            <div>
                                <p className="text-sm font-bold text-white">{vessel.name}</p>
                                <p className="text-xs text-slate-400">{vessel.task}</p>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
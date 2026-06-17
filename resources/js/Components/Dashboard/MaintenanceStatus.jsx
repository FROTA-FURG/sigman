import Chart from "react-apexcharts";

export default function MaintenanceStatus() {
    const donutSeries = [52, 34, 14];

    const donutOptions = {
        chart: {
            type: 'donut',
            background: 'transparent',
            toolbar: { show: false },
            fontFamily: 'inherit',
            offsetY: -25 
        },

        labels: ['Preventiva', 'Corretiva', 'Inspeção'],

        colors: ['#3b82f6', '#22c55e', '#f97316'],

        theme: {
            mode: 'dark',
        },

        stroke: {
            show: true,
            colors: ['#0b203c'],
            width: 2,
        },

        dataLabels: {
            enabled: true,
            formatter: (val) => `${Math.round(val)}%`,
            offsetY: -0,
            style: {
                fontSize: '13px',
                fontWeight: 'bold',
                colors: ['#fff']
            }
        },

        plotOptions: {
            pie: {
                expandOnClick: false,
                offsetY: -2, // 🔥 ajuste fino vertical
                customScale: 1, // 🔥 aumenta o tamanho real
                donut: {
                    size: '55%'
                }
            }
        },

        grid: {
            padding: {
                top: 0,
                bottom: -12, // 🔥 remove espaço fantasma
                left: 0,
                right: 0
            }
        },

        legend: {
            position: 'right',
            offsetY: 0,
            fontSize: '13px',
            itemMargin: { vertical: 6 },
            markers: { width: 10, height: 10 }
        },

        tooltip: {
            y: {
                formatter: (val) => `${val}%`
            }
        },

        responsive: [
            {
                breakpoint: 1536,
                options: {
                    chart: {
                        height: 180
                    },
                    legend: {
                        fontSize: '11px'
                    },
                    dataLabels: {
                        style: { fontSize: '11px' }
                    }
                }
            }
        ]
    };

    return (
        <div className="col-span-1 flex flex-col rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md">

            {/* Header */}
            <div className="border-b border-slate-700/50 px-4 py-2 sm:px-6">
                <h3 className="text-base font-semibold text-white">
                    Status das Manutenções atuais
                </h3>
            </div>

            {/* Conteúdo */}
            <div className="flex flex-col p-4 sm:p-6">

                {/* 🔥 Gráfico SEM espaço sobrando */}
                <div className="w-full flex justify-center items-center mb-4">
                    <Chart
                        options={donutOptions}
                        series={donutSeries}
                        type="donut"
                        height={200} // 🔥 CONTROLE REAL
                        width="100%"
                    />
                </div>

                {/* KPIs */}
                <div className="space-y-5 border-t border-slate-700/50 pt-2">

                    {/* Tempo Médio */}
                    <div>
                        <div className="mb-2 flex items-end justify-between">
                            <span className="text-sm text-slate-300">
                                Tempo Médio de Reparo
                            </span>
                            <span className="text-xl font-bold text-white">
                                6.8 <span className="text-xs text-slate-400">Hrs</span>
                            </span>
                        </div>

                        <div className="h-2 w-full rounded-full bg-slate-900">
                            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-blue-700 to-blue-400"></div>
                        </div>
                    </div>

                    {/* Custo Médio */}
                    <div>
                        <div className="mb-2 flex items-end justify-between">
                            <span className="text-sm text-slate-300">
                                Custo Médio por Serviço
                            </span>
                            <span className="text-lg font-bold text-white">
                                R$ 7.200
                            </span>
                        </div>

                        <div className="h-2 w-full rounded-full bg-slate-900">
                            <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
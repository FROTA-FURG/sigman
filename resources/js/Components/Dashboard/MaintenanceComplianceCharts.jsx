import React from 'react';
import Chart from 'react-apexcharts';

export default function MaintenanceComplianceCharts() {
    
    // Categorias do Eixo X (Meses)
    const monthsCategories = ['Janeiro', 'Fevereiro', 'Março', 'Abril'];

    // Juntamos os dois planos em uma única série de dados
    const complianceSeries = [
        {
            name: 'Plano Preventivo',
            data: [92, 91, 100, 83]
        },
        {
            name: 'Plano Preditivo',
            data: [100, 100, 100, 67]
        }
    ];

    // Configuração moderna do gráfico unificado
    const chartOptions = {
        chart: {
            type: 'bar',
            background: 'transparent',
            toolbar: { show: false },
            fontFamily: 'inherit',
            foreColor: '#94a3b8' // Cor base dos textos (slate-400)
        },
        theme: {
            mode: 'dark'
        },
        // Cores modernas: Azul Ciano e Laranja Vibrante
        colors: ['#38bdf8', '#fb923c'], 
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%', // Ajusta a grossura das barras juntas
                borderRadius: 4,
                borderRadiusApplication: 'end', // Arredonda só o topo
                dataLabels: {
                    position: 'top', // Coloca os labels no topo das barras
                },
            },
        },
        // Rótulos de dados (As porcentagens no topo de cada barra)
        dataLabels: {
            enabled: true,
            formatter: (val) => val + '%',
            offsetY: -20,
            style: {
                fontSize: '11px',
                fontWeight: 'bold',
                colors: ['#ffffff']
            },
            dropShadow: {
                enabled: true,
                blur: 1,
                opacity: 0.8
            }
        },
        // Cria um pequeno espaço invisível entre a barra azul e a laranja
        stroke: {
            show: true,
            width: 3,
            colors: ['transparent']
        },
        xaxis: {
            categories: monthsCategories,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: {
                    fontSize: '12px',
                    fontWeight: 500,
                }
            }
        },
        yaxis: {
            min: 0,
            max: 100,
            tickAmount: 4, // Cria as linhas: 0, 25, 50, 75, 100
            labels: {
                formatter: (val) => val + '%',
                style: {
                    fontSize: '11px',
                }
            }
        },
        // Legenda interativa no topo
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            offsetY: 0,
            markers: {
                radius: 12, // Bolinhas arredondadas na legenda
            },
            itemMargin: {
                horizontal: 10,
                vertical: 0
            }
        },
        grid: {
            borderColor: '#1e293b', // slate-800
            strokeDashArray: 4, // Linhas tracejadas elegantes
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 10
            }
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: (val) => val + '%'
            }
        }
    };

    return (
        // Utilizamos flex, h-full e min-h-0 para ele se adaptar ao layout sem scroll
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition hover:ring-blue-500/50">
            
            <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 px-6 py-2">
                <h3 className="text-base font-semibold text-white">Cumprimento dos Planos de Manutenção</h3>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Preventivo vs Preditivo</span>
            </div>
            
            {/* O container interno também deve ser flex e ter min-h-0 */}
            <div className="flex-1 min-h-0 p-4 pb-2">
                <div className="h-full w-full">
                    <Chart
                        options={chartOptions}
                        series={complianceSeries}
                        type="bar"
                        height="100%"
                        width="100%"
                    />
                </div>
            </div>
            
        </div>
    );
}
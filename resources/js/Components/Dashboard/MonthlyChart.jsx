import React from 'react';
import Chart from 'react-apexcharts';

export default function MonthlyChart() {
    // Logic: Sample Internal Data (Matching image trend)
    const monthlySeries = [
        {
            name: 'Faturamento',
            data: [100000, 40000, 42000, 12000] // Jan, Fev, Mar, Abr
        },
        {
            name: 'Custo de Manutenção',
            data: [100000, 45000, 54000, 12000] // Jan, Fev, Mar, Abr
        }
    ];

    // ApexCharts Configurations
    const monthlyOptions = {
        chart: {
            type: 'bar',
            background: 'transparent',
            toolbar: { show: false },
            fontFamily: 'inherit',
            foreColor: '#94a3b8' // slate-400 for axis labels
        },
        theme: {
            mode: 'dark'
        },
        // Using Slate Gray for Revenue and Vibrant Blue for Cost
        colors: ['#64748b', '#3b82f6'], 
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '60%',
                borderRadius: 4,
                borderRadiusApplication: 'end', // Rounds only the top of bars
            },
        },
        stroke: {
            show: true,
            width: 3,
            colors: ['transparent'] // Separates grouped bars
        },
        
        // Data labels enabled on top of bars (like reference image)
        dataLabels: {
            enabled: true,
            formatter: (val) => (val / 1000) + ' Mil', // Format values as 'Mil'
            style: {
                fontSize: '11px',
                fontWeight: 'bold',
                colors: ['#ffffff'] // White text
            },
            dropShadow: {
                enabled: true,
                blur: 1,
                opacity: 0.5
            }
        },
        
        xaxis: {
            categories: ['Janeiro', 'Fevereiro', 'Março', 'Abril'],
            labels: {
                style: {
                    fontSize: '13px',
                }
            }
        },
        yaxis: {
            labels: {
                // Formatting Y-axis to match 'Mil' labels
                formatter: (val) => (val / 1000) + ' Mil',
                style: {
                    fontSize: '10px',
                }
            },
            title: {
                // text: 'Soma de Faturamento e Custo de...',
                style: {
                    color: '#94a3b8',
                    fontWeight: 500,
                    fontSize: '11px'
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            labels: {
                colors: '#f1f5f9' // slate-100 for legend text
            },
            markers: {
                width: 10,
                height: 10,
                radius: 12
            }
        },
        tooltip: {
            y: {
                // Currency formatting in tooltip hover
                formatter: (val) => 'R$ ' + val.toLocaleString()
            }
        },
        grid: {
            borderColor: '#334155', // slate-700 grid lines
            strokeDashArray: 4, // Dashed lines
        }
    };

    return (
        // Mantemos min-w-0, mas o segredo está no bloco de baixo
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition hover:ring-blue-500/50">
            
            <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 px-4 py-2 sm:px-6">
                <h3 className="text-base font-semibold text-white">
                   Faturamento X Custo de Manutenção
                </h3>
            </div>
            
            <div className="block w-full max-w-full p-2 sm:p-4 pl-0">
                <Chart
                    options={monthlyOptions}
                    series={monthlySeries}
                    type="bar"
                    height={280}
                    width="100%"
                />
            </div>

        </div>
    );
}
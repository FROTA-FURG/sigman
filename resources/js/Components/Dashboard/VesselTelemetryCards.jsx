import React, { useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/*
 * Cards de monitoramento da frota.
 *
 * Nome, tipo, status, health score, localização e última inspeção são dados REAIS.
 * A telemetria (motor, óleo, combustível, bateria, velocidade, rumo, horímetro,
 * GPS) ainda NÃO existe: fica zerada e o mapa avisa "Aguardando telemetria",
 * com o marcador no porto de referência da embarcação (não é posição apurada).
 * Ao integrar os sensores, basta trocar TELEMETRIA_ZERADA pela leitura real e
 * alimentar o `center` do mapa com o GPS.
 *
 * Embarcação em docagem (status Manutenção) usa o card de docagem.
 */

const FALLBACK = [
    { id: 'as', name: 'Atlântico Sul', type: 'Navio Oceanográfico', status: 'Operacional', navigation_status: 'Atracada', health_score: 92, location: 'Porto de Rio Grande' },
    { id: 'cm', name: 'Ciências do Mar 1', type: 'Navio de Ensino e Pesquisa', status: 'Atenção', navigation_status: 'Atracada', health_score: 78, location: 'Porto de Rio Grande' },
    { id: 'll', name: 'Lancha Larus', type: 'Lancha de Apoio', status: 'Manutenção', navigation_status: 'Atracada', health_score: 15, location: 'Cais de Rio Grande', last_inspection: '2023-08-20' },
];

const SEM_LEITURA = { text: 'text-slate-500', bar: 'bg-slate-600', glow: '' };

const band = (value, warn, danger, invert = false) => {
    const bad = invert ? value <= danger : value >= danger;
    const mid = invert ? value <= warn : value >= warn;
    if (bad) return { text: 'text-red-400', bar: 'bg-red-500', glow: 'shadow-[0_0_6px_#ef4444]' };
    if (mid) return { text: 'text-amber-400', bar: 'bg-amber-500', glow: 'shadow-[0_0_6px_#f59e0b]' };
    return { text: 'text-emerald-400', bar: 'bg-emerald-500', glow: 'shadow-[0_0_6px_#22c55e]' };
};

const STATUS_STYLE = {
    Operacional: { dot: 'bg-emerald-500', hex: '#22c55e', text: 'text-emerald-400', ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10', hover: 'hover:ring-emerald-500/60' },
    'Atenção':   { dot: 'bg-amber-500',   hex: '#f59e0b', text: 'text-amber-400',   ring: 'ring-amber-500/30',   bg: 'bg-amber-500/10',   hover: 'hover:ring-amber-500/60' },
    'Manutenção':{ dot: 'bg-red-500',     hex: '#ef4444', text: 'text-red-400',     ring: 'ring-red-500/30',     bg: 'bg-red-500/10',     hover: 'hover:ring-red-500/60' },
    default:     { dot: 'bg-slate-500',   hex: '#64748b', text: 'text-slate-400',   ring: 'ring-slate-600',      bg: 'bg-slate-500/10',   hover: 'hover:ring-slate-500/60' },
};

const fmtDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date) ? d : date.toLocaleDateString('pt-BR');
};

// Região por embarcação: base de coordenadas + porto + zoom do mapa.
// `sea` = ponto no oceano perto da costa (para embarcação monitorada no mar).
const REGIONS = {
    riogrande: { key: 'riogrande', label: 'Rio Grande',    latBase: -32.03, lngBase: -52.09, port: [-32.035, -52.099], zoom: 11 },
    floripa:   { key: 'floripa',   label: 'Florianópolis', latBase: -27.59, lngBase: -48.55, port: [-27.595, -48.548], sea: [-27.63, -48.37], zoom: 11 },
};
const regionOf = (vessel) => (/ci[eê]ncias do mar/i.test(vessel.name || '') ? REGIONS.floripa : REGIONS.riogrande);

/*
 * Não há sensor integrado em nenhuma embarcação da frota: motor, óleo,
 * combustível, bateria, velocidade, rumo, horímetro e GPS ficam zerados até
 * a integração existir. Antes isso era derivado do health score, o que dava
 * a um painel de parede a aparência de leitura real de sensor.
 */
const TELEMETRIA_ZERADA = {
    speed: 0,
    heading: 0,
    engineTemp: 0,
    oilPressure: 0,
    fuel: 0,
    battery: 0,
    runningHours: 0,
};

// Reajusta o tamanho do mapa depois de montar (evita tiles cinzas quando o
// container inicia com dimensão indefinida dentro do flex).
function ResizeOnMount() {
    const map = useMap();
    useEffect(() => {
        const t = setTimeout(() => map.invalidateSize(), 0);
        return () => clearTimeout(t);
    }, [map]);
    return null;
}

// Marcador da embarcação (ponto colorido por status, com halo pulsante se navegando)
function vesselIcon(hex, moving) {
    return L.divIcon({
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: `<span style="position:relative;display:block;width:16px;height:16px">
                 ${moving ? `<span class="sig-ping" style="background:${hex}"></span>` : ''}
                 <span style="position:absolute;inset:4px;border-radius:9999px;background:${hex};box-shadow:0 0 6px ${hex};border:1.5px solid #04121f"></span>
               </span>`,
    });
}

/*
 * Mapa real (Leaflet + tiles escuros do CartoDB) centrado na posição da embarcação.
 * Não-interativo (painel de parede): sem arrastar/zoom. A posição usa as coordenadas
 * reais do porto/região; quando houver GPS de verdade, basta alimentar `center`.
 */
function VesselMap({ statusStyle, center, zoom, region }) {
    return (
        <div className="relative h-full min-h-[150px] w-full overflow-hidden rounded-lg border border-slate-800">
            <MapContainer
                center={center}
                zoom={zoom}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                zoomControl={false}
                keyboard={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%', background: '#071528' }}
            >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abcd" />
                {/* Sem GPS integrado, o marcador fica no porto de referência da
                    embarcação -- não é posição apurada, e o rótulo diz isso. */}
                <Marker position={center} icon={vesselIcon(statusStyle.hex, false)} />
                <ResizeOnMount />
            </MapContainer>

            {/* Overlays */}
            <div className="absolute left-2 top-1.5 rounded bg-slate-950/70 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300 backdrop-blur-sm">
                {region.label}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-slate-950/80 py-1 text-[9px] font-medium text-slate-300 backdrop-blur-sm">
                <svg className="h-2.5 w-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Aguardando telemetria
            </div>
        </div>
    );
}

function CardShell({ vessel, ss, subtitle, children }) {
    return (
        <div className={`flex flex-col overflow-hidden rounded-xl bg-[#0b203c]/90 shadow-xl ring-1 ring-slate-800 backdrop-blur-md transition ${ss.hover}`}>
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5">
                <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-white">{vessel.name}</h3>
                    <p className="flex items-center gap-1 truncate text-[10px] text-slate-400">
                        <svg className="h-2.5 w-2.5 shrink-0 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {subtitle}
                    </p>
                </div>
                <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${ss.bg} ${ss.text} ring-1 ${ss.ring}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${ss.dot}`} />
                    {vessel.status || '—'}
                </span>
            </div>
            {children}
        </div>
    );
}

function Stat({ label, children }) {
    return (
        <div className="rounded-lg bg-slate-800/40 px-2 py-1 text-center">
            <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-xs font-bold text-white">{children}</p>
        </div>
    );
}

function Meter({ label, value, unit, pct, band }) {
    return (
        <div>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
                <span className={`text-[11px] font-bold tabular-nums ${band.text}`}>{value}<span className="ml-0.5 text-[9px] font-medium text-slate-500">{unit}</span></span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${band.bar} ${band.glow} transition-all`} style={{ width: `${pct > 0 ? Math.max(4, Math.min(100, pct)) : 0}%` }} />
            </div>
        </div>
    );
}

function TelemetryCard({ vessel, ss }) {
    const t = TELEMETRIA_ZERADA;
    const region = regionOf(vessel);
    const center = region.port;
    const speed = t.speed;

    return (
        <CardShell vessel={vessel} ss={ss} subtitle={vessel.location || vessel.navigation_status || vessel.type}>
            <div className="flex flex-1 gap-3 p-3">
                {/* ESQUERDA: telemetria empilhada */}
                <div className="flex w-1/2 min-w-0 flex-col gap-2">
                    <div className="grid grid-cols-3 gap-1.5">
                        <Stat label="Veloc.">{speed}<span className="text-[9px] text-slate-500"> kn</span></Stat>
                        <Stat label="Rumo">{t.heading}°</Stat>
                        <Stat label="Saúde"><span className={band(vessel.health_score ?? 0, 50, 30, true).text}>{vessel.health_score ?? '—'}%</span></Stat>
                    </div>
                    <div className="grid flex-1 grid-cols-2 content-center gap-x-3 gap-y-2 2xl:grid-cols-1 2xl:gap-y-3">
                        {/* Sem sensor, zero é "sem leitura", não alarme: faixa neutra em
                            vez das cores de alerta (óleo/comb./bateria em zero ficariam vermelhos). */}
                        <Meter label="Motor" value={t.engineTemp} unit="°C" pct={0} band={SEM_LEITURA} />
                        <Meter label="Óleo" value={t.oilPressure} unit="bar" pct={0} band={SEM_LEITURA} />
                        <Meter label="Comb." value={t.fuel} unit="%" pct={0} band={SEM_LEITURA} />
                        <Meter label="Bateria" value={t.battery} unit="V" pct={0} band={SEM_LEITURA} />
                    </div>
                    <div className="flex shrink-0 items-center justify-between border-t border-slate-800 pt-1.5">
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="font-semibold text-slate-300 tabular-nums">{t.runningHours.toLocaleString('pt-BR')} h</span>
                        </span>
                        <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-400" title="Nenhum sensor integrado: os valores ficam zerados até a integração">Sem telemetria</span>
                    </div>
                </div>

                {/* DIREITA: mapa real */}
                <div className="w-1/2 shrink-0">
                    <VesselMap statusStyle={ss} center={center} zoom={region.zoom} region={region} />
                </div>
            </div>
        </CardShell>
    );
}

function DockingCard({ vessel, ss }) {
    // Os dados de docagem ainda não chegam ao dashboard (existem no módulo de
    // Docagens, mas não são enviados pra esta tela). Até ligar, ficam em
    // branco -- antes eram datas e progresso inventados, fixos no código.
    const docking = { situacao: 'Em docagem', inicio: '—', previsao: '—', progresso: 0, responsavel: '—' };
    const region = regionOf(vessel);
    const center = region.port;

    return (
        <CardShell vessel={vessel} ss={ss} subtitle={vessel.location || 'Cais de Rio Grande'}>
            <div className="flex flex-1 gap-3 p-3">
                {/* ESQUERDA: dados de docagem (informados manualmente) */}
                <div className="flex w-1/2 min-w-0 flex-col gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5">
                        <div className="rounded-md bg-red-500/10 p-1.5 text-red-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-white">{docking.situacao}</p>
                            <p className="truncate text-[9px] text-slate-400">Sem telemetria — dados manuais</p>
                        </div>
                    </div>

                    <div>
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                            <span className="font-medium uppercase tracking-wide text-slate-400">Progresso</span>
                            <span className="font-bold text-red-400 tabular-nums">{docking.progresso}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" style={{ width: `${docking.progresso}%` }} />
                        </div>
                    </div>

                    <div className="grid flex-1 grid-cols-2 content-center gap-1.5 2xl:grid-cols-1">
                        <Stat label="Início">{docking.inicio}</Stat>
                        <Stat label="Previsão">{docking.previsao}</Stat>
                        <Stat label="Saúde"><span className={band(vessel.health_score ?? 0, 50, 30, true).text}>{vessel.health_score ?? '—'}%</span></Stat>
                        <Stat label="Últ. insp.">{fmtDate(vessel.last_inspection)}</Stat>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
                        <span className="flex items-center gap-1 truncate text-[10px] text-slate-400">
                            Resp. <span className="font-semibold text-slate-300">{docking.responsavel}</span>
                        </span>
                        <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-400" title="Sem telemetria durante a docagem">Manual</span>
                    </div>
                </div>

                {/* DIREITA: mapa — atracada no cais */}
                <div className="w-1/2 shrink-0">
                    <VesselMap statusStyle={ss} center={center} zoom={region.zoom} region={region} />
                </div>
            </div>
        </CardShell>
    );
}

function VesselCard({ vessel }) {
    const ss = STATUS_STYLE[vessel.status] || STATUS_STYLE.default;
    return vessel.status === 'Manutenção'
        ? <DockingCard vessel={vessel} ss={ss} />
        : <TelemetryCard vessel={vessel} ss={ss} />;
}

export default function VesselTelemetryCards({ vessels = [] }) {
    const list = vessels.length ? vessels : FALLBACK;

    return (
        <div className="flex h-full flex-col">
            <style>{`
                @keyframes sig-ping { 75%, 100% { transform: scale(2.2); opacity: 0; } }
                .sig-ping { position:absolute; inset:2px; border-radius:9999px; opacity:.55; animation: sig-ping 1.6s cubic-bezier(0,0,0.2,1) infinite; }
                .leaflet-container { font-family: inherit; background: #071528; }
            `}</style>
            {/* <div className="mb-2 flex shrink-0 items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 10l2-6h14l2 6M5 10v8a2 2 0 002 2h10a2 2 0 002-2v-8" /></svg>
                    Monitoramento da Frota
                </h3>
                <Link href={route('vessels.index')} className="text-[11px] font-medium text-sky-400 transition hover:text-sky-300">Ver todas →</Link>
            </div> */}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
                {list.map((v) => <VesselCard key={v.id} vessel={v} />)}
            </div>
        </div>
    );
}

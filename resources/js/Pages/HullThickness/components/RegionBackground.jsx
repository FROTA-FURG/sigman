import { VISAO_GERAL } from '../lib/contornos';

/*
 * Fundo de uma região no SVG: o desenho original da embarcação, ou a imagem
 * que o usuário subiu só para essa região (posicionada na moldura dela).
 * `opacidadeOriginal` (0–1) mostra o desenho antigo por cima da imagem nova,
 * para alinhar uma à outra no Mapeamento.
 *
 * Na visão geral: a folha inteira, com cada imagem trocada recortada na
 * moldura da sua região.
 */

function ImagemTrocada({ desenho, regiao, nova, id }) {
    const [x1, y1, x2, y2] = desenho.regioes[regiao].caixa;
    return (
        <>
            <clipPath id={id}><rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} /></clipPath>
            <g clipPath={`url(#${id})`}>
                <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="#fff" />
                <image href={nova.src} x={nova.x} y={nova.y} width={nova.largura} height={nova.altura} preserveAspectRatio="none" />
            </g>
        </>
    );
}

export default function RegionBackground({ desenho, regiao, imagens = {}, opacidadeOriginal = 0 }) {
    const original = <image href={desenho.imagem} x="0" y="0" width={desenho.largura} height={desenho.altura} />;

    if (regiao === VISAO_GERAL) {
        return (
            <>
                {original}
                {Object.entries(imagens).filter(([r]) => desenho.regioes[r]).map(([r, nova]) => (
                    <ImagemTrocada key={r} desenho={desenho} regiao={r} nova={nova} id={`recorte-geral-${r}`} />
                ))}
            </>
        );
    }

    const nova = imagens[regiao];
    if (!nova) return original;
    return (
        <>
            <ImagemTrocada desenho={desenho} regiao={regiao} nova={nova} id={`recorte-${regiao}`} />
            {opacidadeOriginal > 0 && <g opacity={opacidadeOriginal} className="pointer-events-none">{original}</g>}
        </>
    );
}

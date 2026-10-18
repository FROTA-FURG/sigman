/*
 * Fundo de uma região no SVG (coordenadas do quadro da região): a imagem em
 * uso, posicionada onde o usuário deixou. `anterior` + `opacidadeAnterior`
 * mostram a imagem anterior por cima, para alinhar a nova às chapas já
 * desenhadas. Sem imagem: um quadro vazio.
 */
export default function RegionBackground({ regiao, imagem, anterior = null, opacidadeAnterior = 0, idRecorte }) {
    const q = regiao.quadro;
    if (!q) return null;
    const recorte = idRecorte ?? `recorte-${regiao.id}`;

    return (
        <>
            <clipPath id={recorte}><rect x="0" y="0" width={q.largura} height={q.altura} /></clipPath>
            <g clipPath={`url(#${recorte})`}>
                <rect x="0" y="0" width={q.largura} height={q.altura} fill="#fff" />
                {imagem && <image href={imagem.url ?? imagem.src} x={imagem.x} y={imagem.y} width={imagem.largura} height={imagem.altura} preserveAspectRatio="none" />}
                {anterior && opacidadeAnterior > 0 && (
                    <image href={anterior.url} x={anterior.x} y={anterior.y} width={anterior.largura} height={anterior.altura}
                           preserveAspectRatio="none" opacity={opacidadeAnterior} className="pointer-events-none" />
                )}
            </g>
        </>
    );
}

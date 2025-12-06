<script lang="ts">
    type maptile = {
        url: string;
        x: number;
        y: number;
        k: number;
    }
    import { geoMercator, geoPath } from "d3-geo";
    import * as turf from '@turf/turf';
    import { tile } from "d3-tile";
    import {PUBLIC_MAPTILER} from '$env/static/public';
    let { features, center, width, height, focus, topInset = 0 } = $props();
    const zoomLevel = 15;
    const tileURL = (x: number, y: number, z: number) => `https://api.maptiler.com/maps/backdrop-dark/${z}/${x}/${y}.png?key=${PUBLIC_MAPTILER}`
    let mapped = $state<maptile[]>([]);
    let paths = $state<any[]>([]);
    const initScale = Math.pow(2, zoomLevel) / (2 * Math.PI);
    let initTranslate = $derived([width / 2, height / 2]  as [number, number]);
    let projection = $derived(geoMercator()
                    .center(center)
                    .scale(initScale)
                    .translate(initTranslate));
    let pathGen = $derived(geoPath(projection));
    $effect(() => {
        if (focus) {
            const focusFeature = features.find((f: any) => f.properties.wiki_and_media.wikidata === focus);
            if (focusFeature) {
                paths = [focusFeature]
            } else if (typeof focus === "object") {
                const lineData = {
                    type: "LineString" as const,
                    coordinates: [
                        center,
                        focus.geometry.coordinates
                    ]
                };
                paths = [turf.feature(lineData as any)];
            } else {
                paths = features;
            }
        } else {
            paths = features;
        }
    })
    $effect(()=> {
        if (paths.length === 1) {
            // Compute a responsive bbox so the single-path feature is centered
            // on smaller viewports (leave extra top padding for UI overlays).
            const sidePadding = Math.max(12, width * 0.06);
            // include the measured bottom of the flipped card (topInset)
            const topPadding = Math.max(40, height * 0.10, (topInset || 0) + 12);
            const bottomPadding = Math.max(32, height * 0.08);
            const bbox: [[number, number],[number, number]] = [
                [sidePadding, topPadding],
                [width - sidePadding, height - bottomPadding]
            ];
            projection = geoMercator()
                .fitExtent(bbox, turf.featureCollection(paths as any));
        } else {
            projection = geoMercator()
                .center(center)
                .scale(initScale)
                .translate(initTranslate);
        }
    })
    $effect(() => {
        const tiler = tile()
            .tileSize(512)
            .size([width, height])
            .translate(projection([0,0]))
            .scale(projection.scale() * 2 * Math.PI);
        const tiles = tiler();
        mapped = tiles.map((tile: [number, number, number], i: number, t: {translate: [number, number], scale: number}) => {
            const [x, y, z] = tile;
            const {translate: [tx, ty], scale: k} = t;
            return {
                url: tileURL(x, y, z),
                x: Math.round((x + tx) * k),
                y: Math.round((y + ty) * k),
                k: k
            }
        })
    })
</script>

<svg {width} {height}>
    <g id="tileLayer">
        {#each mapped as maptile}
            <image
                xlink:href={maptile.url}
                x={maptile.x}
                y={maptile.y}
                width={maptile.k}
                height={maptile.k} 
            />            
        {/each}
    </g>
    <g id="pathLayer">
        {#each paths as pt}
            {@const fill = paths.length === 1 && pt.geometry.type !== "LineString" ? "#63bc0044" : "none"}
            <path 
                fill={fill}
                stroke="#63bc00"
                stroke-width="2"
                d={pathGen(pt)}
            />            
        {/each}
    </g>
</svg>
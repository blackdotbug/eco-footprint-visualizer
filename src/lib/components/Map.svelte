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
    let { features, center, width, height, focus } = $props();
    const zoomLevel = 15;
    const tileURL = (x, y, z) => `https://api.maptiler.com/maps/backdrop-dark/${z}/${x}/${y}.png?key=${PUBLIC_MAPTILER}`
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
            const focusFeature = features.find(f => f.properties.wiki_and_media.wikipedia.split(":")[1] === focus);
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
            projection = geoMercator().fitExtent([[width/2 - 100,height/2 - 100],[width*.95,height*.95]], turf.featureCollection(paths as any));
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
        mapped = tiles.map(([x, y, z], i, {translate: [tx, ty], scale: k}) => {
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
            <path 
                fill="none"
                stroke="#63bc00"
                d={pathGen(pt)}
            />            
        {/each}
    </g>
</svg>
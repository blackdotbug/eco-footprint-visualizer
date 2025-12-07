<script lang="ts">
    import RangeInput from "$lib/components/RangeInput.svelte";
    import SelectInput from "$lib/components/SelectInput.svelte";
    import Card from "$lib/components/Card.svelte";
    import Map from "$lib/components/Map.svelte";
    import Jumper from "$lib/components/Jumper.svelte";
    import { updateAllCalculations } from "$lib/utils/formulas";
    import Geolocation from "svelte-geolocation";
    import { format } from "d3-format";
    import * as turf from '@turf/turf';
    import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	let { form }: PageProps = $props();
    let percent = $state(0.25);
    let people = $state(1);
    let stats = $derived(updateAllCalculations(people, percent));
    let entityProps = $state<any>([]);
    let comparisons = $state<any>([]);
    let coords = $state<[longitude: number, latitude: number]>([-1, -1]);
    let mapCenter = $state<[longitude: number, latitude: number]>([-1, -1]);
    let waiting = $state(false);
    let success = $state(false);
    let loading = $state(true);
    let mapWidth = $state(0);
    let mapHeight = $state(0);
    let coordsForm: HTMLFormElement;
    let focus = $state(undefined);
    let flippedCard = $state(undefined);
    let flippedCardBottom = $state(0);
    let showLocations = $state(false);
    let getPositionAgain = $state(false);
    let drawerTabText = $state('Choose a Location');
    $effect(() => {
        drawerTabText = (locationButton || coords.some(n => n != -1)) 
            ? 'Change Location' 
            : 'Choose a Location';
    })
    const wikidataProps = [
        {
            label: "population",
            impact: "slaughter",
            units: "number of people",
            conversion: (x: number) => x
        },{
            label: "area",
            units: "square kilometer",
            impact: "Land Use",
            conversion: (x: number) => x * 1000000
        },{
            label: "number of households",
            impact: "slaughter",
            units: "number of households",
            conversion: (x: number) => x
        },{
            label: "discharge",
            units: "cubic meters per second",
            impact: "Water Use",
            conversion: (x: number) => x
        },{
            label: "watershed area",
            units: "square kilometer",
            impact: "Land Use",
            conversion: (x: number) => x * 1000000
        },{
            label: "volume as quantity",
            units: "cubic kilometers",
            impact: "Water Use",
            conversion: (x: number) => x * 1000000000
        },{
            label: "per passenger per kilometer GHG emissions",
            units: "kg of CO2",
            impact: "GHG",
            conversion: (x: number) => x / 0.246  
        }            
    ];
    const locationButtons = [
        {label: "Sydney, Australia", coords:[151.215, -33.877]},
        {label: "Baltimore, Maryland, USA", coords:[-76.6121893, 39.2903848]},
        {label: "Vancouver, B.C., Canada", coords:[-123.1207375, 49.2827291]},
        {label: "Barcelona, Spain", coords:[2.1734035, 41.3850639]},
        {label: "Kano, Nigeria", coords:[8.533807, 11.991296]},
        {label: "Santiago, Chile", coords:[-70.6504502, -33.4377756]},
        {label: "Bangkok, Thailand", coords:[100.6224463, 13.8245796]},
        {label: "Ankara, Turkey", coords:[32.8597419, 39.9333635]}    
    ]
    let locationButton = $state<undefined | string>(undefined);
    $effect(()=>{
        if (waiting || form?.success) {
            showLocations = false;
        } else {
            showLocations = true;
        }
        // if (!getPositionAgain && (coords.every(n=>n==-1) || !!!locationButton)) {
        //     showLocations = true;
        // } else if (coords.every( n => n != -1) || locationButton) {
        //     showLocations = false;
        // }
    })
    $effect(()=> {
        if (comparisons.length > 0) {
            waiting = false;
        }
    })
    $effect(()=>{
        if (success) {
            getPositionAgain = false;
        }
    })
    $effect(()=>{
        if (coords.every( n => n != -1) || locationButton) {
            waiting = true;
            mapCenter = (coords.every( n => n != -1) ? coords : locationButtons.find(f => f.label === locationButton)?.coords) as [number, number];
            coordsForm.requestSubmit();
        }
    })
    $effect(()=>{
        if (form?.success) {
            const entities = form.locationData.flatMap((f: any) => {
                return f?.props.flatMap((m: any) => {
                    if (m && m.entity && m.value) {
                        return m;
                    } else if (m && m.children) {
                        return m.children.flatMap((c: any) => {
                            if (Array.isArray(c) && c.length && c.length > 0) {
                                return c.flatMap((e: any) => {
                                    if (Array.isArray(e) && e.length && e.length > 0) {
                                        return e.flatMap((d: any) => {
                                            if (d && d.entity && d.value) {
                                                return d;
                                            } else {
                                                return undefined;
                                            }
                                        })
                                    } else if (e && e.entity && e.value) {
                                        return e;
                                    } else {
                                        return undefined;
                                    }
                                })
                            } else if (c && c.entity && c.value) {
                                return c;
                            } else {
                                return undefined;
                            }
                        })
                    }
                    return undefined;
                })
            })
            const filtered = entities.filter(f => f);
                if (filtered.length > 0) {
                entityProps = filtered.map((m: any) => {
                    const match = wikidataProps.find((f: any) => f.label === m.label)
                    m.equivalent = match?.conversion(m.value)
                    return Object.assign(m, match)
                });
            }
        }
    })
    $effect(() => {
        if (entityProps?.length > 0) {
            comparisons = stats.map(stat => {
                const comparison = {
                    impact: stat.impact, 
                    message: {
                        prefix: "",
                        stat: "",
                        suffix: ""
                    }, 
                    entity: ""
                }
                if (stat.impact === "GHG" && form?.airport.distance) {
                    const propsGHG = wikidataProps.find((f: any) => f.impact === "GHG");
                    const equivalentGHG = propsGHG?.conversion(stat.saved) ?? 0;
                    const ratioGHG = equivalentGHG/form.airport.distance;
                    const statGHG = ratioGHG < 1 
                        ? `${format(".2p")(ratioGHG)} of a flight`
                        : ratioGHG > 1
                            ? `${format(",.0f")(ratioGHG)} flights`
                            : `a flight`
                    comparison.message.prefix = `That's enough to offset the average per passenger emissions for `;
                    comparison.message.stat = statGHG;
                    comparison.message.suffix = ` from here to ${form.airport.feature.properties.name}`;
                    comparison.entity = form.airport.feature;
                } else {
                    const measures = entityProps.filter((f: any) => {
                        return comparison.impact === f.impact
                    })
                    if (measures?.length > 0) {
                        const closestMeasure = measures.reduce((closest: any, current: any) => {
                            const currentDiff = Math.abs(current.equivalent - stat.saved);
                            const closestDiff = Math.abs(closest.equivalent - stat.saved);
                            return currentDiff < closestDiff ? current : closest;
                        });
                        comparison.entity = closestMeasure.entity;
                        const ratio = stat.saved / closestMeasure.equivalent
                        if (comparison.impact === "Land Use") {
                            comparison.message.prefix = `That's` 
                            comparison.message.stat = `${format(".2p")(ratio)} of the area` 
                            comparison.message.suffix = `of ${closestMeasure.entityLabel}.`;
                        } else if (comparison.impact === "Water Use") {
                            if (closestMeasure.label === "discharge") {
                                const ratioInfo = ratio > 60 * 61 
                                    ? {value: ratio/(60*60), units: "hours"}
                                    : ratio > 90 
                                    ? {value: ratio/60, units: "minutes"} 
                                    : {value: ratio, units: "seconds"};
                                comparison.message.prefix = `At ${
                                    format(",.0f")(closestMeasure.value)
                                    } ${closestMeasure.units} that's` 
                                comparison.message.stat = `${
                                    format(ratio > 1 ? ",.0f" : ".2f")(ratioInfo.value)
                                    } ${ratioInfo.units} of water` 
                                comparison.message.suffix = `through the ${
                                    closestMeasure.entityLabel}.`
                            }
                        } else if (comparison.impact === 'slaughter') {
                            const messageStat = ratio < 1
                                ? `${format(".2p")(ratio)} of the ${closestMeasure.units}`
                                : ratio > 1
                                    ? `${format(".1f")(ratio)} times the ${closestMeasure.units}` 
                                    : `the ${closestMeasure.units}` 
                            comparison.message.prefix = `That's`;
                            comparison.message.stat = messageStat;
                            comparison.message.suffix = `in ${closestMeasure.entityLabel}.`;
                        }
                    }
                }
                return comparison;
            })
        }
    })

    // measure the bottom of the flipped card so the map can inset accordingly
    $effect(() => {
        // run after DOM updates
        const el = document.querySelector('.top-card') as HTMLElement | null;
        if (el) {
            const r = el.getBoundingClientRect();
            flippedCardBottom = Math.round(r.bottom);
        } else {
            flippedCardBottom = 0;
        }
    })
    // $effect(()=>{
    //     if (!showLocations && (form === null || (!getPositionAgain && !loading && success) )) {
    //         waiting = true;
    //     } else {
    //         waiting = false;
    //     }
    // })
</script>
<!-- {@debug form, locationButton, coords} -->
<Geolocation 
    getPosition={getPositionAgain}
    bind:coords 
    bind:success 
    bind:loading 
    options={{maximumAge: 60 * 60 * 1000}} 
/>

<div id="overlay">
    <header>
        <img src="./logo-correct.png" alt="Eco Game Changers logo"  />
        <div id="header-text">
            <h1>What can one person do?</h1>
            <h2>Tap into your spheres of influence and see your efforts multiply!</h2>
            <div id="inputs">
                <SelectInput bind:value={people} />
                <div id="range-container">
                    <label for="percent-range">
                        Plant-based Shift: {Math.round(percent * 100)}%
                    </label>
                    <RangeInput id="percent-range" min="0" max="1" step="0.05" bind:value={percent}/>
                </div>
            </div>
        </div>
    </header>
    <div id="buttons">
        <div id="results-container">
            {#each stats as {impact, units, saved, percentChange}}
                <div class={flippedCard && flippedCard !== impact ? 'hidden' : flippedCard === impact ? 'top-card' : ''}>
                    <Card
                        {impact}
                        {units}
                        {saved}
                        {percentChange}
                        comparison={comparisons.find((f: any) => f.impact === impact || f.impact === units)}
                        bind:focus={focus}
                        bind:flippedCard={flippedCard}
                    />
                </div>
            {/each}
        </div>
            <!-- Mobile drawer tab toggle (visible on small screens) -->
            <button id="drawer-tab-toggle" class:open={showLocations} onclick={() => showLocations = !showLocations}>
                {drawerTabText}
            </button>
        {#if showLocations}
            <div id="drawer-overlay" role="button" tabindex="0" onclick={() => showLocations = false} onkeydown={(e) => e.key === 'Escape' && (showLocations = false)}></div>
            <div id="locations-drawer" class:open={showLocations}>
                <div class="drawer-header">
                    <div class="drawer-tab-title">{drawerTabText}</div>
                    <button class="drawer-close" onclick={() => showLocations = false} aria-label="Close">✕</button>
                </div>
                <div id="locations">
                    {#each locationButtons as location}
                        <button onclick={() => {
                            locationButton = location.label
                            coords = location.coords as [number, number]
                            showLocations = false;
                        }}>
                            {location.label}
                        </button>
                    {/each}
                    <button id="locationSwitch" onclick={()=> getPositionAgain = !getPositionAgain}>
                        Choose My Location
                    </button>
                </div>
            </div>
        {:else}
            <button id="locationToggleButton" onclick={()=> {coords = [-1,-1]; showLocations = true; locationButton = undefined;}}>
                Choose Another Location
            </button>
        {/if}
    </div>
    {#if waiting}
        <div id="loading-overlay">
            <Jumper size="220" color="#63bc00" unit="px" duration="6s" pause={false} />
        </div>
    {/if}
</div>
<form hidden method="POST" use:enhance bind:this={coordsForm}>
    <input hidden value={locationButton} name="location" />
    <input hidden value={coords[0]} name="lon" />
    <input hidden value={coords[1]} name="lat" />
</form>
{#if form?.success}
    <div bind:clientHeight={mapHeight} bind:clientWidth={mapWidth} id="map">
        {#if mapHeight > 0}
            <Map
                features={form.locationData.map((m:any) => {
                    const complexity = m.feature.geometry.coordinates.flatMap((c:any) => typeof c[0] === 'number' ? c.length : c.flatMap((d:any) => typeof d[0] === 'number' ? d.length : d.flatMap((e:any) => typeof e[0] === 'number' ? e.length : 0))).length;
                    return complexity <= 3000 ? m.feature : turf.simplify(m.feature, {tolerance: 0.01, mutate: true});
                })}
                width={mapWidth}
                height={mapHeight}
                center={mapCenter}
                {focus}
                topInset={flippedCardBottom}
            />
        {/if}
    </div>
{/if}

<style>
    #overlay {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
    }
    header {
        display: flex;
        align-items: end;
        margin: 0 0 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #000;
        background-color: rgba(0, 0, 0, 0.5); /* A semi-transparent background is necessary to see the blur */
        backdrop-filter: blur(2px); /* Adjust the pixel value for desired blur intensity */
        -webkit-backdrop-filter: blur(2px); /* For broader browser compatibility */
    }
    header img {
        width: 30vw;
        margin: 30px 0 0 30px;
        max-width: 280px;
    }
    header div#header-text {
        margin: 0;
        width: 65vw;
    }
    h1 {
        font-size: clamp(20px, 10px + 2.5vw, 45px);
        text-shadow: 0.05em 0.05em .25em black;
        font-weight: 600;
        margin: 0 2rem;
    }
    h2 {
        font-size: clamp(16px, 12.8px + 0.8vw, 24px);
        font-weight: 300;
        margin: 0 2rem;
        text-shadow: 0.05em 0.05em .25em black;
    }
    #inputs {
        display: flex;
        gap: 20px;
        margin: 20px 2rem 0;
        align-items: center;
    }
    #range-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 30vw;
    }
    #loading-overlay {
        position: fixed;
        top: 50vh;
        left: 50vw;
        width: 200px;
        height: 200px;
    }
    #map {
        width: 100%;
        overflow: hidden;
        height: 100%;
        position: fixed;
        z-index: -100;
        top: 0;
        left: 0;
    }
    #buttons {
        display: flex;
        width: 100%;
        gap: 20px;
        justify-content: space-between;
    }
    #results-container {
        min-width: 300px;
        margin: 10px 0 0 20px;
        display: flex;
        flex-direction: column;
        row-gap: 28px;
        position: relative;
    }
    button#locationToggleButton {
        position: fixed;
        right: -5px;
        bottom: -5px;
        width: fit-content;
        height: fit-content;
        padding: .7em 1em;
        border-radius: 10px 0;
        font-size: unset;
        font-weight: unset;
        background-color: white;
        z-index: 900;
    }
    button#drawer-tab-toggle {
        display: none;
    }
    #locations-drawer {
        width: 60vw;
    }
    #locations {
        width: 100%;
        margin: 20px 0;
        display: flex;
        flex-wrap: wrap;
        gap: 25px;
    }
    #locations button {
        width: 45%;
        padding: .8em;
        border-radius: 10px;
        font-size: 1.05em;
        font-weight: 600;
        background-color: #bdfc75;
        cursor: pointer;
    }
    #locations button:hover {
        background-color: #63bc00;
    }
    .hidden {
        opacity: 0;
        transform: translateY(8px) scale(.98);
        pointer-events: none;
        filter: blur(0.6px);
        transition: opacity .28s ease, transform .28s ease, filter .28s ease;
    }
    div.drawer-header {
        text-align: end;
        display: block;
    }
    .drawer-tab-title {
        display: inline-block;
    }
    button.drawer-close {
        margin: 5px;
    }
    .top-card {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1003;
        width: 100%;
        transition: transform .28s ease, width .28s ease, top .28s ease;
    }
    @media screen and (max-width: 600px) {
        header {
            flex-direction: column;
            align-items: start;
            margin: 0
        }
        header div#header-text {
            width: 100vw;
        }
        header img {
            width: 45vw;
            margin: 20px 10px 0;
        }
        h1 {
            margin: 0 1rem;
        }
        h2 {
            font-size: 1.05em;
            margin: 0 1rem;
        }
        #inputs {
            margin: 10px 1rem 0;
            gap: 10px
        }
        #loading-overlay {
            display: none;
        }
        #range-container {
            min-width: unset;
            max-width: unset;
            width: 45vw;
        }
        #range-container label {
            font-size: 0.9em;
        }
        #buttons {
            flex-direction: column;
            align-items: center;
        }
        #results-container {
            width: 90%;
            margin: 10px 1rem;
            flex-direction: column;
            justify-content: center;
            row-gap: 10px;
        }
        #locations {
            width: 90%;
            margin: 20px 1rem;
            justify-content: center;
            gap: 16px;
        }
        #locations button {
            width: 100%;
            padding: .5em;
        }
        button#locationToggleButton {
            font-size: .75em;
        }
        /* Mobile drawer overrides */
        #drawer-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 1000;
            opacity: 1;
        }
        #locations-drawer {
            position: fixed;
            left: 0;
            bottom: 0;
            width: 92%;
            max-height: 65vh;
            z-index: 1001;
            transform: translateY(100%);
            transition: transform .28s ease;
            border-top-left-radius: 12px;
            border-top-right-radius: 12px;
            background-color: #373737;
            padding: 16px;
            overflow-y: scroll;
        }
        #locations-drawer.open {
            transform: translateY(0%);
        }
        #locations-drawer .drawer-header {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 8px;
        }
        .drawer-close {
            background: transparent;
            border: none;
            font-size: 1rem;
            padding: 6px 10px;
            cursor: pointer;
        }
        /* Drawer tab visible above closed drawer */
        #drawer-tab-toggle {
            position: fixed;
            left: 50%;
            transform: translateX(-50%);
            bottom: 10px;
            z-index: 1002;
            background: #bdfc75;
            color: #063;
            padding: 10px 18px;
            border-radius: 20px;
            box-shadow: 0 6px 18px rgba(0,0,0,0.18);
            font-weight: 700;
            cursor: pointer;
            display: block;
        }
        #drawer-tab-toggle.open {
            /* hide tab when drawer open (drawer shows title) */
            display: none;
        }
        /* Title shown inside drawer header */
        .drawer-tab-title {
            flex: 1 1 auto;
            text-align: center;
            font-weight: 700;
            color: #fff;
            align-self: center;
        }
        /* Ensure the in-drawer locationSwitch button is positioned normally on mobile */
        button#locationSwitch {
            position: relative;
            right: auto;
            bottom: auto;
        }
        /* Hide the outside toggle button on small screens (we show the tab instead) */
        /* button#locationToggleButton {
            display: none;
        } */
        .top-card {
            width: 92%;
        }
    }

        /* Mobile landscape adjustments: results become a fixed left column and the map occupies the remaining space */
        /* Apply landscape layout only for narrow viewports that are sufficiently wide (min-aspect-ratio: 4/3) */
        @media screen and (max-width: 950px) and (orientation: landscape) and (min-aspect-ratio: 4/3) {
            header {
                flex-direction: row;
                align-items: center;
                gap: 12px;
                padding-top: 10px;
                margin: 0;
            }
            header img { width: auto; height: 25vh; margin: 8px; }
            h1 { margin: 0; }
            h2 { font-size: 1em; margin: 0 0 12px;}
            #inputs { margin: 0; gap: 30px; }
            #range-container label {
                font-size: .8em;
            }
            #buttons {
                width: 100%;
                display: flex;
                flex-direction: row;
                align-items: flex-start;
                gap: 8px;
                padding: 8px;
            }

            /* Make the results panel a fixed left column so the map sits reliably to the right */
            #results-container {
                position: fixed;
                left: 0;
                top: calc(25vh + 38px);
                width: 34%;
                max-width: 44%;
                height: calc(100vh - (25vh + 38px));
                overflow-y: auto;
                row-gap: 12px;
                padding: 0;
                box-sizing: border-box;
                z-index: 1004;
                margin: 0;
                flex-wrap: nowrap;
            }

            #results-container > div {
                width: 100%;
                position: relative;
            }

            /* Keep the drawer toggle accessible in landscape */
            #drawer-tab-toggle {
                left: auto;
                right: 12px;
                bottom: 12px;
                transform: none;
                z-index: 1006;
                position: absolute;
            }
            /* Hide the floating drawer tab when the drawer is open */
            #drawer-tab-toggle.open {
                display: none;
            }
            div.drawer-header {
                text-align: end;
                display: block;
            }
            .drawer-tab-title {
                display: inline-block;
            }
            button.drawer-close {
                margin: 5px;
            }
            /* Ensure the flipped top-card flows with the column layout */
            .top-card {
                position: relative;
                left: 0;
                transform: none;
                top: 0;
                width: 100%;
                z-index: 1005;
            }

            /* Map occupies the right side and fills the viewport height */
            /* #map {
                position: fixed;
                right: 0;
                top: 0;
                left: 34%;
                height: 100vh;
                z-index: -50;
            } */

            /* Right-side drawer for landscape */
            #locations-drawer {
                position: fixed;
                right: 0;
                top: 0;
                bottom: 0;
                width: 45%;
                transform: translateX(100%);
                transition: transform .28s ease;
                border-radius: 12px 0 0 12px;
                padding: 12px;
                z-index: 1001;
                overflow-y: scroll;
            }
            #locations-drawer.open {
                transform: translateX(0%);
            }
            #drawer-overlay {
                display: block;
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.35);
                z-index: 1000;
            }

            #locations {
                display: flex;
                flex-direction: column;
                gap: 12px;
                width: 90%;
                margin: 10px 0 0;
            }
            #locations button {
                width: 100%;
                padding: 0;
            }

            button#locationToggleButton {
                font-size: .75em;
            }
        }
</style>
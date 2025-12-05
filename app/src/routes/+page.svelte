<script lang="ts">
    import RangeInput from "$lib/components/RangeInput.svelte";
    import SelectInput from "$lib/components/SelectInput.svelte";
    import Card from "$lib/components/Card.svelte";
    import Map from "$lib/components/Map.svelte";
    import Jumper from "$lib/components/Jumper.svelte";
    import { updateAllCalculations } from "$lib/utils/formulas";
    import Geolocation from "svelte-geolocation";
    import { format } from "d3-format";
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
    let showLocations = $state(false);
    let getPositionAgain = $state(false);
    const wikidataProps = [
        {
            label: "population",
            impact: "animals",
            units: "number of people",
            conversion: (x) => x
        },{
            label: "area",
            units: "square kilometer",
            impact: "Land Use",
            conversion: (x) => x * 1000000
        },{
            label: "number of households",
            impact: "animals",
            units: "number of households",
            conversion: (x) => x
        },{
            label: "discharge",
            units: "cubic meters per second",
            impact: "Water Use",
            conversion: (x) => x
        },{
            label: "watershed area",
            units: "square kilometer",
            impact: "Land Use",
            conversion: (x) => x * 1000000
        },{
            label: "volume as quantity",
            units: "cubic kilometers",
            impact: "Water Use",
            conversion: (x) => x * 1000000000
        },{
            label: "per passenger per kilometer GHG emissions",
            units: "kg of CO2",
            impact: "GHG",
            conversion: (x) => x / 0.246  
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
            const entities = form.locationData.flatMap(f => {
                return f?.props.flatMap(m => {
                    if (m.entity && m.value) {
                        return m;
                    } else if (m.children) {
                        return m.children.flatMap(c => {
                            if (c.length && c.length > 0) {
                                return c.flatMap(e => {
                                    if (e.length && e.length > 0) {
                                        e.flatMap(d => {
                                            if (d.entity && d.value) {
                                                return d;
                                            } else {
                                                return undefined;
                                            }
                                        })
                                    } else if (e.entity && e.value) {
                                        return e;
                                    } else {
                                        return undefined;
                                    }
                                })
                            } else if (c.entity && c.value) {
                                return c;
                            } else {
                                return undefined;
                            }
                        })
                    }
                })
            })
            const filtered = entities.filter(f => f);
            if (filtered.length > 0) {
                entityProps = filtered.map(m => {
                    const match = wikidataProps.find(f => f.label === m.label)
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
                    impact: stat.impact 
                        ? stat.impact 
                        : stat.units, 
                    message: {
                        prefix: "",
                        stat: "",
                        suffix: ""
                    }, 
                    entity: ""
                }
                if (stat.impact === "GHG" && form?.airport.distance) {
                    const propsGHG = wikidataProps.find(f => f.impact === "GHG");
                    const equivalentGHG = propsGHG?.conversion(stat.saved);
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
                }
                const measures = entityProps.filter(f => comparison.impact === f.impact)
                if (measures?.length > 0) {
                    const closestMeasure = measures.reduce((closest, current) => {
                        const currentDiff = Math.abs(current.equivalent - stat.saved);
                        const closestDiff = Math.abs(closest.equivalent - stat.saved);
                        return currentDiff < closestDiff ? current : closest;
                    });
                    comparison.entity = closestMeasure.entity;
                    const ratio = stat.saved / closestMeasure.equivalent
                    if (comparison.impact === "Land Use") {
                        comparison.message.prefix = `That's` 
                        comparison.message.stat = `${format(".2p")(ratio)} of the area` 
                        comparison.message.suffix = `of ${closestMeasure.entity}.`;
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
                                  closestMeasure.entity}.`
                        }
                    } else if (comparison.impact === 'animals') {
                        const messageStat = ratio < 1
                            ? `${format(".2p")(ratio)} of the ${closestMeasure.units}`
                            : ratio > 1
                                ? `${format(".1f")(ratio)} times the ${closestMeasure.units}` 
                                : `the ${closestMeasure.units}` 
                        comparison.message.prefix = `That's`;
                        comparison.message.stat = messageStat;
                        comparison.message.suffix = `in ${closestMeasure.entity}.`;
                    }
                }
                return comparison;
            })
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
                        Percentage Plant-based Shift: {Math.round(percent * 100)}%
                    </label>
                    <RangeInput id="percent-range" min="0" max="1" step="0.05" bind:value={percent}/>
                </div>
            </div>
        </div>
    </header>

    <div id="buttons">
        <div id="results-container">
            {#each stats as {impact, units, saved, percentChange}}
                <Card 
                    {impact} 
                    {units} 
                    {saved} 
                    {percentChange} 
                    comparison={comparisons.find(f => f.impact === impact || f.impact === units)}
                    bind:focus={focus}
                    bind:flippedCard={flippedCard}
                />
            {/each}
        </div>
        {#if showLocations}
            <div id="locations">
                {#each locationButtons as location}
                    <button onclick={() => {
                        locationButton = location.label
                        coords = location.coords as [number, number]
                    }}>
                        {location.label}
                    </button>
                {/each}
                <button id="locationSwitch" onclick={()=> getPositionAgain = !getPositionAgain}>
                    Choose My Location
                </button>
            </div>
        {:else}
            <button id="locationSwitch" onclick={()=> {coords = [-1,-1]; showLocations = true; locationButton = undefined;}}>
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
            <Map features={form.locationData.map(m => m.feature)} width={mapWidth} height={mapHeight} center={mapCenter} {focus} />            
        {/if}
    </div>
{/if}

<style>
    #overlay {
        width: 100vw;
    }
    header {
        display: flex;
        align-items: end;
        margin: 0 0 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #000;
        background-color: rgba(255, 255, 255, 0.05); /* A semi-transparent background is necessary to see the blur */
        backdrop-filter: blur(2px); /* Adjust the pixel value for desired blur intensity */
        -webkit-backdrop-filter: blur(2px); /* For broader browser compatibility */
    }
    header img {
        height: 180px;
        margin: 30px 30px 0;
    }
    header div#header-text {
        margin: 0;
    }
    h1 {
        font-size: 3.5em;
        text-shadow: 0.05em 0.05em .25em black;
        font-weight: 600;
        margin: 0 2rem;
    }
    h2 {
        font-weight: 300;
        margin: 0 2rem;
        text-shadow: 0.05em 0.05em .25em black;
    }
    #inputs {
        display: flex;
        gap: 30px;
        margin: 30px 2rem 0;
        align-items: center;
        flex-wrap: wrap;
    }
    #range-container {
        min-width: 240px;
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
        gap: 32px;
        justify-content: space-between;
    }
    #results-container {
        width: 35%;
        margin: 30px 2rem;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        flex-wrap: wrap;
        row-gap: 32px;
    }
    button#locationSwitch, #locations button#locationSwitch {
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
    }
    #locations {
        width: 60%;
        margin: 30px 2rem;
        display: flex;
        flex-wrap: wrap;
        gap: 32px;
    }
    #locations button {
        width: 42%;
        border-radius: 10px;
        font-size: 1.2em;
        font-weight: 600;
        background-color: #bdfc75;
        cursor: pointer;
    }
    #locations button:hover {
        background-color: #63bc00;
    }
</style>
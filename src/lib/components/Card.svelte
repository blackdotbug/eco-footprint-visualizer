<script lang="ts">
    import { format } from "d3-format";
    let { impact, units, saved, percentChange, comparison, focus = $bindable(), showCardBack = $bindable(), flippedCard = $bindable() } = $props();
    const toggleShowBack = (entity:any) => {
        showCardBack = !showCardBack;
        focus = showCardBack ? entity : undefined;
        flippedCard = showCardBack ? impact : undefined;
    };
    $effect(() => {
        if (flippedCard === impact) {
            showCardBack = true;
        } else {
            showCardBack = false;
        }
    })
</script>
<button class="impact-result" 
    onclick={() => {toggleShowBack(comparison?.entity)}}
    disabled={!comparison?.message.stat}
>
    <div class="flip-box-inner" class:flip-it={showCardBack}>
        <div class="flip-box-front">
            <h3><span class="yellow">{format(",.0f")(saved)} {units}</span> {impact !== "slaughter" ? impact : ""} saved.</h3>
            <p>{percentChange.toFixed(1)}% from baseline consumption.</p>
        </div>
        <div class="flip-box-back">
            {#if comparison?.message?.stat}
                <h3>
                    {comparison.message.prefix} 
                    <span class="yellow">{comparison.message.stat}</span>
                    {comparison.message.suffix}
                </h3>
            {/if}
        </div>
    </div>
</button>

<style>
	.impact-result {
        background-color: transparent;
        border: none;
        position: relative;
        cursor: pointer;
        font-family: inherit;
        display: block;
        min-height: 85px;
        width: 100%;
        perspective: 1000px;
	}
    button:disabled .flip-box-front:hover, button:disabled .flip-box-back:hover{
        border-color: white;
        background-color: rgba(255, 255, 255, 0.025); /* A semi-transparent background is necessary to see the blur */
        cursor: default;
    }
    h3,p {
        margin: 0;
    }
    h3 {
        font-size: 1.4em;
        margin-bottom: .25em;
    }
    .yellow {
        color: #63bc00;
    }
	.flip-box-inner {
		position: relative;
		width: 100%;
		height: 100%;
		text-align: center;
		transition: transform 0.4s;
		transform-style: preserve-3d;
	}
	.flip-it {
		transform: rotateY(180deg);
	}
	.flip-box-front, .flip-box-back {
		border: 1px solid white;
		border-radius: 10px;
		padding: 20px;
        color: #fff;
		position: absolute;
        top: -45px;
		width: 90%;
		-webkit-backface-visibility: hidden; /* Safari */
		backface-visibility: hidden;
        background-color: rgba(0, 0, 0, 0.5); /* A semi-transparent background is necessary to see the blur */
        backdrop-filter: blur(2px); /* Adjust the pixel value for desired blur intensity */
        -webkit-backdrop-filter: blur(2px); /* For broader browser compatibility */
	}
    .flip-box-front:hover, .flip-box-back:hover {
        border-color: #63bc00;
        background-color: rgba(255, 255, 255, 0.25); /* A semi-transparent background is necessary to see the blur */
        transition: background-color 0.3s, border-color 0.3s;
    }
	.flip-box-back {
		transform: rotateY(180deg);
	}
    @media screen and (max-width: 600px) {
        .flip-box-back, .flip-box-front {
            padding: 10px;
            height: fit-content;
            top: -40px;
        }
    }
    @media screen and (max-width: 950px) and (orientation: landscape) and (min-aspect-ratio: 4/3) {
        .impact-result {
            height: 20vh;
            min-height: unset;
        }
        .flip-box-front, .flip-box-back {
            padding: 15px;
            top: 0;
            width: 86%;
        }
    }
</style>
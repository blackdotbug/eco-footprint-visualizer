<script lang="ts">
    let { id, min, max, step, value = $bindable() } = $props();
</script>
<input type="range" {min} {max} {step} bind:value class="slider" id="percentage-slider">

<style>
    .slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 15px;
        border-radius: 5px;  
        background: #d3d3d3;
        outline: none;
        /* opacity: 0.7; */
        -webkit-transition: .2s;
        transition: opacity .2s;
        margin-top: .5em;
    }

    .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 25px;
        height: 25px;
        border-radius: 50%; 
        background: #63bc00;
        border: 1px solid white;
        cursor: pointer;
    }

    .slider::-moz-range-thumb {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        background: #63bc00;
        border: 1px solid white;
        cursor: pointer;
    }
    @media screen and (max-width: 900px) {
        .slider {
            width: 45vw;
        }
    }
</style>
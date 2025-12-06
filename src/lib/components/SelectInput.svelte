<script lang="ts">
    let { value = $bindable() } = $props();
</script>

<select bind:value id="people-select">
    <option value={1}>Just Me</option>
    <option value={10}>Family & Friends (10)</option>
    <option value={100}>Community Group (100)</option>
    <option value={1000}>Organization (1,000)</option>
    <option value={10000}>Company (10,000)</option>
    <option value={100000}>City (100,000)</option>
    <option value={1000000}>Region (1,000,000)</option>
</select>

<style>
    select#people-select {
        font-size: 1.2em;
        padding: 5px;
        cursor: pointer;
    }
    @media screen and (max-width: 900px) {
        select#people-select {
            width: 45vw;
        }
    }
</style>
async function geolocate() {
    navigator.geolocation.getCurrentPosition(async (position) => {
        const apiKey = "b1fe0279c24e473badcfaf16cdb5a3ec";
        const geoapifyURL = "https://api.geoapify.com/v1/boundaries/part-of";
        const result = await fetch(`${geoapifyURL}?lat=${position.coords.latitude}&lon=${position.coords.longitude}&geometry=geometry_1000&apiKey=${apiKey}`);
        const data = await result.json();
        const ids = data.features.map(m => m.properties.wiki_and_media ? m.properties.wiki_and_media.wikidata : undefined).filter(f => f);
        const languages = ['en']
        const url = wdk.getEntities(ids, languages);
        const wikiResult = await fetch(url);
        const wikiData = await wikiResult.json();
        const simplified = Object.values(wikiData.entities).map(entity => {
            if (entity.missing === "") {
                return undefined
            } else {
                const popClaim = entity.claims.P1082 ? entity.claims.P1082.filter(f => f.qualifiers?.P585).sort((a,b) => {
                    const aStamp = a.qualifiers.P585[0].datavalue.value.time.replace("+", "").split("T")[0].split("-")
                    const bStamp = b.qualifiers.P585[0].datavalue.value.time.replace("+", "").split("T")[0].split("-")
                    const aDate = new Date(aStamp[0], 1 + aStamp[1], 1 + aStamp[2])
                    const bDate = new Date(bStamp[0], 1 + bStamp[1], 1 + bStamp[2])
                    return bDate.valueOf() - aDate.valueOf();
                }) : undefined
                const entry = {
                    feature: data.features.find(f => f.properties.wiki_and_media?.wikidata === entity.title),
                    population: popClaim ? wdk.simplify.propertyClaims([popClaim[0]])[0] : undefined,
                    waterArea: entity.claims.P2927 ? wdk.simplify.propertyClaims(entity.claims.P2927)[0] : undefined,
                    area: entity.claims.P2046 ? wdk.simplify.propertyClaims(entity.claims.P2046)[0] : undefined,
                    label: entity.labels.en ? entity.labels.en.value : undefined,
                }
                return entry
            }
        });
        console.log(simplified)
        const smallest = simplified.sort((a,b) => a.area - b.area)[0]
        document.getElementById("location-display").textContent = smallest.feature.properties.formatted;  
    });
}
const slider = document.getElementById("percentage-slider");
const percentageDisplay = document.getElementById("percentage-value");
const peopleInput = document.getElementById("people-select");
slider.addEventListener("change", () => {
    const percentage = slider.value;
    percentageDisplay.textContent = `${(percentage * 100).toFixed(0)}%`;
    const people = parseInt(peopleInput.value, 10);
    const results = updateAllCalculations(people, percentage);
    results.forEach(result => {
        const element = document.getElementById(`impact-${result.key}`);
        if (element) {
            element.querySelector(".total").textContent = parseInt(result.total);
            element.querySelector(".saved").textContent = parseInt(result.saved);
            element.querySelector(".baseline").textContent = parseInt(result.baseline);
            element.querySelector(".percent-change").textContent = `${result.percentChange.toFixed(2)}%`;
        }
    });
});
peopleInput.addEventListener("change", () => {
    const people = parseInt(peopleInput.value, 10);
    const percentage = slider.value;
    const results = updateAllCalculations(people, percentage);
    results.forEach(result => {
        const element = document.getElementById(`impact-${result.key}`);
        if (element) {
            element.querySelector(".total").textContent = parseInt(result.total);
            element.querySelector(".saved").textContent = parseInt(result.saved);
            element.querySelector(".baseline").textContent = parseInt(result.baseline);
            element.querySelector(".percent-change").textContent = `${result.percentChange.toFixed(2)}%`;
        }
    });
});
const resultsContainer = document.getElementById("results-container");
const people = parseInt(peopleInput.value, 10);
const percentage = slider.value;
const results = updateAllCalculations(people, percentage);
results.forEach(result => {
    resultsContainer.innerHTML += `<div id="impact-${result.key}" class="impact-result">
        <h3>${result.impact}</h3>
        <p>Total: <span class="total">${parseInt(result.total)}</span></p>
        <p>Saved: <span class="saved">${parseInt(result.saved)}</span></p>
        <p>Baseline: <span class="baseline">${parseInt(result.baseline)}</span></p>
        <p>Percent Change: <span class="percent-change">${result.percentChange.toFixed(2)}%</span></p>
    </div>`;
})

geolocate();

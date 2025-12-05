import type { Actions } from './$types';
import { VITE_GEOAPIFY } from '$env/static/private';
import { WBK, type Entities } from 'wikibase-sdk';
import { findAirport, haversineDistance } from '$lib/utils/interactivity';
import * as turf from "@turf/turf";
import type { ExtendedFeature } from 'd3-geo';
// import datasets from '$lib/data/datasets.json';

const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
})
const wikidataProps = [
    {
        label: "population",
        code: "P1082",
        qualifier: "P585",
    },{
        label: "area",
        code: "P2046",
    },{
        label: "number of households",
        code: "P1538",
    },{
        label: "located in or next to body of water",
        code: "P206",
        children: [
            {
                label: "discharge",
                code: "P2225",
            },{
                label: "volume as quantity",
                code: "P2234",
            }            
        ]
    }
]
const languages = ['en'];
function parseRetryAfter(header:string|null) {
  if (!header) return 0;
  let delay = parseFloat(header);
  if (isNaN(delay)) {
    delay = Math.max(0, new Date(header).getTime() - Date.now());
  }
  return Math.max(0, Math.round(delay * 25)); 
}
export const actions = {
	default: async ({request, fetch, setHeaders}) => {
        const fData = await request.formData();
        // if (fData.get("location")) {
        //     const dataset = datasets.find(d => d.location === fData.get("location"));
        //     const data = dataset.GeoapifyResults;
        //     const airport = dataset.PlacesResults.features[0];
        //     let cityLevelPlace = data.features.find((f:ExtendedFeature) => f.properties?.categories.includes('administrative.city_level'))?.properties
        //     if (!cityLevelPlace) {
        //         cityLevelPlace = data.features.find((f:ExtendedFeature) => f.properties?.categories.includes('administrative.district_level'))?.properties
        //     }
        //     if (!cityLevelPlace) {
        //         cityLevelPlace = data.features.find((f:ExtendedFeature) => f.properties?.categories.includes('administrative.county_level'))?.properties
        //     }
        //     const airportDistance = haversineDistance(cityLevelPlace.lat, cityLevelPlace.lon, airport.properties.lat, airport.properties.lon);
        //     const entities = dataset.WikidataResults.entities;
        //     const simplified = await Promise.all(Object.values(entities as Entities).map(async (entity) => {
        //         if (entity.claims) {
        //             return {
        //                 feature: turf.rewind(data.features.find((f:ExtendedFeature) => f.properties?.wiki_and_media?.wikidata === entity.title), {reverse: true}),
        //                 props: await Promise.all(wikidataProps.map(async (p) => {
        //                     const newP = structuredClone(p);
        //                     const claim = entity.claims[p.code];  
        //                     if (claim) {
        //                         if (p.label === "population") {
        //                             const sorted = claim.filter(f => f.qualifiers && f.qualifiers[p.qualifier][0]).sort((a,b) => {
        //                                 const aStamp = a.qualifiers[p.qualifier][0].datavalue.value.time
        //                                     .replace("+", "")
        //                                     .split("T")[0]
        //                                     .split("-");
        //                                 const bStamp = b.qualifiers[p.qualifier][0].datavalue.value.time
        //                                     .replace("+", "")
        //                                     .split("T")[0]
        //                                     .split("-");
        //                                 const aDate = new Date(aStamp[0], 1 + aStamp[1], 1 + aStamp[2])
        //                                 const bDate = new Date(bStamp[0], 1 + bStamp[1], 1 + bStamp[2])
        //                                 return bDate.valueOf() - aDate.valueOf();
        //                             });
        //                             newP.entity = entity.labels.en.value
        //                             newP.value = wdk.simplify.propertyClaims([sorted[0]])[0];
        //                         } else if (p.children && p.children.length > 0) {
        //                             const childIds = wdk.simplify.propertyClaims(claim);
        //                             newP.children = await Promise.all(childIds.flatMap(async (id) => {
        //                                 const childURL = wdk.getEntities({ids:[id], languages});
        //                                 const resultWDC = await fetch(childURL);
        //                                 const { entities: childEnts } = await resultWDC.json();        
        //                                 const childrenSimplified = Object.values(childEnts).flatMap(s => {
        //                                     if (s.claims) {
        //                                         return p.children.map((c) => {
        //                                             const newC = structuredClone(c);
        //                                             const childClaim = s.claims[c.code];
        //                                             let childValue = undefined
        //                                             if (childClaim) {
        //                                                 childValue = wdk.simplify.propertyClaims([childClaim[0]])[0];
        //                                             }
        //                                             newC.entity = s.labels.en.value;
        //                                             newC.value = childValue;
        //                                             return newC;
        //                                         })
        //                                     } else {
        //                                         return undefined;
        //                                     }                              
        //                                 });
        //                                 return childrenSimplified;
        //                             })).then(val => {
        //                                 return val.map(v => {
        //                                     return v;
        //                                 })
        //                             });
        //                         } else {
        //                             newP.entity = entity.labels.en.value
        //                             newP.value = wdk.simplify.propertyClaims(entity.claims[p.code])[0];
        //                         }
        //                     }      
        //                     return newP;
        //                 })).then(val => val)
        //             }
        //         } else {
        //             return undefined;
        //         }
        //     })).then(val => val);
        //     return { success: true, locationData: simplified, airport: {feature: airport, distance: airportDistance}};            
        // } else {
            const MAX_RETRIES = 15;
            let retries = 0;
            let delay = 0;
            let airport = undefined;
            let airportDistance = undefined;
            const geoapifyURL = `https://api.geoapify.com/v1/boundaries/part-of?lat=${fData.get("lat")}&lon=${fData.get("lon")}&geometry=geometry_1000&apiKey=${VITE_GEOAPIFY}`;
            console.log("Fetching Geoapify URL:", geoapifyURL);
            const result = await fetch(geoapifyURL);
            const data = await result.json();
            let cityLevelPlace = data.features.find((f:ExtendedFeature) => f.properties?.categories.includes('administrative.city_level'))?.properties
            if (!cityLevelPlace) {
                cityLevelPlace = data.features.find((f:ExtendedFeature) => f.properties?.categories.includes('administrative.district_level'))?.properties
            }
            if (!cityLevelPlace) {
                cityLevelPlace = data.features.find((f:ExtendedFeature) => f.properties?.categories.includes('administrative.county_level'))?.properties
            }
            if (cityLevelPlace) {
                airport = await findAirport(cityLevelPlace.lat, cityLevelPlace.lon);
            }
            if (airport) {
                airportDistance = haversineDistance(cityLevelPlace.lat, cityLevelPlace.lon, airport.properties.lat, airport.properties.lon);
            }
            const ids = data.features.map((m:ExtendedFeature) => m.properties?.wiki_and_media 
                ? m.properties.wiki_and_media.wikidata 
                : undefined).filter((f:string) => f);
            const url = wdk.getEntities({ids, languages});
            console.log("Fetching Wikidata URL:", url);
            const resultWD = await fetch(url);
            setHeaders({
                'Cache-Control': 'public, max-age=36000' // Cache for 10 hours
            });
            while (retries < MAX_RETRIES) {
                if (resultWD.ok) {
                    const { entities } = await resultWD.json();        
                    const simplified = await Promise.all(Object.values(entities as Entities).map(async (entity) => {
                        if (entity.claims) {
                            return {
                                feature: turf.rewind(data.features.find((f:ExtendedFeature) => f.properties?.wiki_and_media?.wikidata === entity.title), {reverse: true}),
                                props: await Promise.all(wikidataProps.map(async (p) => {
                                    const newP = structuredClone(p);
                                    const claim = entity.claims[p.code];  
                                    if (claim) {
                                        if (p.label === "population") {
                                            const sorted = claim.filter(f => f.qualifiers && f.qualifiers[p.qualifier][0]).sort((a,b) => {
                                                const aStamp = a.qualifiers[p.qualifier][0].datavalue.value.time
                                                    .replace("+", "")
                                                    .split("T")[0]
                                                    .split("-");
                                                const bStamp = b.qualifiers[p.qualifier][0].datavalue.value.time
                                                    .replace("+", "")
                                                    .split("T")[0]
                                                    .split("-");
                                                const aDate = new Date(aStamp[0], 1 + aStamp[1], 1 + aStamp[2])
                                                const bDate = new Date(bStamp[0], 1 + bStamp[1], 1 + bStamp[2])
                                                return bDate.valueOf() - aDate.valueOf();
                                            });
                                            newP.entity = entity.labels.en.value
                                            newP.value = wdk.simplify.propertyClaims([sorted[0]])[0];
                                        } else if (p.children && p.children.length > 0) {
                                            const childIds = wdk.simplify.propertyClaims(claim);
                                            newP.children = await Promise.all(childIds.flatMap(async (id) => {
                                                const childURL = wdk.getEntities({ids:[id], languages});
                                                console.log("Fetching child Wikidata URL:", childURL);
                                                const resultWDC = await fetch(childURL);
                                                const { entities: childEnts } = await resultWDC.json();        
                                                const childrenSimplified = Object.values(childEnts).flatMap(s => {
                                                    if (s.claims) {
                                                        return p.children.map((c) => {
                                                            const newC = structuredClone(c);
                                                            const childClaim = s.claims[c.code];
                                                            let childValue = undefined
                                                            if (childClaim) {
                                                                childValue = wdk.simplify.propertyClaims([childClaim[0]])[0];
                                                            }
                                                            newC.entity = s.labels.en.value;
                                                            newC.value = childValue;
                                                            return newC;
                                                        })
                                                    } else {
                                                        return undefined;
                                                    }                              
                                                });
                                                return childrenSimplified;
                                            })).then(val => {
                                                return val.map(v => {
                                                    return v;
                                                })
                                            });
                                        } else {
                                            newP.entity = entity.labels.en.value
                                            newP.value = wdk.simplify.propertyClaims(entity.claims[p.code])[0];
                                        }
                                    }      
                                    return newP;
                                })).then(val => val.map(v => v))
                        }} else {
                            return undefined;
                        }
                    })).then(val => val);
                    return { success: true, locationData: simplified, airport: {feature: airport, distance: airportDistance}};            
                } else if (resultWD.status === 429) {
                    const retryAfter = resultWD.headers.get('Retry-After');
                    delay = parseRetryAfter(retryAfter);
                    if (delay === 0) {
                        delay = Math.pow(2, retries) * 1000; 
                    }
                    console.log(`Received 429, waiting for ${delay}ms before retrying.`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                } else {
                    const errorData = await resultWD.json();
                    throw new Error(`API error: ${resultWD.status} ${errorData.message}`);
                }
            }
        }
    // }
} satisfies Actions;
import datasource from "$lib/data/datasource.json";

type people = number;
type percentage = number;
type foodtype = string;
type foodtypes = foodtype[];
type impact = "GHG (kg CO2e/kg)" | "Water Use (kl/kg)" | "Land Use (m2/kg)";
type impacts = {
    ghg: impact,
    water: impact,
    land: impact
}
const impacts = {
    ghg: "GHG (kg CO2e/kg)",
    water: "Water Use (kl/kg)",
    land: "Land Use (m2/kg)"
};
const foodtypes = datasource.map(item => item["Food Group"]);

const adjustedConsumption = (foodtype:foodtype, percentage:percentage) => {
    const dataSource = datasource.find(item => item["Food Group"] === foodtype);
    const adjusted = dataSource["Compensation Factor"] === -1 
        ? dataSource["Default Global Per Capita Consumption (kg/year)"] * (1 - percentage)
        : dataSource["Default Global Per Capita Consumption (kg/year)"] * (1 + percentage * dataSource["Compensation Factor"]);
    return adjusted;
};

const calcImpact = (foodtype:foodtype, impact:impact, percentage:percentage, people:people) => {
    const dataSource = datasource.find(item => item["Food Group"] === foodtype);
    const totalConsumption = adjustedConsumption(foodtype, percentage);
    if (dataSource) {
        return totalConsumption * dataSource[impact] * people;
    } else {
        return undefined;
    }
};

const calcAnimalsSlaughtered = (foodtype:foodtype, people:people, percentage:percentage) => {
    const dataSource = datasource.find(item => item["Food Group"] === foodtype);
    const totalConsumption = adjustedConsumption(foodtype, percentage);
    if (dataSource) {
        const animals = dataSource["Average Dressed Weight (kg)"] > 0 
            ? totalConsumption / dataSource["Average Dressed Weight (kg)"] * people
            : 0;
        return animals;
    } else {
        return undefined;
    }
};

const calcImpactSaved = (foodtype:foodtype, impact:impact, percentage:percentage, people:people) => {
    const dataSource = datasource.find(item => item["Food Group"] === foodtype);
    const typeImpact = calcImpact(foodtype, impact, percentage, people)
    if (dataSource) {
        return (dataSource["Default Global Per Capita Consumption (kg/year)"] * dataSource[impact] * people) - typeImpact;
    } else {
        return undefined;
    }
};

const calcAnimalsSaved = (foodtype:foodtype, people:people, percentage:percentage) => {
    const dataSource = datasource.find(item => item["Food Group"] === foodtype);
    const totalConsumption = adjustedConsumption(foodtype, percentage);
    if (dataSource) {
        const saved = dataSource["Average Dressed Weight (kg)"] > 0 
            ? (dataSource["Default Global Per Capita Consumption (kg/year)"] - totalConsumption) / dataSource["Average Dressed Weight (kg)"] * people
            : 0;
        return saved;
    } else {
        return undefined;
    }
};
const aggregateImpact = (key:impact, people:people, percentage:percentage) => {
    return foodtypes.reduce((sum, foodtype) => {
        const typeImpact = calcImpact(foodtype, key, percentage, people)
        return typeImpact ? sum + typeImpact : sum 
    }, 0);
}
const aggregateImpactSaved = (impact:impact, people:people, percentage:percentage) => {
    return foodtypes.reduce((total, foodtype) => {
        const typeImpact = calcImpactSaved(foodtype, impact, percentage, people)
        return typeImpact ? total + typeImpact : total
    }, 0);
};
const aggregateAnimalsSlaughtered = (people:people, percentage:percentage) => {
    return foodtypes.reduce((total, foodtype) => {
        const typeImpact = calcAnimalsSlaughtered(foodtype, people, percentage)
        return typeImpact ? total + typeImpact : total
    }, 0);
}
const aggregateAnimalsSaved = (people:people, percentage:percentage) => {
    return foodtypes.reduce((total, foodtype) => {
        const typeImpact = calcAnimalsSaved(foodtype, people, percentage)
        return typeImpact ? total + typeImpact : total
    }, 0);
};
const calcBaselineImpact = (impact:impact, people:people) => {
    return foodtypes.reduce((total, foodtype) => {
        const dataSource = datasource.find(item => item["Food Group"] === foodtype);    
        if (dataSource) {
            const baselineImpact = dataSource["Default Global Per Capita Consumption (kg/year)"] * dataSource[impact] * people
            return total + baselineImpact
        } else {
            return total
        }
    }, 0);
};
const calcBaselineAnimalsSlaughtered = (people:people) => {
    return foodtypes.reduce((total, foodtype) => {
        const dataSource = datasource.find(item => item["Food Group"] === foodtype);    
        if (dataSource) {
            const totalConsumption = dataSource["Default Global Per Capita Consumption (kg/year)"];
            const animals = dataSource["Average Dressed Weight (kg)"] > 0 
                ? totalConsumption / dataSource["Average Dressed Weight (kg)"] * people
                : 0;
            return total + animals;
        } else {
            return total
        }
    }, 0);
}
export const updateAllCalculations = (people:number, percentage:number) => {
    const stats = Object.entries(impacts).map(([key, impact]) => {
        const impactText = impact.replace(")", "").split("(")
        return {
            key: key,
            impact: impactText[0].trim(),
            units: impactText[1], 
            total: aggregateImpact(impact as impact, people, percentage),
            saved: aggregateImpactSaved(impact as impact, people, percentage), 
            baseline: calcBaselineImpact(impact as impact, people),
            percentChange: (((aggregateImpact(impact as impact, people, percentage)-calcBaselineImpact(impact as impact,people)) / calcBaselineImpact(impact as impact, people)) * 100)
        };
    });
    stats.push({
        key: "animals",
        impact: "slaughter", 
        units: "animals",
        total: aggregateAnimalsSlaughtered(people, percentage),
        saved: aggregateAnimalsSaved(people, percentage), 
        baseline: calcBaselineAnimalsSlaughtered(people),
        percentChange: (((aggregateAnimalsSlaughtered(people, percentage)-calcBaselineAnimalsSlaughtered(people)) / calcBaselineAnimalsSlaughtered(people)) * 100)
    });
    return stats;
};
const geojson_url = "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326"
const migration_url = "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/muutl/statfin_muutl_pxt_11a2.px"

let migrationData = {}

const fetchData = async () =>{
    const res = await fetch(geojson_url)
    const data = await res.json()

    await fetchMigrationData();

    initMap(data)
}

const fetchMigrationData = async() => {
    //Query file
    const res = await fetch("data/migration_data_query.json");
    const query = await res.json();
    
    const apiRes = await fetch (migration_url, {
        method: "POST",
        body: JSON.stringify(query),
        headers: { "Content-Type": "application/json" }
    });

    const data = await apiRes.json();

    //Resolve data
    let values = data.value;
    let municipalities = data.dimension.Alue.category.label;

    let i = 0;
    for (let key in municipalities) {
        migrationData[key] = {
            positive: values[i],
            negative: values[i + 1]
        };
        i += 2;
    }
};


const initMap = (data) =>{
    let map = L.map('map',{
        minZoom: -3
    })

    let geoJson = L.geoJSON(data,{
        onEachFeature: getFeature,
        style: getStyle,
        weight: 2
    }).addTo(map)

    let osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }).addTo(map);

    map.fitBounds(geoJson.getBounds());
}

const getFeature = (feature, layer) => {
    let name = feature.properties.nimi;  // name
    let code = "KU" + feature.properties.kunta.padStart(3, "0"); // code in query

    layer.bindTooltip(name);

    if (migrationData[code]) {
        let pos = migrationData[code].positive;
        let neg = migrationData[code].negative;

        layer.bindPopup(`
            <ul>
                <li>Municipality: ${name}</li>
                <li>Positive migration: ${pos}</li>
                <li>Negative migration: ${neg}</li>
            </ul>
        `);
    }
}

const getStyle = (feature) => {
    let code = "KU" + feature.properties.kunta.padStart(3, "0");
    let color = "hsl(0, 0%, 70%)";

    if (migrationData[code]) {
        let pos = migrationData[code].positive;
        let neg = migrationData[code].negative;

        if (neg === 0) neg = 1; // avoid divided by 0
        let hue = (pos / neg) ** 3 * 60;
        if (hue > 120) hue = 120;

        color = `hsl(${hue}, 75%, 50%)`;
    }

    return {
        color: "#555",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.6
    };
};


fetchData();
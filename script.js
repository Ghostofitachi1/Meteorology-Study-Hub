/* =========================================================
   METEOROLOGY STUDY HUB
   LIVE METEOROLOGICAL WORKSTATION
========================================================= */


const $ = (id) => document.getElementById(id);

const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

let weatherData = null;
let weatherChart = null;
let currentCoordinates = null;

let quizIndex = 0;
let quizScore = 0;


/* =========================================================
   GLOBAL HELPERS
========================================================= */

function formatNumber(value, digits = 1) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return "--";
    }

    return Number(value).toFixed(digits);
}


function windDirectionName(degrees) {
    if (degrees === null || degrees === undefined) {
        return "--";
    }

    const directions = [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSW",
        "SW",
        "WSW",
        "W",
        "WNW",
        "NW",
        "NNW"
    ];

    const index = Math.round(degrees / 22.5) % 16;

    return `${directions[index]} (${Math.round(degrees)}°)`;
}


function weatherInfo(code) {

    const data = {
        0: ["Clear sky", "☀️"],
        1: ["Mainly clear", "🌤️"],
        2: ["Partly cloudy", "⛅"],
        3: ["Overcast", "☁️"],
        45: ["Fog", "🌫️"],
        48: ["Depositing rime fog", "🌫️"],
        51: ["Light drizzle", "🌦️"],
        53: ["Moderate drizzle", "🌦️"],
        55: ["Dense drizzle", "🌧️"],
        56: ["Light freezing drizzle", "🌧️"],
        57: ["Dense freezing drizzle", "🌧️"],
        61: ["Slight rain", "🌦️"],
        63: ["Moderate rain", "🌧️"],
        65: ["Heavy rain", "🌧️"],
        66: ["Light freezing rain", "🌧️"],
        67: ["Heavy freezing rain", "🌧️"],
        71: ["Slight snow", "🌨️"],
        73: ["Moderate snow", "🌨️"],
        75: ["Heavy snow", "❄️"],
        77: ["Snow grains", "❄️"],
        80: ["Slight rain showers", "🌦️"],
        81: ["Moderate rain showers", "🌧️"],
        82: ["Violent rain showers", "⛈️"],
        85: ["Slight snow showers", "🌨️"],
        86: ["Heavy snow showers", "❄️"],
        95: ["Thunderstorm", "⛈️"],
        96: ["Thunderstorm with hail", "⛈️"],
        99: ["Thunderstorm with heavy hail", "⛈️"]
    };

    return data[code] || ["Unknown conditions", "🌍"];
}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

const sidebar = $("sidebar");
const menuButton = $("menuButton");

if (menuButton) {
    menuButton.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
}


document.querySelectorAll(".nav-link").forEach((link) => {

    link.addEventListener("click", () => {

        if (window.innerWidth <= 950) {
            sidebar.classList.remove("open");
        }

    });

});


/* =========================================================
   ACTIVE NAVIGATION
========================================================= */

const sections = document.querySelectorAll(".page-section");
const navLinks = document.querySelectorAll(".nav-link");

const navObserver = new IntersectionObserver(
    (entries) => {

        entries.forEach((entry) => {

            if (!entry.isIntersecting) {
                return;
            }

            navLinks.forEach((link) => {
                link.classList.remove("active");
            });

            const active = document.querySelector(
                `.nav-link[href="#${entry.target.id}"]`
            );

            if (active) {
                active.classList.add("active");
            }

        });

    },
    {
        threshold: 0.18
    }
);


sections.forEach((section) => {
    navObserver.observe(section);
});


/* =========================================================
   HERO
========================================================= */

$("exploreButton")?.addEventListener("click", () => {

    $("liveWeather").scrollIntoView({
        behavior: "smooth"
    });

});


/* =========================================================
   GEOCODING
========================================================= */

async function geocodeLocation(query) {

    const url =
        `${GEOCODING_API}?name=${encodeURIComponent(query)}` +
        `&count=1&language=en&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Location search failed.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error("Location not found.");
    }

    return data.results[0];
}


/* =========================================================
   WEATHER API
========================================================= */

async function fetchWeather(latitude, longitude) {

    const hourlyVariables = [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "apparent_temperature",
        "pressure_msl",
        "surface_pressure",
        "cloud_cover",
        "precipitation",
        "visibility",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "weather_code"
    ].join(",");


    const dailyVariables = [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "wind_speed_10m_max"
    ].join(",");


    const currentVariables = [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "apparent_temperature",
        "pressure_msl",
        "surface_pressure",
        "cloud_cover",
        "precipitation",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "weather_code"
    ].join(",");


    const url =
        `${API_BASE}?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=${currentVariables}` +
        `&hourly=${hourlyVariables}` +
        `&daily=${dailyVariables}` +
        `&forecast_days=7` +
        `&timezone=auto` +
        `&wind_speed_unit=kmh` +
        `&temperature_unit=celsius` +
        `&precipitation_unit=mm`;


    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Weather request failed.");
    }

    return await response.json();
}


/* =========================================================
   STATION STATUS
========================================================= */

function setStationStatus(message, type = "") {

    const status = $("stationStatus");

    status.className = `station-status ${type}`;

    status.innerHTML =
        `<span class="status-dot"></span>${message}`;

    if (type === "error") {
        status.querySelector(".status-dot").style.background =
            "var(--danger)";
    }
}


/* =========================================================
   LOAD WEATHER
========================================================= */

async function loadWeather(customCoordinates = null) {

    const query = $("locationInput").value.trim();

    if (!customCoordinates && !query) {
        setStationStatus("Enter a location first.", "error");
        return;
    }


    try {

        setStationStatus("Loading atmospheric data...", "loading");

        $("sidebarStatus").textContent = "Loading data";


        let location;


        if (customCoordinates) {

            location = customCoordinates;

        } else {

            location = await geocodeLocation(query);

        }


        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);


        currentCoordinates = {
            latitude,
            longitude
        };


        weatherData = await fetchWeather(
            latitude,
            longitude
        );


        updateStationMeta(location);

        updateCurrentWeather();

        updateHourlyForecast();

        updateDailyForecast();

        updateChart(
            $("chartVariable").value
        );

        updateStatistics(
            $("chartVariable").value
        );


        setStationStatus(
            `Weather loaded for ${location.name || "selected location"}.`,
            ""
        );


        $("sidebarStatus").textContent = "System Ready";


    } catch (error) {

        console.error(error);

        setStationStatus(
            error.message || "Unable to load weather.",
            "error"
        );

        $("sidebarStatus").textContent = "Connection error";

    }

}


/* =========================================================
   STATION META
========================================================= */

function updateStationMeta(location) {

    $("stationLocation").textContent =
        [
            location.name,
            location.admin1,
            location.country
        ]
        .filter(Boolean)
        .join(", ");


    $("stationLatitude").textContent =
        formatNumber(location.latitude, 4);


    $("stationLongitude").textContent =
        formatNumber(location.longitude, 4);


    $("stationElevation").textContent =
        `${formatNumber(
            weatherData.elevation,
            0
        )} m`;


    $("stationTimezone").textContent =
        weatherData.timezone || location.timezone || "--";

}


/* =========================================================
   CURRENT WEATHER
========================================================= */

function updateCurrentWeather() {

    const current = weatherData.current;

    if (!current) {
        return;
    }


    const info = weatherInfo(
        current.weather_code
    );


    $("weatherIcon").textContent = info[1];

    $("weatherDescription").textContent = info[0];


    $("currentTemperature").textContent =
        `${formatNumber(current.temperature_2m)}°C`;


    $("apparentTemperature").textContent =
        `${formatNumber(current.apparent_temperature)} °C`;


    $("currentHumidity").textContent =
        `${formatNumber(current.relative_humidity_2m, 0)} %`;


    $("currentDewPoint").textContent =
        `${formatNumber(current.dew_point_2m)} °C`;


    $("currentPressure").textContent =
        `${formatNumber(current.pressure_msl)} hPa`;


    $("currentWind").textContent =
        `${formatNumber(current.wind_speed_10m)} km/h`;


    $("currentWindDirection").textContent =
        windDirectionName(
            current.wind_direction_10m
        );


    $("currentCloud").textContent =
        `${formatNumber(current.cloud_cover, 0)} %`;


    $("currentRain").textContent =
        `${formatNumber(current.precipitation, 1)} mm`;


    $("weatherTime").textContent =
        `Model time: ${formatDateTime(current.time)}`;


    $("statTemperature").textContent =
        `${formatNumber(current.temperature_2m)} °C`;


    $("statHumidity").textContent =
        `${formatNumber(current.relative_humidity_2m, 0)} %`;


    $("statPressure").textContent =
        `${formatNumber(current.pressure_msl)} hPa`;


    $("statWind").textContent =
        `${formatNumber(current.wind_speed_10m)} km/h`;

}


/* =========================================================
   DATE FORMATTING
========================================================= */

function formatDateTime(value) {

    if (!value) {
        return "--";
    }

    return value
        .replace("T", " ")
        .slice(0, 16);

}


function shortTime(value) {

    if (!value) {
        return "--";
    }

    const time = value.split("T")[1];

    return time
        ? time.slice(0, 5)
        : value;

}


function shortDay(value) {

    const date = new Date(`${value}T12:00:00`);

    return date.toLocaleDateString(
        undefined,
        {
            weekday: "short"
        }
    );

}


/* =========================================================
   HOURLY FORECAST
========================================================= */

function updateHourlyForecast() {

    const container = $("hourlyForecast");

    const hourly = weatherData.hourly;

    if (!hourly) {
        return;
    }


    const currentTime = weatherData.current.time;

    let startIndex =
        hourly.time.findIndex(
            time => time >= currentTime
        );


    if (startIndex < 0) {
        startIndex = 0;
    }


    const endIndex =
        Math.min(
            startIndex + 12,
            hourly.time.length
        );


    container.innerHTML = "";


    for (
        let i = startIndex;
        i < endIndex;
        i++
    ) {

        const info =
            weatherInfo(
                hourly.weather_code[i]
            );


        const card =
            document.createElement("div");

        card.className = "hour-card";


        card.innerHTML = `
            <span>${shortTime(hourly.time[i])}</span>

            <div class="hour-icon">
                ${info[1]}
            </div>

            <strong>
                ${formatNumber(hourly.temperature_2m[i])}°
            </strong>

            <small>
                RH ${formatNumber(hourly.relative_humidity_2m[i], 0)}%
            </small>

            <small>
                ${formatNumber(hourly.wind_speed_10m[i])} km/h
            </small>
        `;


        container.appendChild(card);

    }

}


/* =========================================================
   DAILY FORECAST
========================================================= */

function updateDailyForecast() {

    const container = $("dailyForecast");

    const daily = weatherData.daily;

    if (!daily) {
        return;
    }


    container.innerHTML = "";


    for (
        let i = 0;
        i < daily.time.length;
        i++
    ) {

        const info =
            weatherInfo(
                daily.weather_code[i]
            );


        const card =
            document.createElement("div");

        card.className = "daily-card";


        card.innerHTML = `
            <span>${shortDay(daily.time[i])}</span>

            <div class="daily-icon">
                ${info[1]}
            </div>

            <div class="daily-temp">
                <b>
                    ${formatNumber(daily.temperature_2m_max[i])}°
                </b>
                /
                <small>
                    ${formatNumber(daily.temperature_2m_min[i])}°
                </small>
            </div>

            <span>
                Rain ${formatNumber(daily.precipitation_sum[i])} mm
            </span>
        `;


        container.appendChild(card);

    }

}


/* =========================================================
   CHART
========================================================= */

function chartConfig(variable) {

    const config = {

        temperature: {
            label: "Temperature",
            key: "temperature_2m",
            unit: "°C"
        },

        humidity: {
            label: "Relative Humidity",
            key: "relative_humidity_2m",
            unit: "%"
        },

        pressure: {
            label: "Pressure",
            key: "pressure_msl",
            unit: "hPa"
        },

        wind: {
            label: "Wind Speed",
            key: "wind_speed_10m",
            unit: "km/h"
        },

        cloud: {
            label: "Cloud Cover",
            key: "cloud_cover",
            unit: "%"
        }

    };


    return config[variable];

}


function updateChart(variable) {

    if (!weatherData || !weatherData.hourly) {
        return;
    }


    const config =
        chartConfig(variable);


    if (!config) {
        return;
    }


    const hourly =
        weatherData.hourly;


    const currentTime =
        weatherData.current.time;


    let startIndex =
        hourly.time.findIndex(
            time => time >= currentTime
        );


    if (startIndex < 0) {
        startIndex = 0;
    }


    const endIndex =
        Math.min(
            startIndex + 24,
            hourly.time.length
        );


    const labels =
        hourly.time
            .slice(startIndex, endIndex)
            .map(shortTime);


    const values =
        hourly[config.key]
            .slice(startIndex, endIndex);


    $("chartTitle").textContent =
        config.label;


    const ctx =
        $("weatherChart").getContext("2d");


    if (weatherChart) {
        weatherChart.destroy();
    }


    weatherChart =
        new Chart(
            ctx,
            {
                type: "line",

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                `${config.label} (${config.unit})`,

                            data: values,

                            borderColor:
                                "#22d3ee",

                            backgroundColor:
                                "rgba(34,211,238,0.10)",

                            borderWidth: 2,

                            fill: true,

                            tension: 0.35,

                            pointRadius: 2,

                            pointHoverRadius: 5
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {
                        intersect: false,
                        mode: "index"
                    },

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {
                            backgroundColor:
                                "#081321",

                            borderColor:
                                "rgba(34,211,238,0.2)",

                            borderWidth: 1
                        }

                    },

                    scales: {

                        x: {
                            grid: {
                                color:
                                    "rgba(148,163,184,0.07)"
                            },

                            ticks: {
                                color: "#8fa4ba",

                                maxTicksLimit: 12
                            }
                        },

                        y: {
                            grid: {
                                color:
                                    "rgba(148,163,184,0.07)"
                            },

                            ticks: {
                                color: "#8fa4ba"
                            }
                        }

                    }

                }

            }
        );


    updateStatistics(variable);

}


/* =========================================================
   WEATHER STATISTICS
========================================================= */

function updateStatistics(variable) {

    if (!weatherData || !weatherData.hourly) {
        return;
    }


    const config =
        chartConfig(variable);


    if (!config) {
        return;
    }


    const values =
        weatherData.hourly[config.key]
            .slice(0, 24)
            .filter(
                value =>
                    value !== null &&
                    value !== undefined
            );


    if (!values.length) {
        return;
    }


    const max =
        Math.max(...values);


    const min =
        Math.min(...values);


    const mean =
        values.reduce(
            (sum, value) => sum + value,
            0
        ) / values.length;


    const trend =
        values[values.length - 1] -
        values[0];


    $("maxValue").textContent =
        `${formatNumber(max)} ${config.unit}`;


    $("minValue").textContent =
        `${formatNumber(min)} ${config.unit}`;


    $("meanValue").textContent =
        `${formatNumber(mean)} ${config.unit}`;


    let trendText = "Stable";

    if (trend > 0.5) {
        trendText = "↑ Rising";
    } else if (trend < -0.5) {
        trendText = "↓ Falling";
    }


    $("trendValue").textContent =
        trendText;

}


/* =========================================================
   CHART EVENTS
========================================================= */

$("chartVariable")?.addEventListener(
    "change",
    (event) => {

        updateChart(
            event.target.value
        );

    }
);


/* =========================================================
   WEATHER BUTTONS
========================================================= */

$("loadWeather")?.addEventListener(
    "click",
    () => loadWeather()
);


$("refreshWeather")?.addEventListener(
    "click",
    () => loadWeather()
);


$("mobileRefresh")?.addEventListener(
    "click",
    () => {

        $("liveWeather").scrollIntoView({
            behavior: "smooth"
        });

        loadWeather();

    }
);


/* =========================================================
   GEOLOCATION
========================================================= */

async function useMyLocation() {

    if (!navigator.geolocation) {

        setStationStatus(
            "Geolocation is not supported by this browser.",
            "error"
        );

        return;
    }


    setStationStatus(
        "Requesting your location...",
        "loading"
    );


    navigator.geolocation.getCurrentPosition(

        async (position) => {

            try {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;


                const weather =
                    await fetchWeather(
                        latitude,
                        longitude
                    );


                const location = {
                    latitude,
                    longitude,
                    name: "Current Location"
                };


                weatherData = weather;

                currentCoordinates = {
                    latitude,
                    longitude
                };


                updateStationMeta(location);

                updateCurrentWeather();

                updateHourlyForecast();

                updateDailyForecast();

                updateChart(
                    $("chartVariable").value
                );

                updateStatistics(
                    $("chartVariable").value
                );


                $("locationInput").value =
                    "My current location";


                setStationStatus(
                    "Weather loaded for your current location."
                );

            } catch (error) {

                setStationStatus(
                    "Unable to load weather for your location.",
                    "error"
                );

            }

        },

        () => {

            setStationStatus(
                "Location permission was denied or unavailable.",
                "error"
            );

        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }

    );

}


$("useLocation")?.addEventListener(
    "click",
    useMyLocation
);


$("heroLocationButton")?.addEventListener(
    "click",
    useMyLocation
);


/* =========================================================
   ENTER KEY SEARCH
========================================================= */

$("locationInput")?.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {
            loadWeather();
        }

    }
);


/* =========================================================
   RELATIVE HUMIDITY CALCULATOR
========================================================= */

$("calculateRH")?.addEventListener(
    "click",
    () => {

        const e =
            Number(
                $("vapourPressure").value
            );


        const es =
            Number(
                $("saturationPressure").value
            );


        const result =
            $("rhResult");


        if (!e || !es || e <= 0 || es <= 0) {

            result.innerHTML = `
                <span>ERROR</span>
                <strong>--</strong>
                <p>
                    Enter valid positive vapour pressure values.
                </p>
            `;

            return;
        }


        if (e > es) {

            result.innerHTML = `
                <span>CHECK INPUT</span>
                <strong>--</strong>
                <p>
                    Actual vapour pressure cannot exceed
                    saturation vapour pressure for this calculation.
                </p>
            `;

            return;
        }


        const rh =
            (e / es) * 100;


        result.innerHTML = `
            <span>RELATIVE HUMIDITY</span>

            <strong>
                ${rh.toFixed(1)}%
            </strong>

            <p>
                RH = (${e} / ${es}) × 100
                = ${rh.toFixed(1)}%
            </p>
        `;

    }
);


/* =========================================================
   OBSERVATION LOG
========================================================= */

const OBSERVATION_KEY =
    "meteorologyObservations";


function getObservations() {

    try {

        return JSON.parse(
            localStorage.getItem(
                OBSERVATION_KEY
            )
        ) || [];

    } catch {

        return [];

    }

}


function saveObservations(data) {

    localStorage.setItem(
        OBSERVATION_KEY,
        JSON.stringify(data)
    );

}


function renderObservations() {

    const body =
        $("observationBody");


    const observations =
        getObservations();


    body.innerHTML = "";


    if (!observations.length) {

        body.innerHTML = `
            <tr>
                <td colspan="9">
                    No observations recorded yet.
                </td>
            </tr>
        `;

        return;
    }


    observations
        .slice()
        .reverse()
        .forEach((obs) => {

            const row =
                document.createElement("tr");


            row.innerHTML = `
                <td>${obs.time}</td>
                <td>${obs.temperature} °C</td>
                <td>${obs.pressure} hPa</td>
                <td>${obs.humidity} %</td>
                <td>${obs.windSpeed} km/h</td>
                <td>${obs.windDirection}°</td>
                <td>${obs.visibility} km</td>
                <td>${obs.rainfall} mm</td>
                <td>${obs.cloud}/8</td>
            `;


            body.appendChild(row);

        });

}


$("addObservation")?.addEventListener(
    "click",
    () => {

        const temperature =
            $("obsTemperature").value.trim();

        const pressure =
            $("obsPressure").value.trim();

        const humidity =
            $("obsHumidity").value.trim();

        const windSpeed =
            $("obsWindSpeed").value.trim();

        const windDirection =
            $("obsWindDirection").value.trim();

        const visibility =
            $("obsVisibility").value.trim();

        const rainfall =
            $("obsRainfall").value.trim();

        const cloud =
            $("obsCloud").value.trim();


        if (
            temperature === "" ||
            pressure === "" ||
            humidity === ""
        ) {

            alert(
                "Temperature, pressure and humidity are required."
            );

            return;
        }


        const rh =
            Number(humidity);

        const cloudValue =
            Number(cloud);


        if (rh < 0 || rh > 100) {

            alert(
                "Relative humidity must be between 0 and 100%."
            );

            return;
        }


        if (
            cloud !== "" &&
            (cloudValue < 0 || cloudValue > 8)
        ) {

            alert(
                "Cloud cover must be between 0 and 8 oktas."
            );

            return;
        }


        const observations =
            getObservations();


        observations.push({

            time:
                new Date().toLocaleString(),

            temperature,

            pressure,

            humidity,

            windSpeed:
                windSpeed || "--",

            windDirection:
                windDirection || "--",

            visibility:
                visibility || "--",

            rainfall:
                rainfall || "0",

            cloud:
                cloud || "--"

        });


        saveObservations(
            observations
        );


        renderObservations();


        document.querySelectorAll(
            ".observation-form input"
        ).forEach(
            input => input.value = ""
        );

    }
);


/* =========================================================
   CSV EXPORT
========================================================= */

$("exportCSV")?.addEventListener(
    "click",
    () => {

        const observations =
            getObservations();


        if (!observations.length) {

            alert(
                "There are no observations to export."
            );

            return;
        }


        const headers = [
            "Time",
            "Temperature C",
            "Pressure hPa",
            "RH %",
            "Wind Speed kmh",
            "Wind Direction",
            "Visibility km",
            "Rainfall mm",
            "Cloud Cover oktas"
        ];


        const rows =
            observations.map(
                obs => [
                    obs.time,
                    obs.temperature,
                    obs.pressure,
                    obs.humidity,
                    obs.windSpeed,
                    obs.windDirection,
                    obs.visibility,
                    obs.rainfall,
                    obs.cloud
                ]
            );


        const csv = [
            headers,
            ...rows
        ]
        .map(
            row =>
                row
                    .map(
                        value =>
                            `"${String(value).replaceAll('"', '""')}"`
                    )
                    .join(",")
        )
        .join("\n");


        const blob =
            new Blob(
                [csv],
                {
                    type: "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = url;

        link.download =
            "meteorology_observations.csv";


        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

    }
);


/* =========================================================
   METAR DECODER
========================================================= */

function decodeMetarText(raw) {

    const tokens =
        raw.trim().toUpperCase().split(/\s+/);


    const result = {

        station: tokens[0] || "--",

        time: "--",

        wind: "--",

        visibility: "--",

        cloud: "--",

        temperature: "--",

        dewPoint: "--",

        pressure: "--"

    };


    for (const token of tokens) {


        /* TIME */

        if (
            /^\d{6}Z$/.test(token)
        ) {

            result.time =
                `${token.slice(0, 2)} day, ` +
                `${token.slice(2, 4)}:${token.slice(4, 6)} UTC`;

        }


        /* WIND */

        else if (
            /^(VRB|\d{3})\d{2,3}(G\d{2,3})?KT$/.test(token)
        ) {

            if (token.startsWith("VRB")) {

                result.wind =
                    `Variable ${token.slice(3, 5)} kt`;

            } else {

                const direction =
                    token.slice(0, 3);

                const speedMatch =
                    token.match(/\d{2,3}/);

                const speed =
                    speedMatch
                        ? speedMatch[0]
                        : "--";


                const gust =
                    token.match(/G(\d{2,3})/);


                result.wind =
                    `${direction}° at ${speed} kt` +
                    (gust
                        ? `, gusting ${gust[1]} kt`
                        : "");

            }

        }


        /* VISIBILITY */

        else if (
            /^\d{4}$/.test(token)
        ) {

            result.visibility =
                `${token} m`;

        }


        /* CLOUD */

        else if (
            /^(FEW|SCT|BKN|OVC)\d{3}$/.test(token)
        ) {

            const amount =
                token.slice(0, 3);

            const height =
                Number(token.slice(3)) * 100;


            const labels = {
                FEW: "Few",
                SCT: "Scattered",
                BKN: "Broken",
                OVC: "Overcast"
            };


            result.cloud =
                `${labels[amount]}, base ${height} ft`;

        }


        /* TEMPERATURE / DEW POINT */

        else if (
            /^M?\d{2}\/M?\d{2}$/.test(token)
        ) {

            const [temp, dew] =
                token.split("/");


            result.temperature =
                `${parseTemperature(temp)} °C`;


            result.dewPoint =
                `${parseTemperature(dew)} °C`;

        }


        /* PRESSURE */

        else if (
            /^Q\d{4}$/.test(token)
        ) {

            result.pressure =
                `${token.slice(1)} hPa`;

        }

    }


    return result;

}


function parseTemperature(value) {

    if (value.startsWith("M")) {

        return -Number(
            value.slice(1)
        );

    }

    return Number(value);

}


$("decodeMetar")?.addEventListener(
    "click",
    () => {

        const raw =
            $("metarInput").value.trim();


        if (!raw) {
            return;
        }


        const result =
            decodeMetarText(raw);


        $("metarResult").innerHTML = `

            <article class="metar-card">
                <span>Station</span>
                <strong>${result.station}</strong>
            </article>

            <article class="metar-card">
                <span>Observation Time</span>
                <strong>${result.time}</strong>
            </article>

            <article class="metar-card">
                <span>Wind</span>
                <strong>${result.wind}</strong>
            </article>

            <article class="metar-card">
                <span>Visibility</span>
                <strong>${result.visibility}</strong>
            </article>

            <article class="metar-card">
                <span>Cloud</span>
                <strong>${result.cloud}</strong>
            </article>

            <article class="metar-card">
                <span>Temperature</span>
                <strong>${result.temperature}</strong>
            </article>

            <article class="metar-card">
                <span>Dew Point</span>
                <strong>${result.dewPoint}</strong>
            </article>

            <article class="metar-card">
                <span>Pressure</span>
                <strong>${result.pressure}</strong>
            </article>

            <div class="metar-note">
                Decoder currently focuses on common METAR groups.
                It is intended as a study tool rather than a full
                operational METAR parser.
            </div>
        `;

    }
);


/* =========================================================
   CLOUD DATA
========================================================= */

const cloudData = {

    Cirrus: {
        family: "High cloud",
        appearance: "Thin, wispy and fibrous ice-cloud streaks.",
        altitude: "High level",
        weather: "Usually fair weather, but increasing cirrus can indicate an approaching system.",
        symbol: "☁️"
    },

    Cirrocumulus: {
        family: "High cloud",
        appearance: "Small white cloudlets arranged in ripples or rows.",
        altitude: "High level",
        weather: "Usually no significant precipitation at the surface.",
        symbol: "☁️"
    },

    Cirrostratus: {
        family: "High cloud",
        appearance: "Thin transparent veil that can produce halos around the Sun or Moon.",
        altitude: "High level",
        weather: "Often associated with an approaching warm front or large-scale system.",
        symbol: "🌥️"
    },

    Altocumulus: {
        family: "Middle cloud",
        appearance: "Rounded cloudlets or patches, larger than cirrocumulus.",
        altitude: "Middle level",
        weather: "May indicate atmospheric instability depending on structure and evolution.",
        symbol: "⛅"
    },

    Altostratus: {
        family: "Middle cloud",
        appearance: "Gray or bluish sheet that can cover much of the sky.",
        altitude: "Middle level",
        weather: "Often associated with widespread precipitation ahead of frontal systems.",
        symbol: "🌥️"
    },

    Stratocumulus: {
        family: "Low cloud",
        appearance: "Low, lumpy cloud layers or rolls with breaks.",
        altitude: "Low level",
        weather: "Usually light precipitation or mainly overcast conditions.",
        symbol: "☁️"
    },

    Stratus: {
        family: "Low cloud",
        appearance: "Uniform low gray layer resembling lifted fog.",
        altitude: "Low level",
        weather: "Can produce mist, drizzle and reduced visibility.",
        symbol: "🌫️"
    },

    Nimbostratus: {
        family: "Low / vertically extensive",
        appearance: "Thick, dark and widespread cloud layer.",
        altitude: "Usually low to middle with vertical extent",
        weather: "Associated with prolonged widespread rain or snow.",
        symbol: "🌧️"
    },

    Cumulus: {
        family: "Low cloud",
        appearance: "Detached clouds with rounded tops and relatively flat bases.",
        altitude: "Low base with possible vertical development",
        weather: "Often fair weather, though strong vertical growth can lead to showers.",
        symbol: "☁️"
    },

    Cumulonimbus: {
        family: "Vertical development",
        appearance: "Large towering cloud, often with an anvil-shaped top.",
        altitude: "Extends through multiple levels",
        weather: "Thunderstorms, heavy rain, lightning, strong winds and possible hail.",
        symbol: "⛈️"
    }

};


const cloudSelect =
    $("cloudSelect");


Object.keys(cloudData)
    .forEach(name => {

        const option =
            document.createElement("option");


        option.value = name;

        option.textContent = name;


        cloudSelect.appendChild(option);

    });


cloudSelect.addEventListener(
    "change",
    () => {

        const name =
            cloudSelect.value;


        const data =
            cloudData[name];


        if (!data) {

            $("cloudResult").innerHTML = `
                <div class="empty-state">
                    <span>☁</span>
                    <h3>Select a cloud genus</h3>
                    <p>Its characteristics will appear here.</p>
                </div>
            `;

            return;
        }


        $("cloudResult").innerHTML = `

            <div class="cloud-detail">

                <div class="cloud-symbol">
                    ${data.symbol}
                </div>

                <div>

                    <span class="section-label">
                        CLOUD GENUS
                    </span>

                    <h3>${name}</h3>

                    <p>
                        ${data.appearance}
                    </p>

                    <div class="cloud-tags">
                        <span>${data.family}</span>
                        <span>${data.altitude}</span>
                        <span>${data.weather}</span>
                    </div>

                </div>

            </div>

        `;

    }
);


/* =========================================================
   CLOUD QUIZ
========================================================= */

const quizQuestions = [

    {
        question:
            "Which cloud genus is characterised by thin, wispy and fibrous ice-cloud streaks?",

        options: [
            "Cirrus",
            "Stratus",
            "Cumulus",
            "Nimbostratus"
        ],

        answer: "Cirrus"
    },

    {
        question:
            "Which cloud genus commonly forms a widespread gray layer associated with prolonged precipitation?",

        options: [
            "Nimbostratus",
            "Cirrocumulus",
            "Cumulus",
            "Cirrus"
        ],

        answer: "Nimbostratus"
    },

    {
        question:
            "Which cloud genus is associated with thunderstorms and can develop an anvil-shaped top?",

        options: [
            "Cumulonimbus",
            "Stratus",
            "Altostratus",
            "Cirrostratus"
        ],

        answer: "Cumulonimbus"
    },

    {
        question:
            "Which cloud genus is typically a uniform low gray layer?",

        options: [
            "Stratus",
            "Cirrus",
            "Altocumulus",
            "Cumulonimbus"
        ],

        answer: "Stratus"
    },

    {
        question:
            "Which cloud genus can produce halos around the Sun or Moon?",

        options: [
            "Cirrostratus",
            "Stratocumulus",
            "Cumulus",
            "Nimbostratus"
        ],

        answer: "Cirrostratus"
    },

    {
        question:
            "Which cloud genus consists of small white cloudlets arranged in ripples or rows?",

        options: [
            "Cirrocumulus",
            "Altostratus",
            "Stratus",
            "Cumulonimbus"
        ],

        answer: "Cirrocumulus"
    },

    {
        question:
            "Which cloud genus commonly has rounded tops and relatively flat bases?",

        options: [
            "Cumulus",
            "Cirrostratus",
            "Altostratus",
            "Nimbostratus"
        ],

        answer: "Cumulus"
    },

    {
        question:
            "Which cloud genus is commonly described as low, lumpy layers or rolls?",

        options: [
            "Stratocumulus",
            "Cirrus",
            "Cirrocumulus",
            "Altostratus"
        ],

        answer: "Stratocumulus"
    },

    {
        question:
            "Which cloud genus is a middle-level gray or bluish sheet?",

        options: [
            "Altostratus",
            "Cumulus",
            "Stratus",
            "Cirrus"
        ],

        answer: "Altostratus"
    },

    {
        question:
            "Which cloud genus is commonly classified as a middle-level cloud made of rounded cloudlets or patches?",

        options: [
            "Altocumulus",
            "Cumulonimbus",
            "Stratus",
            "Cirrostratus"
        ],

        answer: "Altocumulus"
    }

];


function renderQuiz() {

    const container =
        $("cloudQuiz");


    if (
        quizIndex >= quizQuestions.length
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <span>🏆</span>

                <h3>
                    Quiz Complete
                </h3>

                <p>
                    Final score:
                    ${quizScore}/${quizQuestions.length}
                </p>

                <button
                    class="primary-button quiz-next"
                    id="restartQuiz"
                >
                    Restart quiz
                </button>

            </div>
        `;


        $("restartQuiz")
            .addEventListener(
                "click",
                () => {

                    quizIndex = 0;

                    quizScore = 0;

                    $("quizScore").textContent =
                        "0";

                    renderQuiz();

                }
            );


        return;
    }


    const question =
        quizQuestions[quizIndex];


    container.innerHTML = `

        <div class="quiz-question">
            ${quizIndex + 1}.
            ${question.question}
        </div>

        <div class="quiz-options">

            ${question.options
                .map(
                    option =>
                        `
                        <button
                            data-answer="${option}"
                        >
                            ${option}
                        </button>
                        `
                )
                .join("")}

        </div>

        <div
            class="quiz-feedback"
            id="quizFeedback"
        >
            Select an answer.
        </div>

    `;


    container
        .querySelectorAll(
            ".quiz-options button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    handleQuizAnswer(
                        button,
                        question
                    );

                }
            );

        });

}


function handleQuizAnswer(
    button,
    question
) {

    const buttons =
        document.querySelectorAll(
            ".quiz-options button"
        );


    buttons.forEach(
        item => item.disabled = true
    );


    const selected =
        button.dataset.answer;


    const correct =
        selected === question.answer;


    if (correct) {

        button.classList.add(
            "correct"
        );

        quizScore++;

        $("quizScore").textContent =
            quizScore;

    } else {

        button.classList.add(
            "wrong"
        );


        buttons.forEach(
            item => {

                if (
                    item.dataset.answer ===
                    question.answer
                ) {

                    item.classList.add(
                        "correct"
                    );

                }

            }
        );

    }


    $("quizFeedback").textContent =
        correct
            ? "Correct. Excellent atmospheric knowledge."
            : `The correct answer is ${question.answer}.`;


    const next =
        document.createElement("button");


    next.className =
        "primary-button quiz-next";


    next.textContent =
        quizIndex === quizQuestions.length - 1
            ? "Finish quiz"
            : "Next question";


    $("quizFeedback")
        .parentElement
        .appendChild(next);


    next.addEventListener(
        "click",
        () => {

            quizIndex++;

            renderQuiz();

        }
    );

}


renderQuiz();


/* =========================================================
   FORMULA HUB
========================================================= */

const formulas = [

    {
        name: "Relative Humidity",
        category: "humidity",
        label: "HUMIDITY",
        equation: "RH = (e / es) × 100",
        variables:
            "RH = relative humidity; e = actual vapour pressure; es = saturation vapour pressure.",
        units:
            "RH is expressed as %; vapour pressures are commonly expressed in hPa.",
        example:
            "If e = 15 hPa and es = 20 hPa, RH = 75%."
    },

    {
        name: "Mixing Ratio",
        category: "humidity",
        label: "HUMIDITY",
        equation: "r = εe / (p − e)",
        variables:
            "r = mixing ratio; ε ≈ 0.622; e = vapour pressure; p = total atmospheric pressure.",
        units:
            "Mixing ratio is commonly expressed as kg/kg or g/kg.",
        example:
            "Use vapour pressure and total pressure to estimate the mass of water vapour per mass of dry air."
    },

    {
        name: "Potential Temperature",
        category: "thermodynamics",
        label: "THERMODYNAMICS",
        equation: "θ = T(p₀ / p)ᵏ",
        variables:
            "θ = potential temperature; T = absolute temperature; p₀ = reference pressure; p = pressure; κ = Rd/cp.",
        units:
            "Temperature is expressed in kelvin; pressure must use consistent units.",
        example:
            "Potential temperature allows an air parcel to be compared after bringing it adiabatically to a reference pressure."
    },

    {
        name: "Dry-Air Density",
        category: "atmosphere",
        label: "ATMOSPHERE",
        equation: "ρ = p / (RdT)",
        variables:
            "ρ = air density; p = pressure; Rd = specific gas constant for dry air; T = absolute temperature.",
        units:
            "Density is kg/m³ when SI units are used.",
        example:
            "Higher pressure generally increases density, while higher absolute temperature decreases density."
    },

    {
        name: "Hydrostatic Equation",
        category: "pressure",
        label: "PRESSURE",
        equation: "dp/dz = −ρg",
        variables:
            "p = atmospheric pressure; z = height; ρ = air density; g = gravitational acceleration.",
        units:
            "Pressure varies with height; g is approximately 9.81 m/s² near Earth's surface.",
        example:
            "Pressure generally decreases with increasing altitude in a hydrostatic atmosphere."
    },

    {
        name: "Hypsometric Equation",
        category: "pressure",
        label: "PRESSURE",
        equation: "Δz = (RdTv / g) ln(p₁ / p₂)",
        variables:
            "Δz = layer thickness; Rd = dry-air gas constant; Tv = mean virtual temperature; g = gravity.",
        units:
            "Layer thickness is expressed in metres when SI units are used.",
        example:
            "The equation relates atmospheric layer thickness to pressure difference and mean virtual temperature."
    },

    {
        name: "Zonal Wind Component",
        category: "wind",
        label: "WIND",
        equation: "u = −V sin θ",
        variables:
            "u = zonal wind component; V = wind speed; θ = meteorological wind direction.",
        units:
            "Wind speed and component are commonly expressed in m/s.",
        example:
            "The sign and value depend on the meteorological wind direction convention."
    },

    {
        name: "Meridional Wind Component",
        category: "wind",
        label: "WIND",
        equation: "v = −V cos θ",
        variables:
            "v = meridional wind component; V = wind speed; θ = meteorological wind direction.",
        units:
            "Wind speed and component are commonly expressed in m/s.",
        example:
            "Together with the zonal component, the meridional component describes the horizontal wind vector."
    }

];


function renderFormulas() {

    const grid =
        $("formulaGrid");


    const search =
        $("formulaSearch")
            .value
            .toLowerCase()
            .trim();


    const category =
        $("formulaCategory").value;


    const filtered =
        formulas.filter(
            formula => {

                const matchesSearch =
                    formula.name
                        .toLowerCase()
                        .includes(search) ||

                    formula.equation
                        .toLowerCase()
                        .includes(search) ||

                    formula.variables
                        .toLowerCase()
                        .includes(search);


                const matchesCategory =
                    category === "all" ||
                    formula.category === category;


                return (
                    matchesSearch &&
                    matchesCategory
                );

            }
        );


    grid.innerHTML = "";


    if (!filtered.length) {

        grid.innerHTML = `
            <div class="loading-card">
                No formulas found.
            </div>
        `;

        return;
    }


    filtered.forEach(
        formula => {

            const card =
                document.createElement("article");


            card.className =
                "formula-card";


            card.innerHTML = `

                <span>
                    ${formula.label}
                </span>

                <h3>
                    ${formula.name}
                </h3>

                <div class="equation">
                    ${formula.equation}
                </div>

                <p>
                    <strong>Variables:</strong>
                    ${formula.variables}
                </p>

                <p>
                    <strong>Units:</strong>
                    ${formula.units}
                </p>

                <p>
                    <strong>Example:</strong>
                    ${formula.example}
                </p>

            `;


            grid.appendChild(card);

        }
    );

}


$("formulaSearch")
    ?.addEventListener(
        "input",
        renderFormulas
    );


$("formulaCategory")
    ?.addEventListener(
        "change",
        renderFormulas
    );


renderFormulas();


/* =========================================================
   QUICK CHECK
========================================================= */

document
    .querySelectorAll(
        ".quick-options button"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const feedback =
                    $("quickFeedback");


                document
                    .querySelectorAll(
                        ".quick-options button"
                    )
                    .forEach(
                        item => {

                            item.classList.remove(
                                "correct-answer",
                                "wrong-answer"
                            );

                        }
                    );


                if (
                    button.dataset.answer ===
                    "correct"
                ) {

                    button.classList.add(
                        "correct-answer"
                    );

                    feedback.textContent =
                        "Correct — a barometer measures atmospheric pressure.";

                } else {

                    button.classList.add(
                        "wrong-answer"
                    );

                    feedback.textContent =
                        "Not quite. Think about the instrument used to measure pressure.";

                }

            }
        );

    });


/* =========================================================
   FOOTER
========================================================= */

$("footerYear").textContent =
    new Date().getFullYear();


/* =========================================================
   INITIAL WEATHER LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadWeather();

        renderObservations();

        console.log(
            "Meteorology Study Hub workstation online."
        );

    }
);
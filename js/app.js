const locationButton = document.querySelector(".location-btn");
const weatherForm = document.querySelector("#weather-form");
const apiKey = "cfb55eb2cc7a37007eeaa0c3dc601d49";


const getLocations = async (e) => {

    e.preventDefault();
    let cityInput = document.querySelector(".city-input");
    const cityName = cityInput.value.trim();
    const divContainer = document.querySelector(".weather-input");

    if (!cityName) {
        const message = "Ingrese una ubicación";
        displayError(message);
        cityInput.value = "";
        return
    }

    cityInput.onclick = () => {
        const deleteLocations = cityInput.nextElementSibling;
        if (deleteLocations) {
            deleteLocations.remove();
            divContainer.style.paddingBottom = "0";
        }
    };

    try {
        const urlGetLocations = `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=5&appid=${apiKey}`;

        const locations = await getData(urlGetLocations);

        if (!locations.length) {
            throw new Error("No se encontró la ciudad");
        }

        let li = "";
        let addedLocations = new Set();

        locations.forEach((location) => {

            const key = `${location.lat},${location.lon}`;
            let city;

            if (!addedLocations.has(key)) {

                location.local_names ? city = location.local_names["es"] || location.name : city = location.name;
                li += `<li data-id="${location.lat},${location.lon}" data-location="${city}">
                    <span>${city}, ${location.country}</span>
                    <span>${location.state || ""}</span>
                    <span>${(location.lat).toFixed(3)}, ${(location.lon).toFixed(3)}</span>
                </li>`
                addedLocations.add(key);
            }
        });

        const ul = document.createElement("ul");
        ul.className = "locations";
        ul.innerHTML = li;
        cityInput.insertAdjacentElement("afterend", ul);

        if (addedLocations.size > 3) divContainer.style.paddingBottom = "135px";

        ul.onclick = (e) => {
            let liElement = e.target.closest('li');

            if (liElement) {
                divContainer.style.paddingBottom = "0";
                const [lat, lon] = (liElement.dataset.id).split(",");
                const nameLocation = liElement.dataset.location;
                getCityWeather(lat, lon, nameLocation);
                ul.remove();
                cityInput.value = "";
            }
        }

    } catch (error) {
        displayError(error.message);
    }
}

const getCityWeather = async (lat, lon, nameLocation) => {

    try {

        const userLanguage = (navigator.language || navigator.userLanguage).split("-")[0];

        const urlCurrentWeather = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&lang=${userLanguage}&units=metric`

        const currentWeatherData = await getData(urlCurrentWeather);

        const urlWeatherForecast = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&lang=${userLanguage}&units=metric`

        const weatherForecastData = await getData(urlWeatherForecast);
        
        const dailyData = processForecastData(weatherForecastData);

        displayWeatherInfo(currentWeatherData, dailyData, nameLocation);

    } catch (error) {
        displayError(error.message);
    }
}

const getUserCoordinates = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {

            try {

                const { latitude, longitude } = position.coords;

                const urlLocation = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`;

                const location = (await getData(urlLocation))[0];

                const userLanguage = (navigator.language || navigator.userLanguage).split("-")[0];

                const nameLocation = location.local_names[userLanguage] || location.name;

                const urlCurrentWeather = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&lang=${userLanguage}&units=metric`;

                const currentWeatherData = await getData(urlCurrentWeather);

                const urlWeatherForecast = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&lang=${userLanguage}&units=metric`;

                const weatherForecastData = await getData(urlWeatherForecast);

                const dailyData = processForecastData(weatherForecastData);

                displayWeatherInfo(currentWeatherData, dailyData, nameLocation);

            } catch (error) {
                displayError(error.message);
            }
        }, (error) => {

            let message = "";
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = "Solicitud de geolocalización denegada."
                    break;
                case error.TIMEOUT:
                    alert("La solicitud para obtener la ubicación ha caducado.");
                    break;
                default:
                    message = "Se ha producido un error desconocido."
            }

            displayError(message);
        });
    } else {

        const message = "La geolocalización no es soportada por este navegador.";
        displayError(message);
    }
}


const getData = async (url) => {

    const response = await fetch(url);

    if (!response.ok) {
        let message = "";
        url.includes("geo") ? message = "No se encontró el nombre de la ubicación" : message = "No se encontró información del clima";
        throw new Error(message);
    }

    return await response.json();

}

const processForecastData = (weatherForecastData) => {

    const currentDate = new Date().toISOString().split('T')[0];
    let count = 0;
    const dailyData = weatherForecastData.list.reduce((acc, item) => {
        const forecastDate = item.dt_txt.split(' ')[0];

        // Contar numero de registros del dia actual
        if (forecastDate === currentDate) count++;

        const temperature = item.main.temp;
        const humidity = item.main.humidity;
        const wind = item.wind.speed;
        const weatherDescription = item.weather[0].description;
        const idWeather = item.weather[0].id;

        if (!acc[forecastDate]) {
            acc[forecastDate] = {
                maxTemp: temperature,
                minTemp: temperature,
                maxHumidity: humidity,
                minHumidity: humidity,
                maxWind: wind,
                minWind: wind,
                ids: {}
            };
        } else {

            acc[forecastDate].maxTemp = Math.max(acc[forecastDate].maxTemp, temperature);
            acc[forecastDate].minTemp = Math.min(acc[forecastDate].minTemp, temperature);
            acc[forecastDate].maxHumidity = Math.max(acc[forecastDate].maxHumidity, humidity);
            acc[forecastDate].minHumidity = Math.min(acc[forecastDate].minHumidity, humidity);
            acc[forecastDate].maxWind = Math.max(acc[forecastDate].maxWind, wind);
            acc[forecastDate].minWind = Math.min(acc[forecastDate].minWind, wind);

        }

        if (!acc[forecastDate].ids[idWeather]) {
            acc[forecastDate].ids[idWeather] = { count: 0, description: weatherDescription };
        }

        acc[forecastDate].ids[idWeather].count++;

        return acc;

    }, {});

    if (count > 0 && count < 4) delete dailyData[currentDate];

    return dailyData;

}

const displayWeatherInfo = (currentData, dailyData, city) => {

    const icon = currentData.weather[0].icon;
    const nameLocation = city || currentData.name;
    const keyDates = Object.keys(dailyData);

    let mainContainer = document.querySelector("#weatherData");
    if (!mainContainer) {
        mainContainer = document.createElement('div');
        mainContainer.classList.add('container');
        mainContainer.setAttribute("id", "weatherData");
        document.body.appendChild(mainContainer);
    }
    mainContainer.innerHTML = "";

    const currentInfo = `
        <h2>Clima Actual</h2>
            <div class="weather-card">
            <h4 class="date">${formatDate(currentData.timezone)}</h4>
                <h2 class="city">${nameLocation}</h2>
                <div class="weather-info">
                    <div class="weather-icon">
                        ${weatherIcon(currentData.weather[0].id, icon)}
                    </div>
                    <h1 class="temp">${Math.round(currentData.main.temp)}<span class="unit">°C</span></h1>
                </div>
                <p class="description">${currentData.weather[0].description}</p>
                <div class="weather-info">
                    <div class="wind">
                        <i class="bi bi-wind" title="Viento"></i>
                        <span>${Math.round(currentData.wind.speed * 3.6)}Km/h</span>
                    </div>
                    <div class="humidity">
                        <i class="bi bi-moisture" title="Humedad"></i>
                        <span>${currentData.main.humidity}%</span>
                    </div>
                </div>
            </div>
    `

    let forecastInfo = `<h2>Pronostico ${keyDates.length} días</h2><div class="days-forecast">`;

    keyDates.forEach(forecastDate => {
        
        const forecastData = dailyData[forecastDate];

        const idMainWeather = Object.keys(forecastData.ids).reduce((a, b) =>
            forecastData.ids[a].count > forecastData.ids[b].count ? a : b
        );

        const mainDescription = forecastData.ids[idMainWeather].description;

        forecastInfo += `
            <div class="weather-card">
                <h4 class="date">${formatDate(forecastDate)}</h4>
                <h2 class="city">${nameLocation}</h2>
                <div class="weather-info">
                    <div class="weather-icon">
                        ${weatherIcon(idMainWeather, icon.replace("n", "d"))}
                    </div>
                    <h1 class="temp">${Math.round(forecastData.maxTemp)}°<span class="temp-min">${Math.floor(forecastData.minTemp)}°C</span></h1>
                </div>
                <p class="description">${mainDescription}</p>
                <div class="weather-info">
                    <div class="wind">
                        <i class="bi bi-wind" title="Viento"></i>
                        <span>${Math.round(forecastData.maxWind * 3.6)}Km/h</span>
                    </div>
                    <div class="humidity">
                        <i class="bi bi-moisture" title="Humedad"></i>
                        <span>${Math.round(forecastData.minHumidity)}%</span>
                    </div>
                </div>
            </div>
        `;
    });

    forecastInfo += '</div>';

    const currentWeatherContainer = document.createElement("div");
    currentWeatherContainer.classList.add("current-weather");
    currentWeatherContainer.innerHTML = currentInfo;

    const weatherForecastContainer = document.createElement("div")
    weatherForecastContainer.classList.add("weather-forecast");
    weatherForecastContainer.innerHTML = forecastInfo;

    mainContainer.appendChild(currentWeatherContainer);
    mainContainer.appendChild(weatherForecastContainer);

    scroll();
}

const formatDate = (timeOrDate) => {

    const options = { month: 'short', day: '2-digit' };
    let formattedDate;
    const userLanguage = navigator.language || navigator.userLanguage
    if (typeof timeOrDate == "number") {
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
        const date = new Date();
        const timeAdjusted = new Date(date.getTime() + (timeOrDate * 1000) + (date.getTimezoneOffset() * 60000));
        formattedDate = `${timeAdjusted.toLocaleString(userLanguage, options)}, ${timeAdjusted.toLocaleString("en-US", timeOptions).toLowerCase()}`;
    } else {
        options["weekday"] = 'short';
        formattedDate = new Date(timeOrDate + "T00:00:00").toLocaleString(userLanguage, options);
    }
    
    return formattedDate;
}

const weatherIcon = (idWeather, idIcon) => {

    let iconClass = "";

    switch (true) {
        case (idWeather >= 200 && idWeather < 300):
            return `<img src="assets/img/cloud-bolt-solid.svg" alt="Icono clima tormenta">`;
        case (idWeather >= 300 && idWeather < 600):
            iconClass = "cloud-rain-fill cloud";
            break;
        case (idWeather >= 600 && idWeather < 700):
            iconClass = "snow2 snow";
            break;
        case (idWeather >= 700 && idWeather < 800):
            iconClass = "cloud-haze-fill fog";
            break;
        case (idWeather == 800):
            (idIcon.includes("d")) ? iconClass = "sun-fill sun" : iconClass = "moon-fill moon";
            break;
        case (idWeather > 800 && idWeather < 810):
            iconClass = "clouds-fill cloud";
            break;
        default:
            iconClass = "question-circle-fill";
    }

    return `<i class="bi bi-${iconClass}"></i>`;
}

const scroll = () => {
    let data = document.querySelector("#weatherData");
    data.scrollIntoView({ behavior: 'smooth' });
}

const displayError = (msn) => {
    const message = document.querySelector(".msn-error");
    message.textContent = msn;
    message.classList.toggle("show");
    setTimeout(() => {
        message.classList.toggle("show");
    }, 4000);
}

weatherForm.addEventListener("submit", getLocations);
locationButton.addEventListener("click", getUserCoordinates);
const DEFAULT_LATITUDE = 39;
const DEFAULT_LONGITUDE = -97;

let latitude = null;
let longitude = null;
let map;
let marker;
let city;
let artists = [];
let songs = [];
let userLocated = false;

async function main() {
  await getUserLocation();

  if (userLocated) {
    await loadCity();
    await loadArtists();
  }

  initializeMap();
  setMapClickHandler();
}

/** Gets the user latitude and longitude */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      // check if geolocation is supported/enabled on current browser
      navigator.geolocation.getCurrentPosition(
        position => {
          console.log(
            "User latitude =",
            position.coords.latitude,
            "and longitude =",
            position.coords.longitude
          );
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          userLocated = true;
          resolve();
        },
        error => {
          if (error.code === 1) {
            console.log("User has denied location retrieval");
          } else {
            console.error(
              "An error has occured while retrieving location",
              error
            );
          }
          resolve();
        }
      );
    } else {
      console.log("geolocation is not enabled on this browser");
      resolve();
    }
  });
}

/** Initialize the map and sets a marker using default lat/long */
function initializeMap() {
  map = L.map("map");

  map.setView([DEFAULT_LATITUDE, DEFAULT_LONGITUDE], 4);

  L.tileLayer(
    "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}",
    {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: "mapbox.streets",
      accessToken:
        "pk.eyJ1Ijoid3J3MTAzIiwiYSI6ImNrMmpxMDh1bDFlcTQzbXBoNmYwYnA5MHUifQ.CB3N7Hwbg555SGnR0XUzcQ"
    }
  ).addTo(map);

  if (userLocated) {
    marker = L.marker([latitude, longitude]).addTo(map);
  }
}

/** Update map marker and get city and artists when map is clicked */
async function setMapClickHandler() {
  map.on("click", async e => {
    latitude = e.latlng.lat;
    longitude = e.latlng.lng;

    if (!marker) {
      marker = L.marker([latitude, longitude]).addTo(map);
    } else {
      marker.setLatLng([latitude, longitude]);
      map.setView([latitude, longitude]);
    }

    await loadCity();
    await loadArtists();
  });
}

/** Gets the city and updates the DOM */
async function loadCity() {
  setCityText("Loading...");
  artists = [{ name: "Searching for city..." }];
  updateArtistList();
  await setCityFromLatLng(latitude, longitude);
  setCityText(city);
}

/** Gets the artists and updates the DOM */
async function loadArtists() {
  artists = [{ name: "Loading..." }];
  updateArtistList();
  await buildArtistArray(city);
  updateArtistList(artists);
}

/**
 * Reverse geocodes an address from a latitude and longitude
 * @param {number} latitude - The latitude to reverse geocode
 * @param {number} longitude - The longitude to reverse geocode
 * @returns {string} The city with the provided latitude and longitude. "null" if no city is found.
 */
async function setCityFromLatLng(latitude, longitude) {
  response = await fetch(
    `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${longitude},${latitude}`
  );

  reverseGeocodeData = await response.json();

  if (reverseGeocodeData.address && reverseGeocodeData.address.City) {
    city = reverseGeocodeData.address.City;

    console.log(
      `City "${city}" found from lat = ${latitude}, long = ${longitude}`
    );
  } else {
    city = null;
  }
}

/**
 * Sets the text for the city paragraph element in the DOM
 * @param {string} text - The text to put into the DOM element
 */
function setCityText(text) {
  let cityParagraph = document.getElementById("city");

  if (text) {
    cityParagraph.innerHTML = text;
  } else {
    cityParagraph.innerHTML = "Error getting city!";
  }
}

/**
 * Gets artists and puts them into the artist array
 * @param {string} city - The city name used to get the artists
 */
async function buildArtistArray(city) {
  if (city) {
    artists = await getArtists("area", city);

    additionalArtists = await getArtists("beginarea", city);
    artists = [...artists, ...additionalArtists];

    additionalArtists = await getArtists("endarea", city);
    artists = [...artists, ...additionalArtists];

    artists.sort((a, b) =>
      a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1
    );

    if (artists.length === 0) {
      artists = [{ name: "No artists found" }];
    }
  } else {
    artists = [{ name: "Cannot obtain artists without valid city" }];
  }
}

/**
 * Gets the artists from musicbrainz.org
 * @param {string} queryParameter - The parameter to get
 * @param {string} queryArgument - The parameter value
 */
async function getArtists(queryParameter, queryArgument) {
  baseUrl =
    "https://musicbrainz.org/ws/2/artist/?fmt=json&limit=100&offset=0&query=";

  let response = await fetch(baseUrl + queryParameter + ":" + queryArgument);

  let search = await response.json();

  let artists = search.artists;

  artists = artists.map(artist => {
    return { id: artist.id, name: artist.name };
  });

  return artists;
}

/**
 * Gets the artists from musicbrainz.org
 * @param {string} queryParameter - The parameter to get
 * @param {string} queryArgument - The parameter value
 */
function updateArtistList() {
  let artistList = document.getElementById("artists__list");
  while (artistList.firstChild) {
    artistList.removeChild(artistList.firstChild);
  }

  artists.forEach(artist => {
    let listItem = document.createElement("LI");
    let textNode = document.createTextNode(artist.name);
    listItem.appendChild(textNode);
    listItem.classList.add("artists__list-item");
    artistList.appendChild(listItem);
  });
}

main();

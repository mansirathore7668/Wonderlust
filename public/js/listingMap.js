(() => {
  const mapEl = document.getElementById("listing-map");
  const statusEl = document.getElementById("listing-map-status");

  if (!mapEl) return;
  if (typeof L === "undefined") {
    if (statusEl) statusEl.textContent = "Map failed to load (Leaflet missing).";
    return;
  }

  const locationQuery = (mapEl.dataset.location || "").trim();
  const listingTitle = (mapEl.dataset.title || "").trim();

  const setStatus = (msg) => {
    if (statusEl) statusEl.textContent = msg || "";
  };

  const getMapboxToken = () => {
    const meta = document.querySelector('meta[name="mapbox-token"]');
    return (meta && meta.getAttribute("content") ? meta.getAttribute("content") : "").trim();
  };

  const geocodeWithMapbox = async (query, token) => {
    const url =
      "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
      encodeURIComponent(query) +
      ".json?access_token=" +
      encodeURIComponent(token) +
      "&limit=1";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Mapbox geocoding failed");
    const data = await res.json();
    const feature = data && data.features && data.features[0];
    if (!feature || !feature.center || feature.center.length < 2) return null;
    return { lng: feature.center[0], lat: feature.center[1] };
  };

  const geocodeWithNominatim = async (query) => {
    // Public endpoint; keep usage light. If you have MAPBOX_TOKEN, prefer Mapbox for reliability.
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(query);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Nominatim geocoding failed");
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first) return null;
    return { lat: Number.parseFloat(first.lat), lng: Number.parseFloat(first.lon) };
  };

  const initMap = ({ lat, lng }) => {
    const map = L.map(mapEl).setView([lat, lng], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.marker([lat, lng]).addTo(map);
    if (listingTitle) marker.bindPopup(listingTitle);
  };

  (async () => {
    if (!locationQuery) {
      setStatus("No location provided for this listing.");
      return;
    }

    setStatus("Loading map...");

    try {
      const token = getMapboxToken();
      let coords = null;

      if (token) {
        coords = await geocodeWithMapbox(locationQuery, token);
      }
      if (!coords) {
        coords = await geocodeWithNominatim(locationQuery);
      }

      if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
        setStatus("Could not find this location on the map.");
        return;
      }

      initMap(coords);
      setStatus("");
    } catch (e) {
      setStatus("Map could not load right now.");
    }
  })();
})();

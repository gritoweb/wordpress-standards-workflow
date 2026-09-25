/*
 * Location map. Plain vanilla, no import — served from source.
 *
 * The Maps JavaScript API is registered in app/maps.php with
 * callback=__PREFIX__LocationReady. app/maps.php also prints a stub for
 * that name immediately before the library, so Google always has something
 * to call even if this file hasn't parsed yet; the stub only records that
 * the library arrived, and this file then boots on its own.
 *
 * The style comes from window.__PREFIX__MapSettings, printed by
 * app/maps.php from Site Settings > Maps. The fallback here is 'google'
 * (no styling at all), so the map still draws correctly if that object is
 * ever missing.
 *
 * google.maps.Marker is deprecated (February 2024) in favor of
 * AdvancedMarkerElement, which requires a Map ID and switches map styling
 * to Google's cloud-based system, incompatible with the JSON styles this
 * file uses. Kept for now per the kit's block-library decision; revisit
 * when JSON styles are no longer viable.
 */
(function () {
  function settings() {
    var s = window.__PREFIX__MapSettings || {};

    return {
      style: s.style === 'branded' ? 'branded' : 'google',
      hideBusiness: s.hideBusiness === '0' ? '0' : '1',
    };
  }

  // A neutral, quiet palette: greys and off-whites, nothing brand-specific.
  // A project that wants its own palette overrides this file, or (once
  // needed) a future Site Settings colour field feeds it here.
  var BRANDED_RULES = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f2' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b6b63' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f2' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#dedad2' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e3e2dd' }] },
  ];

  // Shops, business POIs and transit off, so only streets, water and the
  // office pin remain. Carries no colour, so it applies to Google's own
  // palette just as well as to the branded one.
  var HIDE_BUSINESS_RULES = [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ];

  function mapStyle(config) {
    var rules = config.style === 'branded' ? BRANDED_RULES : [];

    return config.hideBusiness === '1' ? rules.concat(HIDE_BUSINESS_RULES) : rules;
  }

  function draw(el, config) {
    if (el.dataset.drawn === '1') {
      return;
    }

    var lat = parseFloat(el.dataset.lat);
    var lng = parseFloat(el.dataset.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return;
    }

    var center = { lat: lat, lng: lng };

    var map = new window.google.maps.Map(el, {
      center: center,
      zoom: parseInt(el.dataset.zoom, 10) || 15,
      disableDefaultUI: true,
      keyboardShortcuts: true,
      clickableIcons: false,
      gestureHandling: 'cooperative',
      styles: mapStyle(config),
    });

    new window.google.maps.Marker({
      position: center,
      map: map,
      title: el.dataset.label || '',
    });

    el.dataset.drawn = '1';
  }

  function boot() {
    if (!window.google || !window.google.maps) {
      return;
    }

    var panels = document.querySelectorAll('.location__map');

    if (!panels.length) {
      return;
    }

    var config = settings();

    panels.forEach(function (el) {
      draw(el, config);
    });
  }

  window.__PREFIX__LocationReady = boot;

  // The library may already have loaded and fired the stub before this file
  // parsed, in which case nothing will call us again. window.google.maps can
  // exist before google.maps.Map is actually filled in (loading=async fires
  // the callback once the library is truly ready) — __PREFIX__MapsReady is
  // the stub's own record that the real callback already ran, so checking it
  // here (instead of window.google.maps) never calls new google.maps.Map
  // before it exists.
  if (window.__PREFIX__MapsReady) {
    boot();
  }
})();

import { __, sprintf } from '@wordpress/i18n';

// Locate (INSP-12): turns the address into coordinates once, on an explicit
// click, and stores them on the block. Geocoding at render time would bill a
// request for every visitor. The controller takes what it reads and writes as
// functions, so a test can drive it without a browser or the Maps library.
//
//   getGoogle()   the Maps global, or nothing when the library isn't loaded
//   loadGoogle()  a promise of the Maps global, loading the library first
//   getAddress()  the address as written now, read again when a result arrives
//   onFound()     receives { latitude, longitude } as strings
//   onStatus()    receives the line the live region reads
export function createLocator({ getGoogle, loadGoogle, getAddress, onFound, onStatus }) {
  // Each Locate click and each hand edit of a coordinate takes a new number.
  // A result applies only if nobody has taken a newer one since it went out.
  let requestId = 0;

  // True when a result no longer belongs to the click that asked for it. A
  // newer click or a hand edit owns the status line then. An edited address
  // owns nothing, so the "Locating…" line has to be cleared here.
  const isStale = (id, address) => {
    if (id !== requestId) return true;
    if (getAddress() !== address) {
      onStatus('');
      return true;
    }

    return false;
  };

  const notLoaded = () =>
    onStatus(
      __(
        'The Maps library is not loaded. Add a Google Maps API key in Site Settings, then reload this screen.',
        '__TEXT_DOMAIN__',
      ),
    );

  const geocode = (google, address, id) => {
    onStatus(__('Locating…', '__TEXT_DOMAIN__'));

    new google.maps.Geocoder().geocode({ address }, (results, status) => {
      if (isStale(id, address)) return;

      if (status === 'OK' && results?.length) {
        const point = results[0].geometry.location;

        onFound({ latitude: String(point.lat()), longitude: String(point.lng()) });
        onStatus(__('Found it.', '__TEXT_DOMAIN__'));
      } else if (status === 'ZERO_RESULTS' || status === 'OK') {
        onStatus(__('No match for that address. Check it, or paste coordinates by hand.', '__TEXT_DOMAIN__'));
      } else if (status === 'REQUEST_DENIED') {
        onStatus(__('Google refused the request. Check that the API key allows the Geocoding API.', '__TEXT_DOMAIN__'));
      } else {
        onStatus(
          sprintf(
            /* translators: %s: the status Google returned, such as OVER_QUERY_LIMIT. */
            __('Google could not look that up (%s). Try again in a moment.', '__TEXT_DOMAIN__'),
            status,
          ),
        );
      }
    });
  };

  return {
    locate() {
      const address = getAddress();
      const id = ++requestId;

      if (!address) {
        onStatus(__('Enter an address first.', '__TEXT_DOMAIN__'));
        return;
      }

      const google = getGoogle();

      if (google?.maps) {
        geocode(google, address, id);
        return;
      }

      if (!loadGoogle) {
        notLoaded();
        return;
      }

      onStatus(__('Loading the Maps library…', '__TEXT_DOMAIN__'));

      loadGoogle().then((loaded) => {
        if (isStale(id, address)) return;

        if (loaded?.maps) geocode(loaded, address, id);
        else notLoaded();
      });
    },

    // A coordinate typed by hand outranks a result still on its way.
    invalidate() {
      requestId += 1;
    },
  };
}

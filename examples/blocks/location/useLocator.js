import { useRef, useState } from '@wordpress/element';
import { createLocator } from './editor-locate.js';
import { createMapsLoader } from './editor-maps.js';

let loader;

// One loader for the whole editor, so two location blocks share one script tag.
// maps.php prints the library's address as window.__PREFIX__MapsEditor.
const loadMaps = () => (loader ??= createMapsLoader(window))(window.__PREFIX__MapsEditor?.src);

/**
 * The Locate button's state: a status line for the live region, `locate` for
 * the button and `invalidate` for a hand-edited coordinate. Reads the latest
 * address and callback through refs, because a geocode result arrives after
 * the render that started it.
 */
export function useLocator({ address, onFound }) {
  const [status, setStatus] = useState('');
  const addressRef = useRef(address);
  const foundRef = useRef(onFound);
  const locator = useRef(null);

  addressRef.current = address;
  foundRef.current = onFound;

  if (!locator.current) {
    locator.current = createLocator({
      getGoogle: () => window.google,
      loadGoogle: loadMaps,
      getAddress: () => addressRef.current,
      onFound: (coordinates) => foundRef.current(coordinates),
      onStatus: setStatus,
    });
  }

  return { status, locate: locator.current.locate, invalidate: locator.current.invalidate };
}

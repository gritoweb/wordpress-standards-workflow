// Loads the Google Maps library the first time Locate needs it, so the
// editor never fetches it for a page that has no location block, or for an
// editor who never clicks Locate. `win` is the window to load into; a test
// passes a fake. The returned function takes the library's address and gives
// back the `google` global, or nothing when there is no address or the script
// failed, so the caller can say why Locate did nothing.
export function createMapsLoader(win) {
  let loading = null;

  return function load(src) {
    if (win.google?.maps?.Geocoder) return Promise.resolve(win.google);
    if (!src) return Promise.resolve(undefined);

    loading ??= new Promise((resolve) => {
      const script = win.document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = async () => {
        try {
          // The async loader hands out each library on request, and Geocoder
          // lives in "geocoding".
          await win.google?.maps?.importLibrary?.('geocoding');
        } catch {
          // Locate reports a library that isn't usable.
        }
        resolve(win.google);
      };
      script.onerror = () => {
        script.remove();
        loading = null;
        resolve(undefined);
      };
      win.document.head.appendChild(script);
    });

    return loading;
  };
}

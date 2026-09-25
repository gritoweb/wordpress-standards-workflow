const isSlideObject = (slide) =>
  typeof slide === 'object' && slide !== null && !Array.isArray(slide);

const toSlideObject = (slide) => (isSlideObject(slide) ? slide : {});

export const getSlideText = (slide, key, fallback) => {
  const value = toSlideObject(slide);

  if (Object.prototype.hasOwnProperty.call(value, key)) {
    return typeof value[key] === 'string' ? value[key] : '';
  }

  return typeof fallback === 'string' ? fallback : '';
};

const toId = (value) => {
  const id =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : 0;

  return Number.isSafeInteger(id) && id > 0 ? id : 0;
};

export const getSlideImageId = (slide) =>
  toId(toSlideObject(slide).slideImageId);

export const getSlideImageUrl = (slide) => {
  const { slideImageUrl } = toSlideObject(slide);

  return typeof slideImageUrl === 'string' ? slideImageUrl : '';
};

export const getSlideMobileImageId = (slide) =>
  toId(toSlideObject(slide).mobileImageId);

// Matches ImagePositionControl's vocabulary (and BlockImagePosition's PHP-side
// keys), so a saved slide position maps straight to the same 3x3 crop
// everywhere a position is picked.
const IMAGE_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

export const getSlideImagePosition = (slide) => {
  const { imagePosition } = toSlideObject(slide);

  return IMAGE_POSITIONS.includes(imagePosition) ? imagePosition : 'center';
};

export const createEmptySlide = () => ({
  eyebrow: '',
  heading: '',
  slideImageId: 0,
  slideImageUrl: '',
});

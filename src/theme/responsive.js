import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

// Reference width: iPhone 11 / 12 (RN common baseline)
const BASE_W = 375;
const scale = width / BASE_W;

export const rs = (size) => {
  const next = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(next));
};

export const rfs = (fontSize) => {
  // Font scaling tends to look too big on tablets; clamp lightly.
  const next = fontSize * Math.min(1.15, Math.max(0.9, scale));
  return Math.round(PixelRatio.roundToNearestPixel(next));
};

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const layout = {
  w: width,
  h: height,
  isSmallPhone: width < 360,
  isLargePhone: width >= 414,
};


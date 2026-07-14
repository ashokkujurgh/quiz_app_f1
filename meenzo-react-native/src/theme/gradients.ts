import type { LinearGradientProps } from 'expo-linear-gradient';

/** linear-gradient(135deg, #7c5cfc 0%, #c054f0 55%, #e040fb 100%) */
export const GRAD: [string, string, string] = ['#7c5cfc', '#c054f0', '#e040fb'];
export const GRAD_LOCATIONS: [number, number, number] = [0, 0.55, 1];

/** linear-gradient(135deg, #6c47ef 0%, #e040fb 100%) */
export const GRAD2: [string, string] = ['#6c47ef', '#e040fb'];

// 135deg maps to a diagonal from top-left to bottom-right.
export const DIAGONAL_START = { x: 0, y: 0 };
export const DIAGONAL_END = { x: 1, y: 1 };

export const gradProps: Pick<LinearGradientProps, 'colors' | 'locations' | 'start' | 'end'> = {
  colors: GRAD,
  locations: GRAD_LOCATIONS,
  start: DIAGONAL_START,
  end: DIAGONAL_END,
};

export const grad2Props: Pick<LinearGradientProps, 'colors' | 'start' | 'end'> = {
  colors: GRAD2,
  start: DIAGONAL_START,
  end: DIAGONAL_END,
};

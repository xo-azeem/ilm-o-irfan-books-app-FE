export const ROUTES = {
  HOME: 'Home',
  EXPLORE: 'Explore',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

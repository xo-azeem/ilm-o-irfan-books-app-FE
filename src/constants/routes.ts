export const ROUTES = {
  EXPLORE: 'Explore',
  LIBRARY: 'Library',
  WISHLIST: 'Wishlist',
  PROFILE: 'Profile',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

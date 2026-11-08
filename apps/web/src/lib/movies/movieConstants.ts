export const DEFAULT_PLATFORM = 'Douban'
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342'
export const TMDB_BACKDROP_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780'
export const DOUBAN_PROFILE_URL =
  'https://www.douban.com/people/191287070/?_i=3746089pLWPXRI,3746152pLWPXRI'
export const TMDB_PROFILE_URL = 'https://www.themoviedb.org/u/MarkXu269'
export const CINEMA_REVEAL_TEXT = 'CINEMA'
export const CINEMA_BACKGROUND_INTERVAL_MS = 6000
export const CINEMA_STILL_IMAGES = [
  '/images/movies/cinema/interstellar.jpg',
  '/images/movies/cinema/walter-mitty.jpg',
  '/images/movies/cinema/city-the-animation.jpg',
  '/images/movies/cinema/wandering-earth-2.jpg',
  '/images/movies/cinema/midnight-in-paris.jpg',
  '/images/movies/cinema/avengers-endgame.jpg',
]

// The hero band is much wider than 16:9, so each still is cropped vertically.
// Stills whose subject sits off-center get their own vertical focus point
// instead of the default center crop, which would cut through the figures.
export const CINEMA_STILL_OBJECT_POSITIONS: Record<string, string> = {
  // Keep the seated figure whole and leave the peaks visible above.
  '/images/movies/cinema/walter-mitty.jpg': '50% 22%',
  // The still is the Starry Night skyline, so lean low to keep the rooftops.
  '/images/movies/cinema/midnight-in-paris.jpg': '50% 85%',
}

export function getCinemaStillObjectPosition(src: string) {
  return CINEMA_STILL_OBJECT_POSITIONS[src] ?? '50% 50%'
}

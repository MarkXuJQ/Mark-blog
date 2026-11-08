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
// These stills keep their subject in the upper half; anchoring them to the top
// keeps the figures in frame instead of cutting through them at center.
export const CINEMA_STILL_TOP_ANCHORED_IMAGES = new Set([
  '/images/movies/cinema/midnight-in-paris.jpg',
  '/images/movies/cinema/walter-mitty.jpg',
])

export function getCinemaStillObjectPosition(src: string) {
  return CINEMA_STILL_TOP_ANCHORED_IMAGES.has(src)
    ? 'object-top'
    : 'object-center'
}

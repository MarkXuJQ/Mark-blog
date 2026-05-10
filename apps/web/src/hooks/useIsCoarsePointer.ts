import { useMediaQuery } from './useMediaQuery'

const COARSE_POINTER_QUERY = '(pointer: coarse)'

export function useIsCoarsePointer() {
  return useMediaQuery(COARSE_POINTER_QUERY)
}

import { createElement, type ComponentType } from 'react'

export type PreloadableComponent<Props extends object> = ComponentType<Props> & {
  preload: () => Promise<void>
}

export function createPreloadableComponent<Props extends object>(
  loader: () => Promise<ComponentType<Props>>
): PreloadableComponent<Props> {
  let loadedComponent: ComponentType<Props> | null = null
  let loadingPromise: Promise<ComponentType<Props>> | null = null

  const load = () => {
    loadingPromise ??= loader().then((component) => {
      loadedComponent = component
      return component
    })

    return loadingPromise
  }

  function PreloadableComponent(props: Props) {
    if (!loadedComponent) {
      throw load()
    }

    return createElement(loadedComponent, props)
  }

  PreloadableComponent.preload = async () => {
    await load()
  }

  return PreloadableComponent
}

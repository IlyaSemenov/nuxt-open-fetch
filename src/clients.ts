import type { Ref } from 'vue'
import type { FetchOptions } from 'ofetch'
import type { ErrorResponse, HttpMethod, SuccessResponse, FilterKeys, MediaType, ResponseObjectMap } from "openapi-typescript-helpers"
import type { KeysOf, MultiWatchSources, AsyncDataOptions, AsyncData, PickFrom } from "#app/composables/asyncData"
import type { OpenFetchClientName } from '#build/module/nuxt-open-fetch'
import type { OpenFetchOptions } from './module'
import { useFetch } from '#app'
import { toValue, computed } from '#imports'
import { fillPath } from './utils'

type FetchResponseData<T> = FilterKeys<SuccessResponse<ResponseObjectMap<T>>, MediaType>
type FetchResponseError<T> = FilterKeys<ErrorResponse<ResponseObjectMap<T>>, MediaType>
type ComputedOptions<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends Function ? T[K] : T[K] extends Record<string, any> ? ComputedOptions<T[K]> | Ref<T[K]> | T[K] : Ref<T[K]> | T[K]
}
type ParamsOption<T = void> = T extends { parameters: any } ? NonNullable<T["parameters"]> : { query: Record<string, unknown> }

interface ApiOptions<M extends HttpMethod, P extends { path?: any, query?: any }> extends Omit<FetchOptions, 'method' | 'params' | 'query'> {
  params?: P extends { path: any } ? P['path'] : never
  query?: P['query']
  method?: M 
}
type ComputedFetchOptions<M extends HttpMethod, P extends { path?: any, query?: any }> = ComputedOptions<ApiOptions<M, P>>

export interface UseApiOptions<
  Method extends HttpMethod,
  Params extends { path?: any, query?: any },
  ResT,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = null,
> extends Omit<AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>, 'watch'>, ComputedFetchOptions<Method, Params> {
  key?: string
  $fetch?: typeof globalThis.$fetch
  watch?: MultiWatchSources | false
}

export type OpenFetchClient<Paths> = <
  ReqT extends Extract<keyof Paths, string>,
  PathT extends Extract<keyof Paths[ReqT], HttpMethod>,
  Method extends PathT = 'get' extends PathT ? 'get' : PathT,
  ResT = FetchResponseData<'get' extends Method ? Paths[ReqT]['get'] : Paths[ReqT][Method]>
>(
  path: ReqT,
  options?: ApiOptions<Method, ParamsOption<'get' extends Method ? Paths[ReqT]['get'] : Paths[ReqT][Method]>>
) => Promise<ResT>

export type UseOpenFetchClient<Paths> = <
  ReqT extends Extract<keyof Paths, string>,
  Method extends Extract<keyof Paths[ReqT], HttpMethod>,
  ResT = FetchResponseData<'get' extends Method ? Paths[ReqT]['get'] : Paths[ReqT][Method]>,
  ErrorT = FetchResponseError<'get' extends Method ? Paths[ReqT]['get'] : Paths[ReqT][Method]>,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = null,
>(
  path: ReqT | (() => ReqT),
  options?: UseApiOptions<Method, ParamsOption<'get' extends Method ? Paths[ReqT]['get'] : Paths[ReqT][Method]>, ResT, DataT, PickKeys, DefaultT>,
  autoKey?: string 
) => AsyncData<PickFrom<DataT, PickKeys> | DefaultT, ErrorT | null>

export type UseLazyOpenFetchClient<Paths> = <
  ReqT extends Extract<keyof Paths, string>,
  Method extends Extract<keyof Paths[ReqT], HttpMethod>,
  ResT = FetchResponseData<'get' extends Method ? Paths[ReqT]['get'] : Paths[ReqT][Method]>,
  ErrorT = FetchResponseError<'get' extends Method ? Paths[ReqT]['get'] : Paths[ReqT][Method]>,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = null,
>(
  path: ReqT | (() => ReqT),
  options?: Omit<UseApiOptions<Method, ParamsOption<'get' extends Method ? Paths[ReqT]['get'] : Paths[ReqT][Method]>, ResT, DataT, PickKeys, DefaultT>, 'lazy'>,
  autoKey?: string 
) => AsyncData<PickFrom<DataT, PickKeys> | DefaultT, ErrorT | null>

export const getGlobalOptions = (name: OpenFetchClientName): OpenFetchOptions => {
  const { $openFetch } = useNuxtApp()

  return $openFetch[name]
}

export const createOpenFetchClient = <Paths>(name: OpenFetchClientName): OpenFetchClient<Paths> => {
  return (path, { params, query, ...options } = {}) => {
    return $fetch(fillPath(path, params), {
      ...getGlobalOptions(name),
      ...options,
      query: query as Record<string, unknown>
    })
  }
}

export const createUseOpenFetchClient = <Paths>(name: OpenFetchClientName): UseOpenFetchClient<Paths> => {
  return (path, { params, query, ...options } = {}, autoKey) => {
    return useFetch(() => fillPath(toValue(path), toValue(params)), {
      ...getGlobalOptions(name),
      key: autoKey,
      ...options,
      query: computed(() => toValue(query))
    })
  }
}

export const createUseLazyOpenFetchClient = <Paths>(name: OpenFetchClientName): UseLazyOpenFetchClient<Paths> => {
  return (path, { params, query, ...options } = {}, autoKey) => {
    return useFetch(() => fillPath(toValue(path), toValue(params)), {
      ...getGlobalOptions(name),
      key: autoKey,
      ...options,
      query: computed(() => toValue(query)),
      lazy: true
    })
  }
}

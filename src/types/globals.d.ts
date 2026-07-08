export {};

declare global {
  function requestIdleCallback(
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ): number;

  function cancelIdleCallback(handle: number): void;
}

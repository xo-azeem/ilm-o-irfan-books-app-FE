export {};

declare global {
  function requestIdleCallback(
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ): number;

  function cancelIdleCallback(handle: number): void;

  /**
   * Base64 helpers. Hermes provides both at runtime, but they are declared by
   * TypeScript's DOM lib, which a React Native project does not include.
   */
  function btoa(data: string): string;
  function atob(data: string): string;
}

/**
 * `hpp` does not ship type declarations. The middleware is used with a fixed
 * configuration, so the surface is declared here rather than reaching for
 * `any` at the call site.
 */
declare module 'hpp' {
  import type { RequestHandler } from 'express';

  interface HppOptions {
    checkBody?: boolean;
    checkQuery?: boolean;
    whitelist?: string[];
  }

  function hpp(options?: HppOptions): RequestHandler;

  export = hpp;
}

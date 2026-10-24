/**
 * Stand-in for the optional `react-devtools-core` peer.
 *
 * ink imports it from `devtools.js`, but only when `DEV === 'true'` *and*
 * `import.meta.resolve('react-devtools-core')` succeeds — neither holds in
 * this package, so the chunk is never loaded.
 *
 * Without this alias tsdown externalises the import and the emitted chunk
 * would throw `ERR_MODULE_NOT_FOUND` if it ever were. Bundling the real
 * package instead costs 13.4 MB.
 */
export default {
  initialize(): void {},
  connectToDevTools(): void {},
}

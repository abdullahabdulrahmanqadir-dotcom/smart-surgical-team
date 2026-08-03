/**
 * Stand-in for the `cloudflare:workers` built-in module.
 *
 * The rendered-route tests import the built Worker bundle straight into Node,
 * which has no such module, so every test failed to load the moment a route
 * started importing it (the R2 media and upload routes). Nothing under test
 * reaches these bindings — the tests assert server-rendered HTML — so an empty
 * environment is enough, and any accidental use fails loudly instead of
 * silently returning undefined.
 */
export const env = new Proxy({}, {
  get(_target, property) {
    throw new Error(`Test stub: the Worker binding "${String(property)}" is not available in the Node test runner.`);
  },
});

export default { env };

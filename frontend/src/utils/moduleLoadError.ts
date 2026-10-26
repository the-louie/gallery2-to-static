/**
 * Whether an error is a route chunk (dynamic `import()`) that could not be downloaded, e.g. the
 * network went away while navigating (QA-08). React.lazy keeps such a failure, so the only recovery
 * is a page reload. Wordings: Chrome ("Failed to fetch dynamically imported module"), Firefox
 * ("error loading dynamically imported module"), Safari ("Importing a module script failed"),
 * webpack-style ("Loading chunk N failed"), and Vite's own preload helper when a chunk's stylesheet
 * fails ("Unable to preload CSS for …", seen on the test site when the request was aborted).
 */
const MODULE_LOAD_ERROR =
  /dynamically imported module|Importing a module script failed|Loading chunk|Unable to preload CSS/i;

export function isModuleLoadError(error: Error): boolean {
  return MODULE_LOAD_ERROR.test(error.message);
}

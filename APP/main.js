// Entrypoint for the app (minimal bootstrap). This file combines the original app initialization
// and exposes a small shim so migration can be done incrementally.
import { state, attachToWindow } from './state.js';
import * as utils from './utils.js';
import * as constants from './constants.js';

// Expose state and helpers to window for backward compatibility with the existing non-module code
attachToWindow();
window.__APP_UTILS__ = utils;
window.__APP_CONSTANTS__ = constants;

// Apply CSS vars
utils.attachCssVars();

// Provide a small start() that replicates previous boot sequence. Existing code still calls
// the functions it needs from app.js; this start() is useful for incremental migration.
export function startAppBootSequence(runSequence) {
  // runSequence is a function that will perform the chain of loads and render calls,
  // typically the code currently at the bottom of app.js in each HTML page.
  if (typeof runSequence === 'function') {
    runSequence();
  } else {
    console.info('startAppBootSequence: provide a runSequence function to bootstrap data loads');
  }
}

// For convenience, call a noop so module is executed when imported
console.info('APP/main.js loaded — state and utils exposed on window for incremental migration');

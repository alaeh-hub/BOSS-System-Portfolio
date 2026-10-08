/* Single source of truth.

   This file used to be a byte-for-byte copy of src/Landing.jsx. Two
   copies of a 1000 line component drift the first time one of them is
   edited, and the Blade route would then serve a different page from
   the one the Vite build serves. It re-exports instead. */
export { default } from '../../src/Landing.jsx';

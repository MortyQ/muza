// A virtual module has no file to import types from. The reference makes its ambient declaration
// travel with this file, so an app compiling the library from source type-checks it too.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./virtual-icons.d.ts" />
import { addCollection } from "@iconify/vue";
import libraryIcons from "virtual:muzakit-icons";

let registered = false;

/**
 * Registers the lucide icons the library's own components use, so a built app never fetches them
 * from the Iconify API. The set is assembled at build time by `muzakitIcons()`
 * (`@muzakit/ui/vite`); in development it is `null` and the icons load from the API as before.
 * Called by `VIcon` on first render rather than on import: importing the library must not touch
 * global state. Icons an app passes in by name are the app's to register.
 */
export const registerLibraryIcons = (): void => {
  if (registered) return;
  registered = true;
  if (libraryIcons) addCollection(libraryIcons);
};

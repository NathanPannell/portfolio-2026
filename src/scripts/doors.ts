// A door swings open when it is pressed, and then the page moves on.

import { reducedMotion } from './motion';

const DOOR_SWING = 430;

export const startDoors = () => {
  if (reducedMotion()) return;
  for (const link of document.querySelectorAll<HTMLAnchorElement>('.door a')) {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      const door = link.parentElement;
      door?.toggleAttribute('data-opening', true);
      window.setTimeout(() => {
        // Not location.hash, which does nothing if the page is already at that address.
        window.location.href = link.href;
        door?.removeAttribute('data-opening');
      }, DOOR_SWING);
    });
  }
};

/**
 * DOM Utility Functions
 */

export function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id) as T;
  if (!element) {
    console.error(`[DOM] Element with id "${id}" not found`);
    console.error('[DOM] Available elements:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
    throw new Error(`Element with id "${id}" not found`);
  }
  return element;
}

export function setText(id: string, text: string): void {
  getElement(id).textContent = text;
}

export function setHTML(id: string, html: string): void {
  getElement(id).innerHTML = html;
}

export function show(id: string): void {
  getElement(id).classList.remove('hidden');
}

export function hide(id: string): void {
  getElement(id).classList.add('hidden');
}

export function setStyle(id: string, property: string, value: string): void {
  getElement(id).style.setProperty(property, value);
}

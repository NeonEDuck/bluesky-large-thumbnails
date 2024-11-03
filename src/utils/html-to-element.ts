export function htmlToElement<T extends HTMLElement>(html: string, parent?: Element) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const element = template.content.firstElementChild! as T;
    parent?.appendChild(element);
    return element;
}
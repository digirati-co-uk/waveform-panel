export function makeSVGElement(type: 'line', attrs: Partial<Record<string, string>>): SVGGElement;
export function makeSVGElement(type: 'g', attrs: Partial<Record<string, string>>): SVGGElement;
export function makeSVGElement(type: 'defs', attrs: Partial<Record<string, string>>): SVGDefsElement;
export function makeSVGElement(type: 'mask', attrs: Partial<Record<string, string>>): SVGMaskElement;
export function makeSVGElement(type: 'polygon', attrs: Partial<Record<string, string>>): SVGPolygonElement;
export function makeSVGElement(type: 'rect', attrs: Partial<Record<string, string>>): SVGRectElement;
export function makeSVGElement(type: string, attrs: Partial<Record<string, string>>): SVGElement {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', type);
  for (const attribute of Object.keys(attrs)) {
    const value = attrs[attribute];
    rect.setAttributeNS(null, attribute, value);
  }
  return rect;
}

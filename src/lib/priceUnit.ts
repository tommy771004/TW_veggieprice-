import type { ProduceCategory } from './produceCategory'

/** Poultry and egg feeds quote per taijin; pork and sheep quote per kilogram. */
export function getPriceUnit(cropName: string, category: ProduceCategory): string {
  return category === 'meat' && /雞|鵝|鴨|蛋/.test(cropName) && !/豬|羊/.test(cropName)
    ? '元 / 台斤'
    : '元 / 公斤'
}

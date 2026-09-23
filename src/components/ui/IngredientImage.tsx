import { CropIcon } from './CropIcon'
import manifest from '@/lib/ingredientImages.json'
import type { ProduceCategory } from '@/lib/produceCategory'

const categories: Record<ProduceCategory, string> = {
  vegetable: 'N04', mushroom: 'N04', fruit: 'N05', flower: 'N06', meat: 'livestock', seafood: 'seafood',
}
const names = manifest.nameMapping as Record<string, string>
const codes = manifest.codeMapping as Record<string, string>
const assets = manifest.assets as Record<string, { imagePath: string; columns: number; rows: number; column: number; row: number; cropTop?: number; crop?: number[]; clip?: number[] }>

/** Category and code are authoritative; never guess an illustration from a name substring. */
export function IngredientImage({ name, code, category }: { name: string; code?: string; category: ProduceCategory }) {
  const scope = categories[category]
  const key = (code && codes[`${scope}:${code}`]) || names[`${scope}:${name}`]
  const asset = key ? assets[key] : undefined
  // The adjacent visible product name is the accessible label. Keep the original icon until an illustration is available.
  if (!asset) return <span className="ingredient-image ingredient-image--fallback" aria-hidden="true"><CropIcon name={name} className="h-full w-full" /></span>
  const [left, top, width, height] = asset.crop ?? [asset.column / asset.columns, asset.cropTop ?? asset.row / asset.rows, 1 / asset.columns, 1 / asset.rows]
  return <span className="ingredient-image" aria-hidden="true" data-ingredient={key}>
    <span style={{
      backgroundImage: `url("${asset.imagePath}")`,
      clipPath: asset.clip ? `inset(${asset.clip.map(value => `${value}%`).join(' ')})` : undefined,
      backgroundSize: `${100 / width}% ${100 / height}%`,
      backgroundPosition: `${width === 1 ? 0 : left / (1 - width) * 100}% ${height === 1 ? 0 : top / (1 - height) * 100}%`,
    }} />
  </span>
}

'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { m } from 'framer-motion'
import { CropIcon } from '@/components/ui/CropIcon'
import { AffiliateSlot } from '@/components/affiliate/AffiliateSlot'
import {
  getRecipeCategoryLabel,
  isLicensedRecipeImage,
  resolveRecipeSources,
  type Recipe,
} from '@/lib/recipes'

/**
 * Recipe detail overlay: a bottom sheet on mobile / centered modal on desktop.
 * Shows ingredients (with price-search links back into the site), steps, a tip,
 * source attribution, and the existing affiliate slot for related shopping.
 * Uses an in-app overlay — never a blocking native dialog.
 */
export function RecipeDetailSheet({
  recipe,
  onClose,
}: {
  recipe: Recipe
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const sources = resolveRecipeSources(recipe.sourceIds)
  const meta = [
    recipe.timeMinutes ? `${recipe.timeMinutes} 分鐘` : null,
    recipe.difficulty,
    recipe.servings,
  ].filter(Boolean)
  const searchTargets =
    recipe.relatedIngredients && recipe.relatedIngredients.length > 0
      ? recipe.relatedIngredients
      : [recipe.mainIngredient]

  return (
    <m.div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-sheet-title"
      data-testid="recipe-sheet"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="關閉食譜"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* panel */}
      <m.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="relative w-full md:max-w-lg max-h-[88vh] md:max-h-[85vh] flex flex-col overflow-hidden rounded-t-3xl md:rounded-3xl glass-card border border-white/40 shadow-glass-md"
      >
        {/* close bar — non-scrolling, centered, kept above the scrolling content */}
        <div className="relative z-20 shrink-0 flex justify-center pt-3 pb-2">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="關閉"
            data-testid="recipe-sheet-close"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 dark:bg-white/15 dark:hover:bg-white/25 text-on-surface transition-colors leading-none text-xl shadow-sm"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-container-padding pt-2">
          {/* header */}
          <div className="flex items-center gap-3 mb-3">
            {isLicensedRecipeImage(recipe.image) ? (
              <Image
                src={recipe.image.src}
                alt={recipe.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <CropIcon name={recipe.mainIngredient} className="w-10 h-10" />
            )}
            <div className="min-w-0">
              <h3
                id="recipe-sheet-title"
                className="text-body-lg font-bold text-on-surface leading-snug"
              >
                {recipe.name}
              </h3>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                {getRecipeCategoryLabel(recipe.category)}
                {meta.length > 0 ? ` · ${meta.join(' · ')}` : ''}
              </p>
            </div>
          </div>

          {recipe.tags && recipe.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-2xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          {/* ingredients */}
          <section className="mb-5" data-testid="recipe-ingredients">
            <h4 className="text-body-md font-semibold text-on-surface mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-lg" aria-hidden="true">
                shopping_basket
              </span>
              食材
            </h4>
            <ul className="text-body-sm text-on-surface-variant space-y-1 list-disc pl-5">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index}>{ingredient}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 mt-3">
              {searchTargets.map((ingredient) => (
                <Link
                  key={ingredient}
                  href={`/search?q=${encodeURIComponent(ingredient)}`}
                  prefetch={false}
                  onClick={onClose}
                  data-testid="recipe-ingredient-link"
                  className="inline-flex items-center gap-1 text-label-sm px-2.5 py-1 rounded-full glass-chip text-primary hover:bg-white transition-colors"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    search
                  </span>
                  查 {ingredient} 行情
                </Link>
              ))}
            </div>
          </section>

          {/* steps */}
          <section className="mb-5" data-testid="recipe-steps">
            <h4 className="text-body-md font-semibold text-on-surface mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-lg" aria-hidden="true">
                format_list_numbered
              </span>
              做法
            </h4>
            <ol className="space-y-2">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-2.5 text-body-sm text-on-surface">
                  <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary text-white text-2xs flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {recipe.tip ? (
            <div className="mb-5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-3 text-body-sm text-amber-800 dark:text-amber-200 flex gap-2">
              <span className="material-symbols-outlined text-base shrink-0" aria-hidden="true">
                lightbulb
              </span>
              <span className="leading-relaxed">{recipe.tip}</span>
            </div>
          ) : null}

          {sources.length > 0 ? (
            <p className="text-2xs text-on-surface-variant mb-5 leading-relaxed">
              參考來源：
              {sources.map((source, index) => (
                <span key={source.url}>
                  {index > 0 ? '、' : ''}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-primary hover:underline"
                  >
                    {source.label}
                  </a>
                </span>
              ))}
              。步驟為本站依常見做法改寫。
            </p>
          ) : null}

          {isLicensedRecipeImage(recipe.image) ? (
            <p className="text-2xs text-on-surface-variant mb-5 leading-relaxed">
              圖片：
              <a
                href={recipe.image.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-primary hover:underline"
              >
                {recipe.image.attribution}
              </a>
              （{recipe.image.license}）
            </p>
          ) : null}

          {/* related shopping — reuses the existing affiliate slot */}
          <AffiliateSlot cropName={recipe.mainIngredient} category={recipe.category} limit={4} />
        </div>
      </m.div>
    </m.div>
  )
}

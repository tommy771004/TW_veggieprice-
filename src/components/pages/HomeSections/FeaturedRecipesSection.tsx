'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { m, AnimatePresence } from 'framer-motion'
import { CropIcon } from '@/components/ui/CropIcon'
import {
  RECIPE_CATEGORY_TABS,
  getDailyOrderedRecipes,
  getRecipeCategoryLabel,
  getRecipesByCategory,
  getTaipeiDateKey,
  isLicensedRecipeImage,
  nextRevealCount,
  shuffleRecipes,
  type Recipe,
  type RecipeCategory,
} from '@/lib/recipes'
import { RecipeDetailSheet } from './RecipeDetailSheet'

const INITIAL_COUNT = 5
const REVEAL_STEP = 5

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 28 },
  },
}

/**
 * 今日精選食譜 — homepage section above the Homepage Weekly Trend card.
 * Own Produce Category tabs (蔬菜/水果/肉品家禽/漁產); shows a daily-seeded set of
 * 5 recipes with a 換一批 reshuffle and incremental 查看更多. Tapping a card opens
 * the RecipeDetailSheet. Data is statically bundled — no network request.
 */
export function FeaturedRecipesSection() {
  // Stable per render; identical on server and client for the same calendar day,
  // which keeps the daily selection hydration-safe.
  const dateKey = useMemo(() => getTaipeiDateKey(), [])

  const [activeCategory, setActiveCategory] = useState<RecipeCategory>('vegetable')
  const [manualSeed, setManualSeed] = useState<number | null>(null)
  const [revealCount, setRevealCount] = useState(INITIAL_COUNT)
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null)

  const ordered = useMemo(() => {
    if (manualSeed == null) return getDailyOrderedRecipes(activeCategory, dateKey)
    return shuffleRecipes(getRecipesByCategory(activeCategory), manualSeed)
  }, [activeCategory, dateKey, manualSeed])

  const visible = ordered.slice(0, revealCount)
  const hasMore = revealCount < ordered.length

  function selectCategory(category: RecipeCategory) {
    if (category === activeCategory) return
    setActiveCategory(category)
    setManualSeed(null)
    setRevealCount(INITIAL_COUNT)
  }

  function reshuffle() {
    setManualSeed(Math.floor(Math.random() * 2 ** 31))
    setRevealCount(INITIAL_COUNT)
  }

  function revealMore() {
    setRevealCount((current) => nextRevealCount(current, ordered.length, REVEAL_STEP))
  }

  return (
    <m.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-30px' }}
      aria-labelledby="featured-recipes-heading"
      data-testid="featured-recipes"
    >
      {/* header */}
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="section-kicker">Today&apos;s picks</p>
          <h2
            id="featured-recipes-heading"
            className="text-headline-md font-semibold text-on-surface flex items-center gap-2"
          >
            <span aria-hidden="true">🍲</span>今日精選食譜
          </h2>
        </div>
        <button
          type="button"
          onClick={reshuffle}
          data-testid="recipe-shuffle"
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full glass-chip text-label-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors touch-target"
        >
          <span aria-hidden="true">🎲</span>換一批
        </button>
      </div>

      {/* category tabs */}
      <div className="-mx-section-margin px-section-margin overflow-x-auto hide-scrollbar mb-4">
        <div className="flex gap-2 w-max pb-1">
          {RECIPE_CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => selectCategory(tab.value)}
              aria-pressed={activeCategory === tab.value}
              data-testid={`recipe-tab-${tab.value}`}
              className={`px-4 py-2 rounded-full text-label-bold whitespace-nowrap flex items-center gap-1.5 transition-colors touch-target ${
                activeCategory === tab.value
                  ? 'bg-primary text-white shadow-md'
                  : 'glass-chip text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span aria-hidden="true">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* recipe cards */}
      {visible.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant text-center py-8">
          此分類暫無食譜
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {visible.map((recipe, index) => (
            <m.button
              key={recipe.id}
              type="button"
              onClick={() => setOpenRecipe(recipe)}
              data-testid="recipe-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: Math.min(index, 5) * 0.04,
                type: 'spring',
                stiffness: 300,
                damping: 26,
              }}
              className="text-left glass-card rounded-3xl p-4 border border-white/40 hover:bg-white transition-all shadow-glass-sm hover:shadow-glass card-lift flex flex-col gap-2 group"
            >
              <div className="flex items-center justify-between">
                {isLicensedRecipeImage(recipe.image) ? (
                  <Image
                    src={recipe.image.src}
                    alt={recipe.name}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-xl object-cover transition-transform group-hover:scale-110"
                  />
                ) : (
                  <CropIcon
                    name={recipe.mainIngredient}
                    className="w-9 h-9 transition-transform group-hover:scale-110"
                  />
                )}
                {recipe.timeMinutes ? (
                  <span className="text-2xs text-on-surface-variant">
                    {recipe.timeMinutes} 分
                  </span>
                ) : null}
              </div>
              <h3 className="text-body-md font-bold text-on-surface leading-snug line-clamp-2">
                {recipe.name}
              </h3>
              <p className="text-2xs text-on-surface-variant">
                {getRecipeCategoryLabel(recipe.category)}
                {recipe.difficulty ? ` · ${recipe.difficulty}` : ''}
              </p>
            </m.button>
          ))}
        </div>
      )}

      {/* view more */}
      {hasMore ? (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={revealMore}
            data-testid="recipe-view-more"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full glass-chip text-label-bold text-primary hover:bg-white transition-colors touch-target"
          >
            查看更多
            <span aria-hidden="true">▾</span>
          </button>
        </div>
      ) : null}

      {/* detail overlay */}
      <AnimatePresence>
        {openRecipe ? (
          <RecipeDetailSheet
            key="recipe-sheet"
            recipe={openRecipe}
            onClose={() => setOpenRecipe(null)}
          />
        ) : null}
      </AnimatePresence>
    </m.section>
  )
}

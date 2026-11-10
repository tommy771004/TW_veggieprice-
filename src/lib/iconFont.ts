import subset from './iconFontNames.generated.json' with { type: 'json' }

/**
 * Icons whose names come from data (the affiliates table), not from source.
 * scripts/sync-icon-font.mjs scans src/, so listing them here puts them in the
 * self-hosted subset. Pick from this list when adding an offer; anything else
 * falls back to `storefront` instead of rendering its name as text.
 */
export const DATA_ICON_CHOICES = [
  'storefront', 'store', 'shopping_cart', 'shopping_bag', 'shopping_basket', 'local_mall',
  'local_grocery_store', 'sell', 'local_offer', 'redeem', 'card_giftcard', 'loyalty', 'savings',
  'restaurant', 'restaurant_menu', 'set_meal', 'lunch_dining', 'dinner_dining', 'bakery_dining',
  'ramen_dining', 'rice_bowl', 'fastfood', 'takeout_dining', 'soup_kitchen', 'cake', 'cookie',
  'icecream', 'local_cafe', 'coffee', 'emoji_food_beverage', 'local_bar', 'wine_bar', 'liquor',
  'kitchen', 'blender', 'skillet', 'cooking', 'egg', 'nutrition', 'eco', 'spa', 'agriculture',
  'local_florist', 'grass', 'water_drop', 'health_and_safety', 'medical_services', 'medication',
  'favorite', 'delivery_dining', 'local_shipping', 'two_wheeler', 'inventory_2', 'package_2',
] as const

const SUBSET: ReadonlySet<string> = new Set(subset.names)

/** The name if the self-hosted font can draw it, otherwise `fallback`. */
export function iconOrFallback(name: string | null | undefined, fallback = 'storefront'): string {
  return name && SUBSET.has(name) ? name : fallback
}

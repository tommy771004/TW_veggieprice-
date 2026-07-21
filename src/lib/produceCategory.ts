// Pure produce-category classification. Kept free of `@/…` runtime imports so it
// is directly unit-testable under `node --test` (see produceCategory.test.ts),
// mirroring the marketOverviewCore.ts pattern. Re-exported from `@/lib/produce`.

export type ProduceCategory = 'vegetable' | 'fruit' | 'flower' | 'mushroom' | 'meat' | 'seafood'

export const CATEGORY_KEYWORDS: Record<ProduceCategory, string[]> = {
  vegetable: ['菜', '高麗', '蘿蔔', '番茄', '洋蔥', '胡蘿蔔', '青椒', '花椰菜', '地瓜', '玉米', '南瓜', '茄子', '小黃瓜', '黃瓜', '蔥', '韭', '芹', '空心', '茼蒿', '生菜', '萵苣'],
  fruit: ['果', '蘋果', '香蕉', '芭樂', '鳳梨', '芒果', '葡萄', '西瓜', '柳橙', '橘', '檸檬', '草莓', '桃', '梨', '木瓜'],
  flower: ['花', '菊', '玫瑰', '百合', '蘭'],
  mushroom: ['菇', '香菇', '金針', '杏鮑'],
  meat: ['豬', '雞', '鵝', '鴨', '羊', '白肉雞', '毛豬', '蛋'],
  seafood: ['魚', '蝦', '蟹', '蛤', '貝', '魷', '卷', '鯧', '鮭', '鯛', '鱸', '鰱', '鯖', '鰻', '鮪', '鱈', '蚵', '牡蠣', '秋刀', '虱目', '旗', '魩', '鱙', '透抽', '花枝', '軟絲', '干貝', '海帶', '紫菜', '魴', '鱺', '鯉', '鯽', '鰆', '鰺', '鱵', '鮟鱇']
}

export function getProduceCategory(cropName: string, typeCode?: string): ProduceCategory {
  // The MOA 種類代碼 is authoritative when present: flower (N06) names frequently
  // carry no flower keyword (康乃馨, 洋桔梗, 千日紅…) and some even match another
  // category's keyword (火龍果→'果'), so name-only classification is unreliable.
  if (typeCode === 'N06') return 'flower'
  if (typeCode === 'N05') return 'fruit'
  if (typeCode === 'N04') {
    // MOA files 菇類 under N04; the app surfaces them as their own category.
    return CATEGORY_KEYWORDS.mushroom.some((keyword) => cropName.includes(keyword))
      ? 'mushroom'
      : 'vegetable'
  }

  const matchedCategory = (Object.entries(CATEGORY_KEYWORDS) as Array<[ProduceCategory, string[]]>).find(([, keywords]) =>
    keywords.some((keyword) => cropName.includes(keyword))
  )

  return matchedCategory?.[0] ?? 'vegetable'
}

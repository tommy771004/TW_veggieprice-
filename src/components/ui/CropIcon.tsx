/**
 * CropIcon — flat inline-SVG crop visuals, replacing cross-platform-inconsistent emoji.
 *
 * Why: emoji render differently per OS/font (identification cost) and depend on the
 * system emoji font. A curated SVG set is crisp, consistent, weighs almost nothing
 * (no <img>/network, no next/image), and ships inside the existing JS bundle.
 *
 * Coverage: rules are derived from the real item names in public/data (MOA daily
 * opendata + seafood). When no curated SVG fits a crop, we fall back to the original
 * emoji so the visual never mismatches the item.
 *
 * Server-safe: no hooks / no 'use client', so it works in RSC (e.g. /seasonal page)
 * and Client Components alike. Size is controlled by the caller via `className`.
 */

import { getCropEmoji } from '@/lib/utils'

type IconKey =
  | 'tomato' | 'broccoli' | 'onion' | 'leafy' | 'herb' | 'carrot' | 'apple'
  | 'banana' | 'pineapple' | 'mango' | 'grape' | 'waxapple' | 'dragonfruit'
  | 'coconut' | 'kiwi' | 'lychee' | 'melon' | 'citrus' | 'berry' | 'pear' | 'custardapple'
  | 'pepper' | 'corn' | 'pumpkin' | 'eggplant' | 'cucumber' | 'pea' | 'tuber' | 'chestnut'
  | 'shoot' | 'mushroom' | 'garlic' | 'squid' | 'flower' | 'avocado' | 'pig'
  | 'egg' | 'chicken' | 'duck' | 'sheep' | 'shrimp' | 'crab' | 'shell' | 'fish'
  // Crops whose market names describe a visibly different item. Keeping these
  // separate is what prevents a real bitter melon or papaya being rendered as a
  // generic cucumber / watermelon slice.
  | 'radish' | 'bittermelon' | 'loofah' | 'chayote' | 'waxgourd'
  | 'potato' | 'sweetpotato' | 'ginger' | 'taro' | 'yam' | 'burdock' | 'lotusroot' | 'waterchestnut' | 'jicama'
  | 'papaya' | 'guava' | 'starfruit' | 'passionfruit' | 'durian' | 'jackfruit'
  | 'persimmon' | 'watermelon' | 'cantaloupe' | 'longan' | 'blueberry' | 'cherry' | 'peach'
  | 'cabbage' | 'bokchoy' | 'spinach' | 'waterSpinach' | 'amaranth' | 'mustardGreen' | 'lettuce' | 'fern' | 'swissChard'
  | 'basil' | 'cilantro' | 'parsley' | 'celery' | 'fennel' | 'scallion' | 'chive' | 'lemongrass'
  | 'greenbean' | 'edamame' | 'peanut' | 'okra' | 'bambooshoot' | 'waterbamboo'
  | 'shiitake' | 'woodear' | 'oysterMushroom' | 'shimeji' | 'strawMushroom' | 'buttonMushroom' | 'enoki' | 'kingOyster'
  | 'mangosteen' | 'plum' | 'rambutan' | 'canistel' | 'olive' | 'sugarcane'
  | 'beet'
  | 'lily' | 'orchid' | 'chrysanthemum' | 'carnation' | 'rose' | 'sunflower' | 'hydrangea' | 'gladiolus'
  | 'anthurium' | 'birdOfParadise' | 'eustoma' | 'gypsophila' | 'cockscomb' | 'tulip' | 'foliage' | 'palm' | 'eucalyptus' | 'willow'

/**
 * Ordered keyword → icon rules. First substring match wins, so more specific
 * keywords MUST precede generic ones. Order also resolves real MOA naming traps:
 *   南瓜 before 木瓜 · 葡萄柚 before 葡萄 · 酪梨/扁蒲 before 梨 ·
 *   青花/蘆筍/花豆 before generic 花 · 大蒜 before 蔥 · 甘薯葉 before 甘薯 ·
 *   玉米/青花 before generic 筍 · 海帶 before fish 帶.
 */
const ICON_RULES: ReadonlyArray<readonly [string, IconKey]> = [
  // — trap-breakers (must run before the generic rules they'd otherwise hit) —
  ['大蒜', 'garlic'],
  ['南瓜', 'pumpkin'],
  ['青花', 'broccoli'], ['花椰', 'broccoli'],
  ['酪梨', 'avocado'],
  ['扁蒲', 'cucumber'],
  ['蘆筍', 'shoot'],
  ['釋迦', 'custardapple'], // 含「鳳梨釋迦」,須在 鳳梨→pineapple 之前
  ['隼人瓜', 'chayote'],
  ['佛手瓜', 'chayote'],
  ['苦瓜', 'bittermelon'],
  ['絲瓜', 'loofah'],
  ['冬瓜', 'waxgourd'], ['越瓜', 'waxgourd'],
  ['甘薯葉', 'leafy'], ['地瓜葉', 'leafy'],
  ['胡蘿蔔', 'carrot'], ['白蘿蔔', 'radish'], ['蘿蔔', 'radish'],
  ['山藥', 'yam'], ['甜菜根', 'beet'],
  ['紅薑花', 'flower'], ['野薑花', 'flower'],
  ['豆薯', 'jicama'], ['馬鈴薯', 'potato'], ['甘薯', 'sweetpotato'], ['番薯', 'sweetpotato'], ['地瓜', 'sweetpotato'],
  ['薯蕷', 'yam'], ['芋', 'taro'], ['薑', 'ginger'], ['牛蒡', 'burdock'], ['荸薺', 'waterchestnut'], ['蓮藕', 'lotusroot'],
  ['楊桃', 'starfruit'], ['百香果', 'passionfruit'],
  ['榴槤蜜', 'jackfruit'], ['波蘿蜜', 'jackfruit'], ['菠蘿蜜', 'jackfruit'], ['榴槤', 'durian'],
  ['木瓜', 'papaya'], ['番石榴', 'guava'], ['芭樂', 'guava'],
  ['西瓜', 'watermelon'], ['洋香瓜', 'cantaloupe'], ['甜瓜', 'cantaloupe'],
  ['柿', 'persimmon'], ['龍眼', 'longan'], ['藍莓', 'blueberry'], ['櫻桃', 'cherry'], ['桃', 'peach'],
  ['包心白菜', 'cabbage'], ['包心白', 'cabbage'], ['甘藍', 'cabbage'], ['高麗菜', 'cabbage'],
  ['捲心菜', 'cabbage'],
  ['小白菜', 'bokchoy'], ['青江', 'bokchoy'], ['青梗', 'bokchoy'], ['油菜', 'bokchoy'],
  ['菠菜', 'spinach'], ['蕹菜', 'waterSpinach'], ['空心菜', 'waterSpinach'], ['莧菜', 'amaranth'],
  ['芥藍', 'mustardGreen'], ['芥菜', 'mustardGreen'], ['雪里紅', 'mustardGreen'], ['榨菜', 'mustardGreen'],
  ['萵苣', 'lettuce'], ['生菜', 'lettuce'], ['山蘇', 'fern'], ['蕨菜', 'fern'], ['過貓', 'fern'], ['菾菜', 'swissChard'],
  ['九層塔', 'basil'], ['羅勒', 'basil'], ['芫荽', 'cilantro'], ['巴西利', 'parsley'], ['巴西里', 'parsley'],
  ['芹菜', 'celery'], ['茴香', 'fennel'], ['青蔥', 'scallion'], ['韭菜', 'chive'], ['香茅', 'lemongrass'],
  ['毛豆', 'edamame'], ['落花生', 'peanut'], ['花生', 'peanut'], ['黃秋葵', 'okra'], ['秋葵', 'okra'],
  ['豇豆', 'greenbean'], ['菜豆', 'greenbean'], ['敏豆', 'greenbean'], ['四季豆', 'greenbean'], ['萊豆', 'greenbean'],
  ['茭白筍', 'waterbamboo'], ['竹筍', 'bambooshoot'], ['桶筍', 'bambooshoot'], ['金針筍', 'bambooshoot'], ['半天筍', 'bambooshoot'], ['筍茸', 'bambooshoot'], ['熟筍', 'bambooshoot'], ['筍乾', 'bambooshoot'], ['筍片', 'bambooshoot'], ['筍絲', 'bambooshoot'],
  ['杏鮑菇', 'kingOyster'], ['木耳', 'woodear'], ['金絲菇', 'enoki'], ['金針菇', 'enoki'], ['香菇', 'shiitake'], ['濕香菇', 'shiitake'],
  ['洋菇', 'buttonMushroom'], ['秀珍菇', 'oysterMushroom'], ['蠔菇', 'oysterMushroom'], ['珊瑚菇', 'oysterMushroom'],
  ['鴻喜菇', 'shimeji'], ['柳松菇', 'shimeji'], ['草菇', 'strawMushroom'],
  ['山竹', 'mangosteen'], ['紅毛丹', 'rambutan'], ['黃金果', 'canistel'], ['橄欖', 'olive'], ['甘蔗', 'sugarcane'], ['李', 'plum'],
  ['藠頭', 'garlic'], ['萊姆', 'citrus'], ['金龍', 'dragonfruit'],
  // — flower varieties and cut foliage (N06): specific flowers before the
  // generic 花 / 葉 rules so named market cultivars keep their true silhouette —
  ['嘉蘭', 'lily'], ['火焰百合', 'lily'], ['水仙百合', 'lily'], ['鐵砲百合', 'lily'], ['重瓣百合', 'lily'], ['香水百合', 'lily'], ['百合', 'lily'],
  ['文心蘭', 'orchid'], ['蝴蝶蘭', 'orchid'], ['石斛蘭', 'orchid'], ['萬代蘭', 'orchid'], ['春樹蘭', 'orchid'], ['腎藥蘭', 'orchid'], ['千代蘭', 'orchid'], ['蘭', 'orchid'],
  ['大菊', 'chrysanthemum'], ['小菊', 'chrysanthemum'], ['染色大菊', 'chrysanthemum'], ['染大菊', 'chrysanthemum'], ['染小菊', 'chrysanthemum'], ['非洲菊', 'chrysanthemum'], ['菊', 'chrysanthemum'],
  ['康乃馨', 'carnation'], ['玫瑰', 'rose'], ['向日葵', 'sunflower'], ['繡球', 'hydrangea'],
  ['劍蘭', 'gladiolus'], ['唐菖蒲', 'gladiolus'], ['火鶴', 'anthurium'], ['天堂鳥', 'birdOfParadise'], ['鶴蕉', 'birdOfParadise'],
  ['洋桔梗', 'eustoma'], ['洋吉梗', 'eustoma'], ['滿天星', 'gypsophila'], ['卡斯比亞', 'gypsophila'], ['補血草', 'gypsophila'], ['星辰花', 'gypsophila'],
  ['雞冠花', 'cockscomb'], ['鬱金香', 'tulip'], ['風信子', 'tulip'], ['風鈴花', 'tulip'],
  ['尤加利', 'eucalyptus'], ['雲龍柳', 'willow'], ['柳', 'willow'],
  ['黃椰心', 'palm'], ['觀音蓮', 'palm'], ['八角金盤', 'palm'],
  ['羊齒', 'fern'], ['文竹', 'fern'], ['切葉', 'foliage'], ['葉蘭', 'foliage'], ['水燭葉', 'foliage'], ['孔雀', 'foliage'], ['星點木', 'foliage'], ['千年木', 'foliage'], ['扁柏', 'foliage'], ['雪松', 'foliage'], ['壽松', 'foliage'], ['竹', 'foliage'], ['麻', 'foliage'],
  ['八卦草', 'foliage'], ['初雪草', 'foliage'], ['夕霧草', 'foliage'], ['山防風', 'foliage'], ['秀線', 'foliage'], ['蓮蓬', 'foliage'], ['高梁', 'foliage'], ['麒麟草', 'foliage'],
  ['伯利恆之星', 'flower'], ['千日紅', 'flower'], ['唐棉', 'flower'], ['夜來香', 'flower'], ['射干', 'flower'], ['小飛燕草', 'flower'], ['柔麗絲', 'flower'], ['水晶香水', 'flower'], ['深山櫻', 'flower'], ['白日草', 'flower'], ['睡蓮', 'flower'], ['黃金鳥', 'flower'],
  ['OT', 'flower'], ['其他花', 'flower'], ['其它花', 'flower'], ['進口', 'flower'],

  // — fruiting vegetables / tomato —
  ['牛番茄', 'tomato'], ['小番茄', 'tomato'], ['蕃茄', 'tomato'], ['番茄', 'tomato'],
  ['洋蔥', 'onion'],

  // — leafy greens —
  ['高麗菜', 'leafy'], ['甘藍', 'leafy'], ['大白菜', 'leafy'], ['小白菜', 'leafy'],
  ['青江', 'leafy'], ['空心菜', 'leafy'], ['蕹菜', 'leafy'], ['茼蒿', 'leafy'],
  ['菠菜', 'leafy'], ['萵苣', 'leafy'], ['生菜', 'leafy'], ['莧菜', 'leafy'],
  ['油菜', 'leafy'], ['芥藍', 'leafy'], ['芥菜', 'leafy'], ['紅鳳菜', 'leafy'],
  ['皇宮菜', 'leafy'], ['雪里紅', 'leafy'], ['過貓', 'leafy'], ['蕨菜', 'leafy'],
  ['山蘇', 'leafy'], ['川七', 'leafy'], ['朴菜', 'leafy'], ['榨菜', 'leafy'],
  ['鹹菜', 'leafy'], ['黑甜仔', 'leafy'], ['甘薯葉', 'leafy'], ['地瓜葉', 'leafy'],
  ['芽菜', 'leafy'], ['豆芽', 'leafy'], ['苜蓿', 'leafy'], ['水蓮', 'leafy'],
  ['西洋菜', 'leafy'], ['人參葉', 'leafy'], ['塌棵', 'leafy'], ['大心菜', 'leafy'],
  ['海帶', 'leafy'], ['海菜', 'leafy'], ['包心白', 'leafy'], ['包白', 'leafy'], ['白菜', 'leafy'],

  // — aromatic herbs / stalks —
  ['香椿', 'herb'], ['芫荽', 'herb'], ['巴西利', 'herb'], ['巴西里', 'herb'], ['九層塔', 'herb'],
  ['香茅', 'herb'], ['茴香', 'herb'], ['羅勒', 'herb'], ['青蔥', 'herb'], ['韭菜', 'herb'],
  ['芹菜', 'herb'], ['蔥', 'herb'], ['甘蔗', 'herb'],

  // — roots —
  ['胡蘿蔔', 'carrot'],

  // — fruit —
  ['蘋果', 'apple'], ['棗', 'apple'], // 蜜棗/印度棗:綠色、形近蘋果
  ['香蕉', 'banana'],
  ['鳳梨', 'pineapple'],
  ['芒果', 'mango'], ['枇杷', 'mango'], ['黃金果', 'mango'], ['蛋黃果', 'mango'],
  ['葡萄柚', 'citrus'],
  ['葡萄', 'grape'], ['百香果', 'grape'],
  ['蓮霧', 'waxapple'],
  ['火龍果', 'dragonfruit'], ['紅龍果', 'dragonfruit'],
  ['椰子', 'coconut'],
  ['奇異果', 'kiwi'],
  ['荔枝', 'lychee'], ['紅毛丹', 'lychee'],
  ['哈密瓜', 'cantaloupe'], ['香瓜梨', 'cantaloupe'], ['香瓜', 'cantaloupe'],
  ['石榴', 'melon'],
  ['香櫞', 'citrus'], // 香櫞/佛手柑(避免用「佛手」以免誤中佛手瓜)
  ['柳橙', 'citrus'], ['柳丁', 'citrus'], ['椪柑', 'citrus'], ['桶柑', 'citrus'],
  ['茂谷', 'citrus'], ['橘子', 'citrus'], ['檸檬', 'citrus'], ['柚', 'citrus'],
  ['柑', 'citrus'], ['橙', 'citrus'], ['桔', 'citrus'],
  ['草莓', 'berry'], ['桑椹', 'berry'], ['桑', 'berry'], ['山竹', 'berry'],
  ['楊梅', 'berry'], ['李', 'berry'], ['梅', 'berry'],
  ['水梨', 'pear'], ['梨', 'pear'],

  // — other vegetables —
  ['青椒', 'pepper'], ['甜椒', 'pepper'], ['辣椒', 'pepper'],
  ['玉米', 'corn'],
  ['茄子', 'eggplant'], ['茄', 'eggplant'],
  ['小黃瓜', 'cucumber'], ['花胡瓜', 'cucumber'], ['胡瓜', 'cucumber'], ['醃瓜', 'cucumber'],
  ['黃瓜', 'cucumber'], ['瓜', 'cucumber'],
  ['荷蘭豆', 'pea'], ['豌豆', 'pea'], ['毛豆', 'pea'], ['四季豆', 'pea'], ['菜豆', 'pea'],
  ['敏豆', 'pea'], ['萊豆', 'pea'], ['虎豆', 'pea'], ['鵲豆', 'pea'], ['肉豆', 'pea'],
  ['花豆', 'pea'], ['豇豆', 'pea'], ['蠶豆', 'pea'], ['秋葵', 'pea'], ['橄欖', 'pea'],
  ['落花生', 'pea'], ['花生', 'pea'], ['栗', 'chestnut'],
  ['草石蠶', 'tuber'], ['菱角', 'tuber'],
  ['茭白筍', 'shoot'], ['竹筍', 'shoot'], ['桶筍', 'shoot'], ['金針筍', 'shoot'],
  ['半天筍', 'shoot'], ['晚香玉筍', 'shoot'], ['筍茸', 'shoot'], ['綠竹', 'shoot'],
  ['麻竹', 'shoot'], ['筍', 'shoot'],
  ['金針菇', 'mushroom'], ['杏鮑菇', 'mushroom'], ['香菇', 'mushroom'], ['洋菇', 'mushroom'],
  ['木耳', 'mushroom'], ['菇', 'mushroom'],
  ['蕎頭', 'garlic'], ['蒜頭', 'garlic'], ['蒜', 'garlic'],

  // — flowers (after every veg/fruit that merely contains 花) —
  ['菊', 'flower'], ['玫瑰', 'flower'], ['百合', 'flower'], ['蘭花', 'flower'],
  ['金針花', 'flower'], ['石蓮花', 'flower'], ['玉蘭', 'flower'], ['花', 'flower'],

  // — squid / cephalopods —
  ['花枝', 'squid'], ['透抽', 'squid'], ['軟絲', 'squid'], ['軟舌', 'squid'],
  ['魷', 'squid'], ['章魚', 'squid'], ['小卷', 'squid'], ['鎖管', 'squid'], ['頭足', 'squid'], ['管', 'squid'], ['卷', 'squid'],

  // — meat / poultry —
  ['毛豬', 'pig'], ['豬', 'pig'],
  ['雞蛋', 'egg'], ['鴨蛋', 'egg'], ['皮蛋', 'egg'], ['蛋', 'egg'],
  ['白肉雞', 'chicken'], ['土雞', 'chicken'], ['雞', 'chicken'],
  ['鵝', 'duck'], ['鴨', 'duck'],
  ['羊', 'sheep'],

  // — seafood —
  ['蝦', 'shrimp'],
  ['蟹', 'crab'], ['蟳', 'crab'],
  ['牡蠣', 'shell'], ['文蛤', 'shell'], ['蛤', 'shell'], ['蚵', 'shell'], ['蜆', 'shell'],
  ['蟶', 'shell'], ['鮑', 'shell'], ['螺', 'shell'], ['九孔', 'shell'], ['貝', 'shell'], ['蚶', 'shell'], ['蜊', 'shell'], ['萬引', 'shell'],
  ['臭肉', 'fish'],
  ['虱目', 'fish'], ['吳郭', 'fish'], ['石斑', 'fish'], ['鱸', 'fish'], ['鯛', 'fish'],
  ['鯧', 'fish'], ['香魚', 'fish'], ['鰺', 'fish'], ['黃花', 'fish'], ['赤宗', 'fish'],
  ['龍膽', 'fish'], ['龍虎斑', 'fish'], ['青斑', 'fish'], ['秋刀', 'fish'], ['土魠', 'fish'],
  ['海鱺', 'fish'], ['金線', 'fish'], ['加鱲', 'fish'], ['盤仔', 'fish'], ['英哥', 'fish'],
  ['青嘴', 'fish'], ['龍尖', 'fish'], ['鰱', 'fish'], ['魴', 'fish'], ['鱝', 'fish'],
  ['秋姑', 'fish'], ['煙仔', 'fish'], ['鰻', 'fish'], ['鰡', 'fish'], ['三牙', 'fish'],
  ['皮刀', 'fish'], ['魽', 'fish'], ['沙腸', 'fish'], ['勿仔', 'fish'], ['梭', 'fish'],
  ['白口', 'fish'], ['黑口', 'fish'], ['赤筆', 'fish'], ['巴闌', 'fish'], ['硬尾', 'fish'],
  ['午仔', 'fish'], ['鯖', 'fish'], ['鮭', 'fish'], ['鯊', 'fish'], ['杉', 'fish'],
  ['帶魚', 'fish'], ['白帶', 'fish'], ['肉魚', 'fish'], ['什魚', 'fish'], ['草魚', 'fish'],
  ['紅魚', 'fish'], ['紅尾', 'fish'], ['鱲', 'fish'], ['鰆', 'fish'], ['鰹', 'fish'],
  ['鮪', 'fish'], ['旗', 'fish'], ['鯰', 'fish'], ['海鯰', 'fish'], ['牛尾', 'fish'],
  ['四破', 'fish'], ['加志', 'fish'], ['狗母', 'fish'], ['龍舌', 'fish'], ['紅條', 'fish'],
  ['石喬', 'fish'], ['白北', 'fish'], ['鐵甲', 'fish'], ['水針', 'fish'], ['變身苦', 'fish'],
  ['咬狗', 'fish'], ['串仔', 'fish'], ['鰽', 'fish'], ['青衣', 'fish'], ['目斗', 'fish'],
  ['馬加', 'fish'], ['三角仔', 'fish'], ['金錢仔', 'fish'], ['新娘', 'fish'],
  ['丁香', 'fish'], ['鮫', 'fish'], ['石狗公', 'fish'], ['泥鰍', 'fish'], ['鰍', 'fish'],
  ['油甘', 'fish'], ['紅喉', 'fish'], ['鱙', 'fish'], ['尾冬', 'fish'], ['西齒', 'fish'],
  ['三點', 'fish'], ['赤翅', 'fish'], ['赤海', 'fish'], ['長加', 'fish'], ['闊北', 'fish'],
  ['白松', 'fish'], ['智仔', 'fish'], ['秋哥', 'fish'], ['西刀', 'fish'], ['紅古', 'fish'],
  ['九岩', 'fish'], ['目孔', 'fish'], ['火口', 'fish'], ['油口', 'fish'], ['黃目帶', 'fish'],
  ['烏殼', 'fish'], ['大目', 'fish'], ['鞭', 'fish'], ['鱈', 'fish'], ['鱠', 'fish'], ['厚唇', 'fish'],
  ['斑', 'fish'], ['魚', 'fish'], ['海鮮', 'fish'],
]

/** Returns the matched icon key, or null when no curated SVG fits this crop. */
export function resolveCropIconKey(cropName: string): IconKey | null {
  if (!cropName) return null
  for (const [keyword, key] of ICON_RULES) {
    if (cropName.includes(keyword)) return key
  }
  return null
}

/** Inner SVG markup per icon (viewBox 0 0 24 24, flat fills). */
const ICON_SVG: Record<IconKey, string> = {
  leafy: `<circle cx="12" cy="13" r="8" fill="#81C784"/><path d="M12 5c-4 2-6 6-5 10 2 2 6 2 8 0 2-4 0-9-3-10z" fill="#C8E6C9"/><path d="M9.5 9c-2 3-2 6 0 8" stroke="#4CAF50" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  herb: `<path d="M11 21c-2-6-2-12 1-19" stroke="#43A047" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M14 21c1-5 1-11-1-17" stroke="#66BB6A" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M8.5 20h8" stroke="#F5F5F5" stroke-width="2" stroke-linecap="round"/>`,
  tomato: `<circle cx="12" cy="14" r="7" fill="#E53935"/><path d="M12 5c1 2 3 3 4.5 2-1 2-3 2.2-4.5 2.2S8.5 9 7.5 7C9 8 11 7 12 5z" fill="#43A047"/><path d="M12 9V6" stroke="#2E7D32" stroke-width="1.4" stroke-linecap="round"/>`,
  onion: `<path d="M12 21c-4 0-6-3-6-7 0-4 3-8 6-9 3 1 6 5 6 9 0 4-2 7-6 7z" fill="#CE93D8"/><path d="M12 5V2.5" stroke="#7CB342" stroke-width="1.6" stroke-linecap="round"/><path d="M9 8c-.5 7-.5 10 0 12M15 8c.5 7 .5 10 0 12" stroke="#AB47BC" stroke-width="1" fill="none"/>`,
  carrot: `<path d="M12 22 6.5 11c2-2 9-2 11 0z" fill="#FB8C00"/><path d="M12 9V4M12 8 8.5 5M12 8l3.5-3" stroke="#43A047" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M9 13l1.5 3M13.5 12l1 2" stroke="#E65100" stroke-width="1" stroke-linecap="round"/>`,
  apple: `<path d="M16 7.5c-1.6 0-2.6.8-4 .8s-2.4-.8-4-.8C5.5 7.5 4 10 4 13.5S6.4 21 8.4 21c1 0 1.6-.6 3.6-.6s2.6.6 3.6.6c2 0 4.4-4 4.4-7.5S18.5 7.5 16 7.5z" fill="#EF5350"/><path d="M12 8c0-2 1-3.5 2.5-3.8" stroke="#8D6E63" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M14.5 4.5c2-1.2 3.2.2 3 1.4-2 1-3.2-.2-3-1.4z" fill="#43A047"/>`,
  banana: `<path d="M5 8c1.2 7.5 7.5 11.5 13.5 9 1-.4.8-2-.3-1.8-5 1-9.8-3-10.8-8C7.2 6.4 5 6.6 5 8z" fill="#FDD835"/><path d="M5 8c0-1.2-1-2.2-2.2-2" stroke="#C0A000" stroke-width="1.4" stroke-linecap="round"/><path d="M18 17l1.6.6" stroke="#A1887F" stroke-width="1.4" stroke-linecap="round"/>`,
  pineapple: `<ellipse cx="12" cy="15.5" rx="5" ry="6" fill="#FBC02D"/><path d="M12 9.5c0-4 2-6.5 4.5-6.5-1 3.5-1.2 5.5-4.5 6.5zm0 0c0-4-2-6.5-4.5-6.5 1 3.5 1.2 5.5 4.5 6.5z" fill="#43A047"/><path d="M9 12l6 6M15 12l-6 6" stroke="#C49000" stroke-width=".9"/>`,
  mango: `<path d="M14.5 6c4 1.2 5.8 5.2 4.6 9s-6.2 5.8-10 3.6S7 11 10 8.4c2-1.8 4-2.8 6.5-2.4z" fill="#FFB300"/><path d="M9 11c2.2-1 4.3-.8 6.2 1.2" stroke="#F57F17" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  grape: `<g fill="#9C27B0"><circle cx="9.5" cy="12" r="2.2"/><circle cx="13.5" cy="12" r="2.2"/><circle cx="11.5" cy="15.2" r="2.2"/><circle cx="15.2" cy="15.2" r="2.2"/><circle cx="13.3" cy="18.3" r="2.2"/><circle cx="10.5" cy="9" r="2.2"/></g><path d="M13 9c0-2.2 1.2-4 4-4" stroke="#43A047" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  waxapple: `<path d="M12 6c-1 0-1.4 1-1.4 2C8 9 6.5 12 6.5 15c0 3.6 2.6 5.6 5.5 5.6s5.5-2 5.5-5.6c0-3-1.5-6-4.1-7 0-1-.4-2-1.4-2z" fill="#EC407A"/><path d="M8 14.5c2.4 2 5.6 2 8 0" stroke="#AD1457" stroke-width="1" fill="none"/><path d="M12 6c0-1.4 1-2.6 2.4-2.8" stroke="#43A047" stroke-width="1.4" stroke-linecap="round" fill="none"/>`,
  dragonfruit: `<ellipse cx="12" cy="13.5" rx="6" ry="7" fill="#E91E63"/><g fill="#9CCC65"><path d="M9 7.5c-1-1.2-3-1-2.8 1 1.4-.2 2-.2 2.8-1zM15 7.5c1-1.2 3-1 2.8 1-1.4-.2-2-.2-2.8-1zM6.8 13c-1.4-.6-3 .4-2.4 2 1-.6 1.8-.6 2.4-2zM17.2 13c1.4-.6 3 .4 2.4 2-1-.6-1.8-.6-2.4-2zM10.5 5.5c0-1.6 1-2.6 2-2.6.4 1.6-.2 2.6-2 2.6z"/></g><circle cx="12" cy="14" r="3.4" fill="#F8BBD0"/>`,
  coconut: `<circle cx="12" cy="13" r="8" fill="#8D6E63"/><circle cx="12" cy="13" r="5.4" fill="#A1887F"/><g fill="#4E342E"><circle cx="10" cy="11.5" r="1"/><circle cx="14" cy="11.5" r="1"/><circle cx="12" cy="14.5" r="1"/></g>`,
  kiwi: `<circle cx="12" cy="12" r="8" fill="#8D6E63"/><circle cx="12" cy="12" r="6" fill="#AED581"/><circle cx="12" cy="12" r="2" fill="#F9FBE7"/><g fill="#33691E"><circle cx="12" cy="6.6" r=".5"/><circle cx="12" cy="17.4" r=".5"/><circle cx="6.6" cy="12" r=".5"/><circle cx="17.4" cy="12" r=".5"/><circle cx="8.3" cy="8.3" r=".5"/><circle cx="15.7" cy="8.3" r=".5"/><circle cx="8.3" cy="15.7" r=".5"/><circle cx="15.7" cy="15.7" r=".5"/></g>`,
  lychee: `<circle cx="12" cy="14" r="6.5" fill="#E53935"/><g fill="#B71C1C"><circle cx="9.5" cy="12" r="1.2"/><circle cx="12" cy="11" r="1.2"/><circle cx="14.5" cy="12" r="1.2"/><circle cx="10" cy="15" r="1.2"/><circle cx="13" cy="15.6" r="1.2"/><circle cx="15" cy="15" r="1.2"/></g><path d="M12 7.6V4" stroke="#6D4C41" stroke-width="1.4" stroke-linecap="round"/>`,
  melon: `<path d="M4 8h16c0 7-4 12-8 12S4 15 4 8z" fill="#E53935"/><path d="M4 8h16l-1.4-2H5.4z" fill="#43A047"/><g fill="#212121"><circle cx="10" cy="12" r=".8"/><circle cx="14" cy="12" r=".8"/><circle cx="12" cy="15.5" r=".8"/></g>`,
  citrus: `<circle cx="12" cy="12" r="8" fill="#FB8C00"/><circle cx="12" cy="12" r="5.4" fill="#FFCC80"/><path d="M12 6.6v10.8M6.6 12h10.8M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6" stroke="#FB8C00" stroke-width="1"/>`,
  berry: `<path d="M12 21c-4-1-7-4-7-7.6 0-2 3-3 7-3s7 1 7 3C19 17 16 20 12 21z" fill="#E53935"/><path d="M8 9.5c1.2-3 6.8-3 8 0-2-1-6-1-8 0z" fill="#43A047"/><g fill="#FFF59D"><circle cx="9" cy="13" r=".6"/><circle cx="12" cy="12.2" r=".6"/><circle cx="15" cy="13" r=".6"/><circle cx="10.5" cy="16" r=".6"/><circle cx="13.5" cy="16" r=".6"/></g>`,
  pear: `<path d="M12 7c1 0 1.2 1 1 2 3 1 4 4 4 7 0 3-2 5-5 5s-5-2-5-5c0-3 1.2-6 4-7-.2-1 0-2 1-2z" fill="#9CCC65"/><path d="M12 7V4" stroke="#8D6E63" stroke-width="1.4" stroke-linecap="round"/><path d="M13 5c1.5-1 3-.3 3 .8-1.5.8-2.8.2-3-.8z" fill="#43A047"/>`,
  custardapple: `<circle cx="12" cy="13.6" r="7.5" fill="#9CCC65"/><g fill="#7CB342"><circle cx="9" cy="10.6" r="1.9"/><circle cx="12.5" cy="9.9" r="1.9"/><circle cx="15.4" cy="11.7" r="1.9"/><circle cx="8.7" cy="14.1" r="1.9"/><circle cx="12" cy="13.7" r="1.9"/><circle cx="15.4" cy="15.3" r="1.9"/><circle cx="10.7" cy="17.1" r="1.9"/><circle cx="14" cy="17.4" r="1.9"/></g><path d="M12 6.4V4" stroke="#6D4C41" stroke-width="1.4" stroke-linecap="round"/><path d="M12.5 5.4c1.5-1 3-.3 3 .8-1.5.8-2.8.2-3-.8z" fill="#43A047"/>`,
  pepper: `<path d="M7.5 9.5c-2 1.2-2 5.5-.8 7.6C8 20 10 21 12 21s4-1 5.3-3.9c1.2-2.1 1.2-6.4-.8-7.6-1.2 2-2.5 2.2-4.5 2.2S8.7 11.5 7.5 9.5z" fill="#43A047"/><path d="M12 7.5V4.5M12 4.5c2 0 2.2 2.2 0 3.2" stroke="#2E7D32" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  broccoli: `<g fill="#43A047"><circle cx="8.5" cy="9" r="3.2"/><circle cx="14" cy="7.6" r="3.2"/><circle cx="16" cy="11.6" r="3"/><circle cx="11.5" cy="11" r="3.2"/></g><path d="M8.5 13h7v4c0 1.5-7 1.5-7 0z" fill="#A5D6A7"/>`,
  corn: `<path d="M12 3c3 0 5 3.2 5 9s-2 9-5 9-5-3.2-5-9 2-9 5-9z" fill="#FDD835"/><g fill="#C0A000"><circle cx="10" cy="9" r=".7"/><circle cx="14" cy="9" r=".7"/><circle cx="12" cy="12" r=".7"/><circle cx="10" cy="15" r=".7"/><circle cx="14" cy="15" r=".7"/></g><path d="M7 13c-2.2-1-3.5.2-4.2 2.2 2.2 1 3.5-.2 4.2-2.2z" fill="#7CB342"/>`,
  pumpkin: `<ellipse cx="12" cy="14.5" rx="9" ry="6.8" fill="#FB8C00"/><path d="M12 8v13M8 9c-2 3-2 9 0 11.4M16 9c2 3 2 9 0 11.4" stroke="#EF6C00" stroke-width="1" fill="none"/><path d="M12 8V4.5" stroke="#5D4037" stroke-width="1.6" stroke-linecap="round"/>`,
  eggplant: `<path d="M16.5 8c2.2 2.2 1.2 6.2-2 9.3s-7.3 4.2-9.5 2 0-6.3 3.2-9.5C10.2 7.6 13.3 6.5 16.5 8z" fill="#7B1FA2"/><path d="M15 7c1-2 3.2-2 4.3-.8-1 1-1 2.2-3.3 2.2" fill="#43A047"/>`,
  cucumber: `<path d="M7 7c-2 2-2 5.2 0 7.2l2.8 2.8c2 2 5.2 2 7.2 0s2-5.2 0-7.2L14.2 7c-2-2-5.2-2-7.2 0z" fill="#66BB6A"/><g fill="#388E3C"><circle cx="10" cy="10" r=".7"/><circle cx="12.5" cy="12.5" r=".7"/><circle cx="14.5" cy="11" r=".7"/></g>`,
  pea: `<path d="M5 9c0-2 4-3 8 0s6 3 6 6c0 1-1 2-3 1-1-1-2-4-5-6S5 11 5 9z" fill="#7CB342"/><g fill="#33691E"><circle cx="9" cy="11.5" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="15" cy="14.5" r="1.5"/></g>`,
  tuber: `<g transform="rotate(-15 12 13)"><ellipse cx="12" cy="13" rx="8" ry="5.6" fill="#A1887F"/></g><g fill="#6D4C41"><circle cx="9" cy="11" r=".7"/><circle cx="14" cy="14" r=".7"/><circle cx="12" cy="10.5" r=".7"/></g>`,
  chestnut: `<path d="M12 4.6c1 0 1.2 1 1.5 1.8C16.6 7.6 18 10.4 18 13.3c0 3.2-2.6 5-6 5s-6-1.8-6-5c0-2.9 1.4-5.7 4.5-6.9.3-.8.5-1.8 1.5-1.8z" fill="#8D6E63"/><path d="M6.6 14.4c1.5 1.7 3.3 2.4 5.4 2.4s3.9-.7 5.4-2.4c.3 2.7-2.2 4.4-5.4 4.4s-5.7-1.7-5.4-4.4z" fill="#EFCFA8"/><path d="M12 4.6c0-.7.6-1.3 1.4-1.3" stroke="#5D4037" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  shoot: `<path d="M10 21c-1-6 0-12 4-17 1.4 5 1.2 12-1 17z" fill="#AED581"/><path d="M14 4c2.2 1 3.2 3 2 5.2-1.2-1-2-2.2-2-5.2z" fill="#7CB342"/><path d="M11 9.5c1 1 2.2 1 3.2 0M10.3 13.5c1.2 1 3 1 4 0M9.7 17.5c1.4 1 3.6 1 4.6 0" stroke="#558B2F" stroke-width="1" fill="none"/>`,
  mushroom: `<path d="M5 12c0-4 3-7 7-7s7 3 7 7c0 1-1 1.2-2 1.2H7C6 13.2 5 13 5 12z" fill="#A1887F"/><path d="M10 13.2h4V18c0 1.4-4 1.4-4 0z" fill="#EFEBE9"/>`,
  garlic: `<path d="M12 4c-1.2 2.2-4 3.4-4 9 0 4 2 7 4 7s4-3 4-7c0-5.6-2.8-6.8-4-9z" fill="#FAFAFA" stroke="#E0E0E0"/><path d="M9 8.5c-1 6-1 9 0 11.5M15 8.5c1 6 1 9 0 11.5" stroke="#E0E0E0" stroke-width="1" fill="none"/>`,
  avocado: `<path d="M12 6c1.5 0 2 1.5 2 3 2.5 1.5 3.5 4.5 3.5 7 0 3-2.2 5-5.5 5s-5.5-2-5.5-5c0-2.5 1-5.5 3.5-7 0-1.5.5-3 2-3z" fill="#7CB342"/><path d="M12 8.5c1.6 1 2.4 3 2.4 5.5" stroke="#33691E" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="12" cy="15.5" r="2.6" fill="#8D6E63"/>`,
  // Garden-style crop studies. Their silhouettes and surface cues follow the
  // actual market produce, rather than treating every gourd or root as one crop.
  radish: `<path d="M12 8.3c3.4 0 5.5 2.7 4.7 6.3-.9 4-3.1 6.6-4.7 6.6s-3.8-2.6-4.7-6.6C6.5 11 8.6 8.3 12 8.3z" fill="#F4F0DC"/><path d="M12 9V3.5M11.3 7.2C8.7 6.8 7.1 5.4 7 3.6c2.2.2 3.8 1.4 4.3 3.6M12.7 7.2c2.6-.4 4.2-1.8 4.3-3.6-2.2.2-3.8 1.4-4.3 3.6z" fill="#6B9B63"/><path d="M9.8 12c-.8 2.5-.7 4.9.2 6.8M14.2 12c.8 2.5.7 4.9-.2 6.8" fill="none" stroke="#C9C3A8" stroke-width=".75"/>`,
  bittermelon: `<path d="M9 5.2c2.2-1.8 5.5-1.1 6.5 1.6 1.5 4.1.3 10-3.3 13.2-1.5-2.3-3.7-7.8-3.5-11.7.1-1.3.5-2.3 1.3-3.1z" fill="#8EBA63"/><path d="M10.2 7.1c1.1.5 2.5.5 3.7 0M9.7 10c1.5.7 3.2.7 4.7 0M9.6 13c1.5.7 3.3.7 4.9 0M10.2 16c1.2.6 2.4.6 3.6 0" fill="none" stroke="#547946" stroke-width="1"/><circle cx="12" cy="3.9" r="1.1" fill="#567B43"/>`,
  loofah: `<path d="M6.2 9.6c1.5-2.3 5.5-3.9 8-2.9 3 1.2 3.6 5.4 1.7 8.3-1.8 2.7-5.7 3.7-8.2 2.2-2.7-1.7-3.2-5.1-1.5-7.6z" fill="#9FCB78" transform="rotate(-34 12 12)"/><path d="M7.6 7.6c3.5 2.9 5.6 6 7.1 9.2M6.8 10.6c3.4 2.9 5.5 5.5 7.2 8.4M9.6 6c3.3 2.8 5.5 5.6 7.5 9.1" fill="none" stroke="#5B844C" stroke-width=".8"/><path d="M16.1 7.3l2.2-2" stroke="#50703F" stroke-width="1.2"/>`,
  chayote: `<path d="M12.3 4.8c4.2.7 6.8 4.3 5.7 8.6-1.1 4.2-4.8 7-8.3 6.1-3.6-.9-4.7-5-3-8.8 1.5-3.4 3.7-6.4 5.6-5.9z" fill="#A8C975"/><path d="M12.2 5.3c.4 4.4-.5 9-3.5 12.5M12.2 5.3c3 3.2 4.1 7.3 2.2 11.8M8.2 10.2c2.3.8 4.6.8 7 0" fill="none" stroke="#597C4B" stroke-width=".85"/><path d="M12 5.1V3.4" stroke="#49653F" stroke-width="1.2"/>`,
  waxgourd: `<path d="M5.2 12c0-4.1 3.1-7.2 7.3-7.2 4.1 0 7.2 3.1 7.2 7.2s-3.1 7.2-7.2 7.2C8.3 19.2 5.2 16.1 5.2 12z" fill="#A7C98A"/><path d="M7.4 9.3c2.2-1.3 7.3-1.3 9.6 0M7 13c2.5-1.2 7.8-1.2 10.2 0M8.2 16.3c2-1 5.6-1 7.6 0" fill="none" stroke="#6F9672" stroke-width=".65"/><path d="M12.5 4.9V3.3" stroke="#4F7147" stroke-width="1.25"/>`,
  potato: `<path d="M6.3 10.3C8.4 5.8 15.1 4.6 18 8.6c2.4 3.4.3 9.5-4.4 10.7-4.6 1.2-9.4-4.5-7.3-9z" fill="#B28A61"/><path d="M8.7 10.2l.5.4M13.8 8.4l.5.4M15.7 14.7l.5.4M10.4 16.1l.5.4" stroke="#73563C" stroke-width="1.2"/>`,
  sweetpotato: `<path d="M7.1 8.3c1.5-3.3 6-4.7 8.7-2.1 2.9 2.8 1.4 8.8-2.2 11.3-3.8 2.7-9.2.2-8.1-4.3.4-1.8.8-3.3 1.6-4.9z" fill="#B36362"/><path d="M8 10.1c2.4.5 5.2 2.1 6.8 4.8" fill="none" stroke="#8F4C50" stroke-width=".7"/><path d="M8 8.7l-1.4-1.4" stroke="#6A8043" stroke-width="1.1"/>`,
  ginger: `<path d="M6.5 15.6c-2.2-.6-2.1-3.7.4-4.1-.6-2.9 3.1-4 4.4-1.7.8-3.7 5.2-3 5.2.3 2.7-1.2 4.1 2.1 2.2 3.7 1.8 2.3-.6 5.4-3.1 3.8-2.1 2.6-5.4.5-5.1-1.9-1.9 1.4-4.8-.2-4-2.7z" fill="#D8B07B"/><path d="M8 13.3c1.6.2 2.5 1.2 3 2.7M12.7 10.1c.2 2.2 1.1 3.6 2.9 4.7" fill="none" stroke="#A47E55" stroke-width=".8"/>`,
  taro: `<path d="M8.2 7.6c2.4-3 6.7-2.8 8.3.9 1.6 3.6-.7 8.8-4.3 10.1-3.7 1.3-7.3-2.5-6.5-6.4.3-1.8 1.3-3.5 2.5-4.6z" fill="#80636B"/><path d="M9 8.8c1.8.9 3.8 4.5 3.4 7.8M14.5 8.3c-2 2.8-2.2 5.4-1.1 8.3" fill="none" stroke="#C3B0AD" stroke-width=".7"/>`,
  yam: `<path d="M8.2 6.3c2.2-2.2 6.1-1.6 7.5 1.5 1.3 3 .1 7.6-2.9 10.3-2.2 2-6.4.6-6.5-2.8-.1-3.4-.1-6.4 1.9-9z" fill="#A98462"/><path d="M8.8 8.2c2.5 1.9 3.6 4.5 3.4 7.8" fill="none" stroke="#74533D" stroke-width=".7"/>`,
  burdock: `<path d="M9.2 4.9c1.8-1.1 4.5-.4 5.2 1.5.9 2.4-1.8 10.2-4.8 13.1-1.1-3.3-2.1-11.6-.4-14.6z" fill="#76533C"/><path d="M10 6.8c1.2 2.9 1.2 7.8.1 10.6M12.8 6.5c-.1 3.4-1 6.9-2.5 9.7" fill="none" stroke="#C19B70" stroke-width=".7"/>`,
  lotusroot: `<ellipse cx="12" cy="12" rx="7.6" ry="6.5" fill="#E3D1B0"/><g fill="#9B7657"><circle cx="12" cy="8.4" r="1.05"/><circle cx="8.5" cy="10.2" r="1.05"/><circle cx="15.5" cy="10.2" r="1.05"/><circle cx="9" cy="14.5" r="1.05"/><circle cx="15" cy="14.5" r="1.05"/><circle cx="12" cy="16" r="1.05"/></g>`,
  waterchestnut: `<path d="M7 11c1-4.3 3.1-6.2 5.1-6.2s4.1 1.9 4.9 6.2c.8 4.2-2 8.5-4.9 8.5S6.1 15.2 7 11z" fill="#5B4337"/><path d="M8.1 9.5c1.9-1 5.7-1 7.6 0" fill="none" stroke="#A98C72" stroke-width=".8"/><path d="M12 5V3.2" stroke="#52713F" stroke-width="1.2"/>`,
  jicama: `<path d="M11.8 6c3.7-.1 6.2 2.6 5.5 6.5-.7 3.8-3.2 6.7-5.6 6.7s-5-2.9-5.4-6.7C5.9 8.6 8.2 6.1 11.8 6z" fill="#EBD7B3"/><path d="M11.8 6V3.3M11.2 5.5C9 4.8 7.8 3.5 8.1 2c1.9.4 3 1.5 3.1 3.5M12.5 5.7c2-1.1 3.4-2.6 3.1-4.1-1.8.5-2.8 1.7-3.1 4.1z" fill="#6F9B51"/>`,
  papaya: `<path d="M10.2 5.8c3-1.6 6.4.5 6.8 3.8.5 3.8-2.4 8.6-5.4 9.7-3 1.1-5.4-2-4.9-5.7.4-3.5 1.6-6.4 3.5-7.8z" fill="#F2AD4B"/><path d="M12.1 8.5c1.2 2.3 1.4 5.7.2 8.4" fill="none" stroke="#D47D35" stroke-width=".8"/><path d="M10.6 6.6c-.7-2.1.4-3.5 2.1-3.6.1 1.8-.6 3-2.1 3.6z" fill="#547C49"/>`,
  guava: `<path d="M8.1 7.7c2.1-2.6 6.4-2.5 8 .6 1.8 3.5.2 8.8-3.5 10.2-3.8 1.4-7.5-2.4-6.5-6.2.4-1.8 1-3.3 2-4.6z" fill="#A7C875"/><path d="M8.2 12.2c2.3.8 5.5.7 7.6-.5M10.1 8.4l.2.2M14.2 9l.2.2M10.2 15.6l.2.2" stroke="#65884E" stroke-width=".7" fill="none"/><path d="M10 7.3c.3-2.1 1.7-3.3 3.4-3.2-.4 1.8-1.5 2.9-3.4 3.2z" fill="#517B45"/>`,
  starfruit: `<path d="M12 3.7 14.4 8l4.8.8-3.5 3.4.8 4.8-4.5-2.1-4.4 2.2.7-4.9-3.5-3.3 4.8-.9z" fill="#F1C958"/><path d="M12 4.1v10.5M7.2 9l9.6 4.5M16.8 9l-9.6 4.5" fill="none" stroke="#A88B36" stroke-width=".7"/>`,
  passionfruit: `<circle cx="12" cy="12.5" r="7.2" fill="#744D74"/><path d="M6.2 10.1c3.4-1.5 8.1-1.3 11.6.7M7 14.7c3.3-1.1 6.9-1 10 .1" fill="none" stroke="#A87DA1" stroke-width=".75"/><path d="M12 5.3V3.4" stroke="#567849" stroke-width="1.2"/>`,
  durian: `<path d="M12.1 4.4c4.8 0 7.4 4.4 5.9 9.2-1.3 4.2-4 6.6-5.9 6.6-2 0-4.7-2.4-6-6.6-1.5-4.8 1.2-9.2 6-9.2z" fill="#B5AF56"/><path d="m8 7.1 1 .8m-1.8 2.7 1.4.4m-1.1 3.4 1.5-.1m6.7-7.2-1 .8m1.8 2.7-1.4.4m1.1 3.4-1.5-.1M12.1 5.2v2.1m0 8.5v2.4" stroke="#6B7440" stroke-width="1.2"/>`,
  jackfruit: `<path d="M11.9 4.7c4.1 0 6.6 3.7 5.5 8.2-1 4-3.4 6.8-5.5 6.8s-4.6-2.8-5.5-6.8c-1.1-4.5 1.4-8.2 5.5-8.2z" fill="#90A850"/><path d="M8.3 8.5l1.1.8m-1.7 2.8 1.3.4m-.8 3.2 1.2-.2m6.2-7  -1.1.8m1.7 2.8-1.3.4m.8 3.2-1.2-.2M12 6.5v11" stroke="#5A713C" stroke-width=".85"/>`,
  persimmon: `<path d="M8 8.8c2.1-2.5 5.9-2.5 8 0 2.3 2.8 1.2 7.7-1.5 9.5-1.4 1-3.6 1-5 0-2.7-1.8-3.8-6.7-1.5-9.5z" fill="#E8793D"/><path d="M12 7.2c-1.5-1.9-3.2-2-4.1-.6 1.6.7 2.8.9 4.1.6zm0 0c1.5-1.9 3.2-2 4.1-.6-1.6.7-2.8.9-4.1.6z" fill="#637B42"/><path d="M12 6.8V4.5" stroke="#5A663D" stroke-width="1.1"/>`,
  watermelon: `<path d="M4.5 8.2h15c-.4 6.7-3.5 10.8-7.5 10.8S4.9 14.9 4.5 8.2z" fill="#D85B56"/><path d="M4.5 8.2h15l-1.3-2.5H5.8z" fill="#5E9B59"/><path d="M8.1 11.3c2.2-.8 5.8-.8 7.8 0M8.8 15.2c1.8-.6 4.5-.6 6.4 0" fill="none" stroke="#A94748" stroke-width=".8"/><g fill="#3F4A36"><circle cx="10" cy="12.7" r=".65"/><circle cx="14" cy="12.7" r=".65"/><circle cx="12" cy="16" r=".65"/></g>`,
  cantaloupe: `<path d="M5.7 9c2.1-4.6 10.6-5.7 13.2 0 2.2 4.8-2 10.4-6.6 10.4S3.5 13.8 5.7 9z" fill="#E9C96A"/><path d="M7.7 8.1c1 3.1 1 6.5.1 9.3M12.2 6.8v11.9M16.4 8.2c-1 3.1-1 6.4-.1 9.2" fill="none" stroke="#B4934D" stroke-width=".7"/><path d="M12.3 6.5V4.1" stroke="#567449" stroke-width="1.2"/>`,
  longan: `<g fill="#B88958"><circle cx="9.2" cy="12.4" r="3.6"/><circle cx="14" cy="10.1" r="3.6"/><circle cx="14.9" cy="15" r="3.6"/></g><path d="M9.2 12.4h0m4.8-2.3h0m.9 4.9h0" stroke="#73523B" stroke-width=".8"/><path d="M13.7 6.9V4" stroke="#607746" stroke-width="1.2"/>`,
  blueberry: `<g fill="#5D719B"><circle cx="9.2" cy="12.4" r="3.5"/><circle cx="14.1" cy="10.1" r="3.5"/><circle cx="14.8" cy="15" r="3.5"/></g><g fill="#D6D5D0"><circle cx="9.2" cy="12.4" r=".8"/><circle cx="14.1" cy="10.1" r=".8"/><circle cx="14.8" cy="15" r=".8"/></g><path d="M13.6 6.8V4" stroke="#5C7D4E" stroke-width="1.1"/>`,
  cherry: `<path d="M11.5 9.1c-2.5-1.8-4.6-3.8-4-6.1 2.5.6 3.8 2.7 4 6.1zm1 .1c1.8-2.2 3.7-3.4 5.9-2.6-.9 2-2.8 2.8-5.9 2.6z" fill="#5B8049"/><path d="M11.5 8.2c-.9 2.2-1.4 4.6-1.5 7M13.1 8.6c.8 1.7 1.3 3.8 1.5 6.2" fill="none" stroke="#557446" stroke-width="1.1"/><g fill="#C84D52"><circle cx="9.7" cy="16.3" r="3.4"/><circle cx="14.7" cy="15.6" r="3.4"/></g><path d="M8.4 15.2c.8-.6 1.6-.7 2.4-.2m2.7-.5c.8-.5 1.6-.5 2.4 0" fill="none" stroke="#A13D47" stroke-width=".7"/>`,
  peach: `<path d="M12.3 6.1c3.7-.5 6.2 2.4 5.7 6.1-.5 4.1-3.4 7.3-5.8 7.3-2.5 0-5.4-3.2-5.8-7.3-.4-3.7 2.1-6.6 5.9-6.1z" fill="#E99B84"/><path d="M12.2 6.7c-1.1 3.9-.9 7.6.3 11" fill="none" stroke="#C96C64" stroke-width=".75"/><path d="M12.2 6.8c.2-2.1 1.5-3.4 3.4-3.5-.6 1.9-1.7 3-3.4 3.5z" fill="#5E864B"/>`,
  cabbage: `<path d="M5 12c0-4.7 3.2-7.8 7-7.8s7 3.1 7 7.8-3.2 7.8-7 7.8-7-3.1-7-7.8z" fill="#8DB76F"/><path d="M12 4.8c-1.9 2.3-2.5 5.2-1.5 8.6m1.5-8.6c2.4 1.7 3.4 4.4 2.7 7.8M6 11.5c2.1-1.6 4.2-1.4 6 0 1.9-1.4 4-1.6 6 0M7.5 15.7c2-1.1 4-1 5.8.3 1.2-1 2.3-1.4 3.2-1.4" fill="none" stroke="#527849" stroke-width=".8"/>`,
  bokchoy: `<path d="M11.8 20.5c-1.8-4.6-1.6-9.2.1-14.3M8.5 19.8c1.5-3.4 2-7.2 1.8-11.5M15.2 19.8c-1.4-3.4-1.8-7.2-1.6-11.5" fill="none" stroke="#E5E7C7" stroke-width="2.1"/><path d="M11.9 7.6C8 6.9 6.2 4.8 6.7 3c2.8.1 4.6 1.8 5.2 4.6zm.5.1c3.8-.8 5.7-2.9 5.2-4.7-2.8.2-4.6 1.8-5.2 4.7zM10.6 12.8C7.5 12.4 5.8 10.7 6.1 9c2.4.1 4 1.3 4.5 3.8zm2.8 0c3.1-.4 4.8-2.1 4.5-3.8-2.4.1-4 1.3-4.5 3.8z" fill="#72A865"/>`,
  spinach: `<path d="M12 20.5c-4.8-3-6.4-7.6-4.5-11.4C9 6.1 11.2 5.4 12 3c.8 2.4 3 3.1 4.5 6.1 1.9 3.8.3 8.4-4.5 11.4z" fill="#4D9658"/><path d="M12 4.4v14.1M8.1 10.1c1.4.9 2.7 1.3 3.9 1.2m3.9-1.2c-1.4.9-2.7 1.3-3.9 1.2m-3.3 4c1.1.6 2.2.8 3.3.7m3.3-.7c-1.1.6-2.2.8-3.3.7" fill="none" stroke="#2D683D" stroke-width=".75"/>`,
  waterSpinach: `<path d="M11.5 21c-1-5.5-1.6-10.8-4.5-15.8M12.7 21c.7-5.7.9-10.9 4.2-15.6" fill="none" stroke="#65935B" stroke-width="1.4"/><path d="M7.8 10.2c-3-.9-3.6-3.2-2.6-4.6 2.2.8 3.1 2.3 2.6 4.6zm.8 3.4c-3.1-.1-4.2-2.2-3.7-3.9 2.3.2 3.6 1.4 3.7 3.9zm7.5-3.7c3-.9 3.6-3.2 2.6-4.6-2.2.8-3.1 2.3-2.6 4.6zm-.8 3.4c3.1-.1 4.2-2.2 3.7-3.9-2.3.2-3.6 1.4-3.7 3.9z" fill="#58A162"/><path d="M11.5 20.5h1.2" stroke="#E1D9A4" stroke-width="1.8"/>`,
  amaranth: `<path d="M12 21V5" stroke="#8B5F4D" stroke-width="1.3"/><g fill="#6C9E59"><path d="M11.3 9C8.4 8.8 7 7.3 7.3 5.8c2.2.2 3.6 1.3 4 3.2zM12.7 9c2.9-.2 4.3-1.7 4-3.2-2.2.2-3.6 1.3-4 3.2zM11.3 13.1c-3-.2-4.7-1.8-4.4-3.5 2.5.1 4.1 1.3 4.4 3.5zM12.7 13.1c3-.2 4.7-1.8 4.4-3.5-2.5.1-4.1 1.3-4.4 3.5z"/></g><path d="M12 15.3c-2.3-.1-3.8-1.4-3.6-3 2 .1 3.2 1.1 3.6 3zm0 0c2.3-.1 3.8-1.4 3.6-3-2 .1-3.2 1.1-3.6 3z" fill="#9A5464"/>`,
  mustardGreen: `<path d="M11.8 20.5c-.6-5.7-.4-11.1.2-16.3" stroke="#DFE3B5" stroke-width="1.9"/><path d="M11.7 8.7C7.5 8.2 5.8 5.6 6.8 3.4c2.9.4 4.6 2 4.9 5.3zm.6 0c4.2-.5 5.9-3.1 4.9-5.3-2.9.4-4.6 2-4.9 5.3zM11.4 14.3C7.6 13.8 5.6 11.5 6.6 9.5c2.7.3 4.5 1.9 4.8 4.8zm1.2 0c3.8-.5 5.8-2.8 4.8-4.8-2.7.3-4.5 1.9-4.8 4.8z" fill="#4A8248"/><path d="M8.2 6.4l2.5 1m5.1-1-2.5 1M8 12.1l2.6 1m5.4-1-2.6 1" stroke="#B9D181" stroke-width=".65"/>`,
  lettuce: `<path d="M6.1 16.8c-2-5.5 1.7-11.4 5.8-11.4 2.1 0 3.5 1.1 4.7 2.8 3.1 4.4.4 10.8-4.7 10.8-2.7 0-4.8-.7-5.8-2.2z" fill="#9BCB78"/><path d="M6.7 12.2c2.1-1.4 3.9-.6 5.3.9 1.6-1.7 3.6-2.1 5.3-.8M8.3 16c1.3-1.1 2.6-.6 3.7.4 1.2-1.1 2.6-1.4 3.8-.3M12 6.4v10.3" fill="none" stroke="#5F9B54" stroke-width=".75"/>`,
  fern: `<path d="M12 21V4" stroke="#4D7848" stroke-width="1.2"/><path d="M11.5 8.1C8.2 8.3 6.1 6.7 6 4.5c2.8.1 4.7 1.3 5.5 3.6zm1 3.7c3.3.2 5.4-1.4 5.5-3.6-2.8.1-4.7 1.3-5.5 3.6zM11.5 15.2C8.2 15.4 6.1 13.8 6 11.6c2.8.1 4.7 1.3 5.5 3.6zm1 3.7c3.3.2 5.4-1.4 5.5-3.6-2.8.1-4.7 1.3-5.5 3.6z" fill="#76A864"/>`,
  swissChard: `<path d="M11.9 21c-1.3-4.5-1.2-9.3.1-15" stroke="#D36C5F" stroke-width="1.6"/><path d="M11.9 8.4c-4.1-.7-5.8-3.4-4.9-5.7 3 .3 4.7 2.2 4.9 5.7zm.2 0c4.1-.7 5.8-3.4 4.9-5.7-3 .3-4.7 2.2-4.9 5.7zM11.8 14.3c-3.7-.6-5.4-2.8-4.6-5 2.7.2 4.4 1.9 4.6 5zm.4 0c3.7-.6 5.4-2.8 4.6-5-2.7.2-4.4 1.9-4.6 5z" fill="#74A65E"/><path d="M8.6 5.5l2.7 1.8m4.1-1.8-2.7 1.8M8.7 12l2.6 1.3m4.1-1.3-2.6 1.3" stroke="#C7D184" stroke-width=".6"/>`,
  beet: `<path d="M12 20.5c-3.2-2.1-4.7-5.3-3.9-8.5.7-3 2.4-4.9 3.9-4.9s3.2 1.9 3.9 4.9c.8 3.2-.7 6.4-3.9 8.5z" fill="#A34E61"/><path d="M12 7.7V3.1M11.3 6.8C8.6 6.5 7 4.9 7 3.1c2.3.1 3.9 1.3 4.3 3.7zm1.4 0c2.7-.3 4.3-1.9 4.3-3.7-2.3.1-3.9 1.3-4.3 3.7z" fill="#689A55"/><path d="M9.9 13.2c1.1-.7 2.3-.7 3.4 0m-3.2 2.8c1.1-.7 2.1-.7 3.1 0" fill="none" stroke="#7D3446" stroke-width=".7"/>`,
  basil: `<path d="M12 21c-.6-6.2-.5-11.4.3-16" stroke="#5C7B43" stroke-width="1.1"/><path d="M11.8 10.3C8.3 9.7 7 7.1 8 4.9c2.5.5 3.9 2.2 3.8 5.4zm.7 3.8c3.3-.7 4.6-3.3 3.5-5.4-2.4.6-3.6 2.5-3.5 5.4zm-1.1 2.1c-3-.3-4.3-2.3-3.6-4.2 2.3.3 3.6 1.7 3.6 4.2z" fill="#4C8A52"/><path d="M12 6.3c.4-2 1.8-3.2 3.5-3-.5 1.9-1.6 2.9-3.5 3z" fill="#78A65B"/>`,
  cilantro: `<path d="M12 21V7" stroke="#537A4A" stroke-width="1.1"/><g fill="#78A760"><path d="M11.7 9.2C8.9 8.5 7.9 6.7 8.6 5.3c2 .5 3.1 1.7 3.1 3.9zM12.3 9.2c2.8-.7 3.8-2.5 3.1-3.9-2 .5-3.1 1.7-3.1 3.9zM11.5 13.2c-3-.5-4.3-2.5-3.5-4.2 2.2.4 3.5 1.8 3.5 4.2zM12.5 13.2c3-.5 4.3-2.5 3.5-4.2-2.2.4-3.5 1.8-3.5 4.2zM11.4 17.1c-2.8-.4-4.2-2.1-3.4-3.8 2.1.3 3.4 1.7 3.4 3.8zM12.6 17.1c2.8-.4 4.2-2.1 3.4-3.8-2.1.3-3.4 1.7-3.4 3.8z"/></g>`,
  parsley: `<path d="M12 21V5" stroke="#4F7147" stroke-width="1.15"/><g fill="#5F9954"><circle cx="9" cy="8" r="2.2"/><circle cx="14.5" cy="7" r="2.3"/><circle cx="7.7" cy="12.5" r="2.1"/><circle cx="13" cy="12" r="2.4"/><circle cx="16.4" cy="14.4" r="2"/><circle cx="9.7" cy="16.4" r="2.2"/></g>`,
  celery: `<path d="M9.3 21c.1-5.8.3-11.5 1.8-16.8M12 21c-.2-6.1.1-11.6 1.3-17M14.6 21c-.6-5.6-1.1-11.1-.1-16.4" stroke="#77A55C" stroke-width="1.55"/><path d="M11.1 7.4C8.4 7.2 7.1 5.7 7.5 4c2 .2 3.2 1.3 3.6 3.4zm2.2-.4c2.7-.6 3.8-2.3 3.2-4-2 .5-3.1 1.7-3.2 4zm-2.5 4.6c-2.4.4-3.9-.7-4.1-2.4 1.8-.2 3.1.6 4.1 2.4zm3.8 0c2.4.4 3.9-.7 4.1-2.4-1.8-.2-3.1.6-4.1 2.4z" fill="#649752"/>`,
  fennel: `<path d="M12 21c.1-6 .2-11.8 0-17.7" stroke="#567948" stroke-width="1.1"/><path d="M12 11c-3.5-1.2-5.2-3.7-4.6-6.1 2.7.8 4.2 2.7 4.6 6.1zm0 0c3.5-1.2 5.2-3.7 4.6-6.1-2.7.8-4.2 2.7-4.6 6.1zM12 15.3c-3.5-1.2-5.2-3.7-4.6-6.1 2.7.8 4.2 2.7 4.6 6.1zm0 0c3.5-1.2 5.2-3.7 4.6-6.1-2.7.8-4.2 2.7-4.6 6.1z" fill="none" stroke="#78A86B" stroke-width=".7"/>`,
  scallion: `<path d="M8.5 20.5c.5-5.8.7-11.2-.5-16.2M11.5 20.5c.3-6 .8-11.6.2-17M14.5 20.5c-.2-5.8.1-11.5 1.1-16.5" fill="none" stroke="#4B8B52" stroke-width="1.75"/><path d="M8.5 20.5h6" stroke="#F0EEE0" stroke-width="3.2"/><path d="M8.5 20.5h6" stroke="#BFCFA4" stroke-width=".65"/>`,
  chive: `<path d="M7 20.5c1.6-5.7 2-10.8 1.1-15.5M10 20.5c1.1-6 1.9-11.2 1-16.5M13 20.5c.3-5.8 1.2-11.3 2.9-16M16 20.5c-.7-5.2-.5-10.3.5-14.3" fill="none" stroke="#4B8B50" stroke-width="1.5"/><path d="M7 20.5h9" stroke="#E9E4C8" stroke-width="1.6"/>`,
  lemongrass: `<path d="M7.2 20.5c2.4-5.4 3.1-10.9 2.1-16.8M10 20.5c1.5-6 2.1-11.7 1.6-17M12.8 20.5c.6-5.9 1.9-11.3 3.8-16.1M15.6 20.5c-.3-5.2.8-10 2.2-13.8" fill="none" stroke="#7D9E50" stroke-width="1.55"/><path d="M7.2 20.5h8.4" stroke="#E8E5BD" stroke-width="2"/>`,
  greenbean: `<path d="M7.5 6.2c-2.3 3.7-1.7 10.1 1.3 12.3 2.9 2.1 6.3-.7 6-4.1-.3-3.6-2.6-6.2-5.3-7.9z" fill="#5F9851"/><path d="M8.5 8.1c1.1 2.4 2 4.9 2.5 7.8" fill="none" stroke="#B3CE79" stroke-width=".75"/><path d="M8.1 6.8 6.8 4.4" stroke="#507240" stroke-width="1.1"/>`,
  edamame: `<path d="M5.6 9.4c.7-3 4.2-4.4 7.2-3.1 3.5 1.5 5.3 5.7 3.5 8.7-1.9 3.1-6.4 3.8-8.9 1.4-1.8-1.8-2.3-4.6-1.8-7z" fill="#78A854"/><g fill="#3F7443"><circle cx="8.9" cy="11.4" r="1.5"/><circle cx="12" cy="12.6" r="1.5"/><circle cx="14.5" cy="14.5" r="1.5"/></g><path d="M6.4 9.1 5.1 7.3" stroke="#4E7141" stroke-width="1.1"/>`,
  peanut: `<path d="M8.8 8.1c2.1-2.2 5.8-.6 5.1 2.3 2.9.3 3.3 4.2.5 5.1.4 3-3.5 4.7-5.2 2.4-2.7 1.1-4.5-2.2-2.8-4.3-1.7-2.5.2-5.8 2.4-5.5z" fill="#D5A76E"/><path d="M8.5 11.2c1.7-.3 3.4.9 3.7 2.8M8.8 15.7c1.8-.7 3.9-.1 5 1.4" fill="none" stroke="#A97D52" stroke-width=".7"/>`,
  okra: `<path d="M12.2 4.3c3.2 3.8 3.5 9.7.3 15.7-3.4-5.4-4.5-11.2-.3-15.7z" fill="#6FA653"/><path d="M12.2 5.8v11.8M9.1 8.7l3.1 1.8m3-1.8-3 1.8M8.6 12.3l3.6 1.4m3.5-1.4-3.5 1.4" fill="none" stroke="#3E7542" stroke-width=".75"/><path d="M12.2 4.6V2.8" stroke="#4C6B3D" stroke-width="1.2"/>`,
  bambooshoot: `<path d="M12 3.8c3.6 3.6 4 10.6 1.1 16.3H8.9C7 14.4 8.1 7.5 12 3.8z" fill="#D7C778"/><path d="M8.9 15.3c2.3 1.4 4.4 1.4 6.2 0M8.7 11.2c2.3 1.4 4.7 1.4 6.7 0M9.5 7.5c1.8 1 3.4 1 5 0" fill="none" stroke="#A99854" stroke-width=".8"/>`,
  waterbamboo: `<path d="M10.3 20.5c-1.5-4.8-1.6-10.4.3-16.9h3c1.2 5.9.9 11.3-1.2 16.9z" fill="#EAE4B3"/><path d="M10.6 7.8c1.4 1 2.4 1 3.5 0m-4 4.2c1.6 1 3 1 4.1 0m-4.4 4.3c1.8 1 3.5 1 4.7 0" fill="none" stroke="#AAA86C" stroke-width=".75"/><path d="M11.1 4.2 9.3 2.7m3.8 1.5 1.7-1.5" stroke="#6B8D50" stroke-width="1.1"/>`,
  shiitake: `<path d="M4.8 12.1c.1-4.6 3.2-7.7 7.2-7.7 4.1 0 7.2 3.1 7.2 7.7 0 .8-.7 1.4-1.5 1.4H6.3c-.8 0-1.5-.6-1.5-1.4z" fill="#84664D"/><path d="M10 13.5h4v5.2c0 1.5-4 1.5-4 0z" fill="#E4D8BD"/><path d="M7.3 10.9c2.6-2 6.7-2.1 9.4-.1" fill="none" stroke="#B89770" stroke-width=".7"/>`,
  woodear: `<path d="M7.1 7.2c3.5-2.4 6.7-1.6 7.4.9 3.7-.7 5.2 2.5 3.4 4.8 1.6 3.2-2 5.4-4.4 3.8-2.7 2.6-6.7.1-5.4-3.2-2.4-2.1-2.8-4.8-1-6.3z" fill="#4F3D36"/><path d="M8.4 10.2c2.4-1.5 5.1-1.3 7.5.5M9.1 14.6c2.1-1.1 4.3-.9 6.1.3" fill="none" stroke="#937662" stroke-width=".75"/>`,
  oysterMushroom: `<path d="M6.1 12.3c.4-3.8 3-5.4 5.7-3.6 1.6-3.2 5.5-2.6 6.2.5.6 2.8-1.9 4.7-4.4 3.6-.1 2.7-3.8 3.5-5.4 1.4-1.4.2-2.3-.6-2.1-1.9z" fill="#D5C9AF"/><path d="M10.5 12.2c.3 2.1.1 4.1-.6 6.1m3.5-5.6c.1 1.9.7 3.6 1.8 5.1" fill="none" stroke="#9C917F" stroke-width=".75"/>`,
  shimeji: `<g fill="#A98362"><path d="M6.3 12.4c.1-3 1.8-5 3.8-5s3.7 2 3.8 5z"/><path d="M11.8 11.7c.1-3.2 1.9-5.3 4-5.3s3.9 2.1 4 5.3z"/></g><path d="M8.3 12.4h2.4v6.1c0 1.1-2.4 1.1-2.4 0zm6.3-.7H17v6.8c0 1.1-2.4 1.1-2.4 0z" fill="#E8DDC5"/><path d="M6.5 10.4c1.6-1.1 3.2-1.1 4.8 0m.9-.7c1.7-1.2 3.5-1.2 5.2 0" fill="none" stroke="#795B47" stroke-width=".65"/>`,
  strawMushroom: `<path d="M7 11.9c0-3.8 2.2-6.5 5-6.5s5 2.7 5 6.5c0 .7-.6 1.2-1.3 1.2H8.3c-.7 0-1.3-.5-1.3-1.2z" fill="#9E9A82"/><path d="M10 13.1h4v5.1c0 1.4-4 1.4-4 0z" fill="#EDE8D6"/><path d="M8.7 9.8c2-.9 4.7-.9 6.6 0" fill="none" stroke="#716C5B" stroke-width=".75"/>`,
  buttonMushroom: `<path d="M5.2 12.2c0-4.1 3-6.9 6.8-6.9s6.8 2.8 6.8 6.9c0 .7-.6 1.2-1.3 1.2H6.5c-.7 0-1.3-.5-1.3-1.2z" fill="#EEE8D8"/><path d="M9.8 13.4h4.4v5.1c0 1.4-4.4 1.4-4.4 0z" fill="#D5CDBD"/><path d="M7.1 10.7c2.7-1.1 7.1-1.1 9.8 0" fill="none" stroke="#B2A998" stroke-width=".65"/>`,
  enoki: `<g stroke="#E6DFBF" stroke-width="1.6"><path d="M7.8 20.5C8 14 7.4 9.6 6.1 6.4M10.5 20.5c.1-7.2-.1-12.2-.8-16.2M13.2 20.5c-.2-6.7.2-11.4 1-15.5M15.9 20.5c-.6-6.1 0-10.5 1.6-13.6"/></g><g fill="#CDAE78"><circle cx="6.1" cy="5.5" r="1.8"/><circle cx="9.7" cy="3.7" r="1.8"/><circle cx="14.2" cy="4.5" r="1.8"/><circle cx="17.5" cy="6" r="1.8"/></g>`,
  kingOyster: `<path d="M7 9.2c0-3.2 2.2-5.2 5-5.2s5 2 5 5.2c0 .7-.5 1.2-1.2 1.2H8.2c-.7 0-1.2-.5-1.2-1.2z" fill="#B7A98D"/><path d="M9.5 10.4h5v8.1c0 2-5 2-5 0z" fill="#ECE5D2"/><path d="M8.3 8.1c2.1-1 5.3-1 7.4 0" fill="none" stroke="#827760" stroke-width=".7"/>`,
  mangosteen: `<path d="M8.1 8.1c2.1-2.4 5.9-2.4 7.8 0 2.1 2.7 1.3 7.5-1.5 9.5-1.3.9-3.3.9-4.6 0-2.8-2-3.8-6.8-1.7-9.5z" fill="#693F70"/><path d="M12 7.3c-1.9-2.1-3.6-2.2-4.6-.3 1.9.7 3.4.8 4.6.3zm0 0c1.9-2.1 3.6-2.2 4.6-.3-1.9.7-3.4.8-4.6.3z" fill="#63894E"/><path d="M9.1 13.1c1.8.8 4 .8 5.8 0" fill="none" stroke="#A1769E" stroke-width=".7"/>`,
  plum: `<path d="M8 8.5c2.2-2.8 6-2.6 8 .2 2.2 3 .9 7.9-2 9.6-2.8 1.7-6.3-.3-7.2-3.8-.6-2.2-.2-4.3 1.2-6z" fill="#8B4D71"/><path d="M9.5 10.4c1.3-.6 2.8-.6 4.2 0m-4.8 3.8c1.7-.7 3.7-.6 5.3.2" fill="none" stroke="#B67896" stroke-width=".7"/><path d="M10.4 7.4c.2-2 1.5-3.3 3.3-3.4-.5 1.9-1.6 3-3.3 3.4z" fill="#5D8047"/>`,
  rambutan: `<path d="M8 8.1c2.2-2.6 6-2.6 8 0 2.2 2.9.9 7.9-2.1 9.7-2.8 1.7-6.1-.2-7.1-3.7-.7-2.3-.3-4.4 1.2-5.9z" fill="#C75856"/><path d="m8 7.7-1.4-1.5m2.1.3-1.9-1m4.2.5V4.1m3.1 2.1 1.3-1.6m.2 3.4 2-1m-1 3.7 2 .1m-2 3.5 1.8 1.1m-3.4 1.6.6 1.8m-4 .1-.5 1.8m-3.2-2.1-1.4 1.5m.2-3.5-1.9.7m.8-3.7-1.9-.3" stroke="#749150" stroke-width="1"/><path d="M10.2 11.1c1.1-.5 2.5-.5 3.6 0m-4.1 3.4c1.4-.6 3-.5 4.3.2" fill="none" stroke="#933C43" stroke-width=".65"/>`,
  canistel: `<path d="M10.3 5.9c3.3-1.8 6.8.6 6.8 4.2 0 3.6-2.8 8.1-5.7 8.9-3.1.8-5.3-2.7-4.5-6.2.7-3.2 1.7-5.6 3.4-6.9z" fill="#E9B54B"/><path d="M10.1 9.5c2.1 1.4 3.4 3.3 3.8 5.7" fill="none" stroke="#C78036" stroke-width=".75"/><path d="M10.8 6.9c-.2-2.1 1.1-3.5 2.9-3.7-.2 1.9-1.2 3.1-2.9 3.7z" fill="#638447"/>`,
  olive: `<path d="M8.7 8.1c2-2.4 5.3-2.3 6.8.4 1.7 3.1.2 7.8-2.8 9.1-3.1 1.3-6.1-1.8-5.3-4.9.3-1.7.6-3.1 1.3-4.6z" fill="#809B52"/><path d="M9.5 10.5c1.9.8 3.5 2.2 4.5 4.2" fill="none" stroke="#586F40" stroke-width=".65"/><path d="M10.3 7.7c.2-1.9 1.5-3 3.2-3-.4 1.7-1.4 2.7-3.2 3z" fill="#4B713F"/>`,
  sugarcane: `<path d="M8.1 20.6 10 3.5m3.2 17.1L14 3.5m2.7 17.1L18 4.3" stroke="#78A452" stroke-width="2.2"/><path d="m8.5 16.8 8-.2M9 12.6l8-.2M9.5 8.4l8-.2" stroke="#D4DC99" stroke-width=".8"/><path d="M14.1 5.2c-2.4-.4-3.6-1.8-3.2-3.3 1.8.3 3 1.3 3.2 3.3zm1.1 2.5c2.4-.7 3.8-2.3 3.5-4-1.9.4-3.1 1.6-3.5 4z" fill="#5F8E4D"/>`,
  lily: `<path d="M12 20.8V9" stroke="#5A854A" stroke-width="1.15"/><path d="M12 11.8C8.1 9.4 6.1 6 7.3 3.6c2.7.8 4.2 3 4.7 6.1zm0 0c3.9-2.4 5.9-5.8 4.7-8.2-2.7.8-4.2 3-4.7 6.1zM12 11.8c-3.5 1.9-5 5.1-3.6 7.2 2.5-1.1 3.7-3.2 3.6-7.2zm0 0c3.5 1.9 5 5.1 3.6 7.2-2.5-1.1-3.7-3.2-3.6-7.2z" fill="#F6E7EF"/><path d="M12 5.8v6.7M9 7.1l3 4.7m3-4.7-3 4.7" stroke="#D692A7" stroke-width=".65"/><circle cx="12" cy="11.7" r="1.2" fill="#D89A48"/>`,
  orchid: `<path d="M12 20.5V11" stroke="#5B804A" stroke-width="1.1"/><path d="M12 12c-3.8-4-5.4-7.2-3.6-8.7 1.7 1.3 2.9 3.7 3.6 6.7.7-3 1.9-5.4 3.6-6.7 1.8 1.5.2 4.7-3.6 8.7z" fill="#B98CBF"/><path d="M12 12c-3.2-.6-5.4.9-5.1 3.1 2.3.2 4.1-.7 5.1-3.1zm0 0c3.2-.6 5.4.9 5.1 3.1-2.3.2-4.1-.7-5.1-3.1z" fill="#D8B1D6"/><circle cx="12" cy="12.1" r="1.6" fill="#E5B65F"/>`,
  chrysanthemum: `<path d="M12 21v-8" stroke="#5B814A" stroke-width="1.1"/><g fill="#E4B95E"><path d="M12 12.6C8.7 10.2 6.7 7.1 8.2 5.7c2.2 1.2 3.6 3.5 3.8 5.8zM12 12.6c3.3-2.4 5.3-5.5 3.8-6.9-2.2 1.2-3.6 3.5-3.8 5.8zM12 12.6C8.2 12.2 5.3 10.6 5 8.5c2.5-.5 4.8.8 7 2.7zm0 0c3.8-.4 6.7-2 7-4.1-2.5-.5-4.8.8-7 2.7zM12 12.6c-2.7 2.8-3.7 5.9-1.8 7.1 1.8-1.6 2.3-4 1.8-7.1zm0 0c2.7 2.8 3.7 5.9 1.8 7.1-1.8-1.6-2.3-4-1.8-7.1z"/></g><circle cx="12" cy="12.5" r="1.8" fill="#8D683A"/>`,
  carnation: `<path d="M12 21V12" stroke="#668451" stroke-width="1.1"/><path d="M8.1 12.5c-2.1-2.7-1.6-5.9.6-7.4 1.4 1.3 2.2 2.9 2.3 4.7.7-2.3 2.1-4 4-4.8 1.8 2.2.5 5.2-1.7 6.5 2.5.2 4.3 1.7 4.5 3.9-2.5.5-4.7-.5-5.9-2.1-1.4 1.3-3.1 1.4-4.7-.8z" fill="#D97A91"/><path d="M8.3 9.1c1.2-.6 2.3-.5 3.2.5m1.2-.5c1.1-.8 2.1-.7 3.1.1m-5.4 4.1c1 .4 2.1.3 3-.4" fill="none" stroke="#A84E67" stroke-width=".65"/>`,
  rose: `<path d="M12 21V13" stroke="#5A7A46" stroke-width="1.1"/><path d="M12 13c-4-1.3-5.8-4.9-3.9-7.9 1.3-2.1 4.6-2.4 6.4-.7 2.3 2.1 1.7 6.6-2.5 8.6z" fill="#C85D6E"/><path d="M8.3 7.7c2.4-2 5.2-1.3 6.3.9M9.4 10.9c1.2-1.8 3.4-2.1 5.1-.7m-4.1 2c.9-.9 2-1 2.9-.2" fill="none" stroke="#963A50" stroke-width=".75"/><path d="M12 17c-2.1-.4-3-1.7-2.8-3.4 1.8.4 2.7 1.5 2.8 3.4z" fill="#65944E"/>`,
  sunflower: `<path d="M12 21V13" stroke="#607E45" stroke-width="1.2"/><g fill="#E7B94C"><ellipse cx="12" cy="7" rx="2.1" ry="4"/><ellipse cx="12" cy="7" rx="2.1" ry="4" transform="rotate(45 12 7)"/><ellipse cx="12" cy="7" rx="2.1" ry="4" transform="rotate(90 12 7)"/><ellipse cx="12" cy="7" rx="2.1" ry="4" transform="rotate(135 12 7)"/></g><circle cx="12" cy="7" r="2.5" fill="#765536"/><path d="M12 17c2-.7 3.2-2.2 3.4-4.1-2 .5-3.1 1.9-3.4 4.1z" fill="#6F9850"/>`,
  hydrangea: `<path d="M12 21v-7" stroke="#61804D" stroke-width="1.1"/><g fill="#9EA5D0"><circle cx="9" cy="9" r="2.6"/><circle cx="12.5" cy="7.2" r="2.6"/><circle cx="15.3" cy="10.1" r="2.6"/><circle cx="10.3" cy="12.4" r="2.6"/><circle cx="13.8" cy="13" r="2.6"/></g><g fill="#F1DE8E"><circle cx="9" cy="9" r=".65"/><circle cx="12.5" cy="7.2" r=".65"/><circle cx="15.3" cy="10.1" r=".65"/><circle cx="10.3" cy="12.4" r=".65"/><circle cx="13.8" cy="13" r=".65"/></g>`,
  gladiolus: `<path d="M11.8 21V4" stroke="#5D8149" stroke-width="1.1"/><path d="M12 6.7c-2.9-.7-4.3-2.5-3.8-4.4 2.2.3 3.5 1.7 3.8 4.4zm0 4.3c3-.7 4.4-2.5 3.8-4.4-2.2.3-3.5 1.7-3.8 4.4zm0 4.1c-3-.7-4.4-2.5-3.8-4.4 2.2.3 3.5 1.7 3.8 4.4zm0 4.2c3-.7 4.4-2.5 3.8-4.4-2.2.3-3.5 1.7-3.8 4.4z" fill="#E2899A"/><path d="M9.5 20c.8-2.5.7-4.8-.2-7m3.5 7c-.2-2.6.3-4.7 1.7-6.6" stroke="#76A259" stroke-width=".75"/>`,
  anthurium: `<path d="M12 21v-8" stroke="#5E824A" stroke-width="1.1"/><path d="M12 14.1c-4.6-1.5-6.4-5.7-4.2-8.4 2.2-2.8 6.7-1.2 6.7 2.4 0-3.6 4.5-5.2 6.7-2.4 2.2 2.7.4 6.9-4.2 8.4z" fill="#D75E63"/><path d="M12 13.5V5.8" stroke="#F4D59A" stroke-width="1.3"/>`,
  birdOfParadise: `<path d="M11 21c.4-6.3 1.8-11.9 5.3-16.4" stroke="#5D824B" stroke-width="1.3"/><path d="M14 8.6c-1.9-4.1-.7-6.4 1.4-6.6 1.1 2.3.6 4.4-1.4 6.6z" fill="#4B8B65"/><path d="M15.2 8.3c2.8-2.7 5.1-2.9 6.1-1.5-1.4 1.6-3.5 2.2-6.1 1.5z" fill="#E08838"/><path d="M14.8 9.2c2.1 2.4 4.4 2.8 5.8 1.5-1.4-1.6-3.5-2.1-5.8-1.5z" fill="#457CA0"/>`,
  eustoma: `<path d="M12 21V11" stroke="#61814D" stroke-width="1.1"/><path d="M12 12.3c-3.9-1.6-5.2-5.1-3.2-7.2 1.9 1.1 3.1 2.9 3.2 5.3.4-2.4 1.7-4.1 3.7-5 1.6 2.4.2 5.6-2.5 6.9 2.5-.3 4.4.8 4.8 2.8-2.3.7-4.3-.1-5.8-2.8z" fill="#BCA4D0"/><circle cx="12" cy="12.4" r="1.1" fill="#E1CA7B"/>`,
  gypsophila: `<path d="M12 21c-.5-5.9-.7-11.3-.1-16.7M11.7 13.1C9 11.6 7.2 9.4 7.4 6.8M12.3 14.2c3-1.8 4.6-4 4.5-6.7M11.9 17.2c-2.2-1.2-3.8-2.9-4.3-4.9" fill="none" stroke="#62824D" stroke-width=".85"/><g fill="#F0E8DD"><circle cx="7.4" cy="6.8" r="1.6"/><circle cx="11.7" cy="13.1" r="1.6"/><circle cx="16.8" cy="7.5" r="1.6"/><circle cx="12.3" cy="14.2" r="1.6"/><circle cx="7.6" cy="12.3" r="1.6"/></g><g fill="#D5B46A"><circle cx="7.4" cy="6.8" r=".4"/><circle cx="11.7" cy="13.1" r=".4"/><circle cx="16.8" cy="7.5" r=".4"/><circle cx="12.3" cy="14.2" r=".4"/><circle cx="7.6" cy="12.3" r=".4"/></g>`,
  cockscomb: `<path d="M12 21v-7" stroke="#5E814B" stroke-width="1.1"/><path d="M8 13.8c-2.2-1.9-1.4-4.9.9-5.3-1.3-2.9 2.2-5.1 4.1-2.7 2.2-2.4 5.4.5 4.1 3.3 2.6.6 2.7 4.1.4 5.2-2.2 1.1-6.9 1.4-9.5-.5z" fill="#C95C69"/><path d="M9.2 10c1.8-.8 3.6-.8 5.4.1m-5.4 2.7c2-.7 4.1-.6 6.1.2" fill="none" stroke="#983B52" stroke-width=".75"/>`,
  tulip: `<path d="M12 21v-8.6" stroke="#5F814A" stroke-width="1.1"/><path d="M8.2 5.7c1.4.1 2.6.8 3.8 2.1 1.2-1.3 2.4-2 3.8-2.1 1.1 4.6-.2 8.1-3.8 8.1s-4.9-3.5-3.8-8.1z" fill="#D56E80"/><path d="M12 13.8c-2.3.2-3.6 1.5-3.8 3.8 2-.2 3.3-1.4 3.8-3.8zm0 0c2.3.2 3.6 1.5 3.8 3.8-2-.2-3.3-1.4-3.8-3.8z" fill="#6C9B54"/>`,
  foliage: `<path d="M12 21V4" stroke="#537B47" stroke-width="1.1"/><path d="M12 8.1C8 7.6 6.3 5.2 7 3c2.9.3 4.7 2 5 5.1zm0 4.4c3.9-.5 5.7-2.9 5-5.1-2.9.3-4.7 2-5 5.1zm0 4.3c-3.9-.5-5.7-2.9-5-5.1 2.9.3 4.7 2 5 5.1zm0 4.2c3.9-.5 5.7-2.9 5-5.1-2.9.3-4.7 2-5 5.1z" fill="#719961"/>`,
  palm: `<path d="M12 21V10" stroke="#66814C" stroke-width="1.2"/><path d="M12 11C7.3 9.4 4.9 6.6 5.6 3.8c3.3.8 5.5 3 6.4 6.7zm0 0c4.7-1.6 7.1-4.4 6.4-7.2-3.3.8-5.5 3-6.4 6.7zM12 14.6c-4.3.5-6.8-1.2-7.5-3.7 3.1-.4 5.7.9 7.5 3.7zm0 0c4.3.5 6.8-1.2 7.5-3.7-3.1-.4-5.7.9-7.5 3.7z" fill="#4F8B5A"/>`,
  eucalyptus: `<path d="M12 21c-.2-5.4.7-10.8 2.8-16" stroke="#677F60" stroke-width="1"/><g fill="#789D86"><ellipse cx="10" cy="14.7" rx="2.1" ry="1.3" transform="rotate(-35 10 14.7)"/><ellipse cx="14.3" cy="12" rx="2.1" ry="1.3" transform="rotate(35 14.3 12)"/><ellipse cx="11.7" cy="9.2" rx="2.1" ry="1.3" transform="rotate(-35 11.7 9.2)"/><ellipse cx="16.1" cy="6.5" rx="2.1" ry="1.3" transform="rotate(35 16.1 6.5)"/></g>`,
  willow: `<path d="M12 3c-.6 6.4-2.9 11.8-6.9 16.3M12 3c.5 6.4 2.3 11.8 5.7 16.3" fill="none" stroke="#6A824C" stroke-width="1.1"/><g fill="#91A85A"><path d="M8.2 11.2C5.9 11.3 4.8 10 5.1 8.4c1.8.1 2.9 1 3.1 2.8zm5.1-1.9c2.2-.1 3.4-1.3 3.1-2.9-1.8.1-2.9 1-3.1 2.9zm-7.9 6.1c-2.1.2-3.2-.8-3-2.4 1.7-.1 2.7.7 3 2.4zm9.6 0c2.1.2 3.2-.8 3-2.4-1.7-.1-2.7.7-3 2.4z"/></g>`,
  flower: `<g fill="#EC407A"><circle cx="12" cy="7" r="3"/><circle cx="7" cy="11" r="3"/><circle cx="17" cy="11" r="3"/><circle cx="9" cy="16.5" r="3"/><circle cx="15" cy="16.5" r="3"/></g><circle cx="12" cy="12" r="2.6" fill="#FFD54F"/>`,
  pig: `<path d="M4.5 8l2.5 3M19.5 8L17 11" stroke="#F48FB1" stroke-width="3" stroke-linecap="round"/><ellipse cx="12" cy="13.5" rx="8" ry="6" fill="#F48FB1"/><ellipse cx="12" cy="14.5" rx="3" ry="2.4" fill="#EC407A"/><circle cx="11" cy="14.5" r=".5" fill="#AD1457"/><circle cx="13" cy="14.5" r=".5" fill="#AD1457"/><circle cx="9" cy="10.5" r=".8" fill="#4E342E"/><circle cx="15" cy="10.5" r=".8" fill="#4E342E"/>`,
  chicken: `<circle cx="13" cy="13.5" r="6" fill="#FFFFFF" stroke="#E0E0E0"/><path d="M13 7.5c-.4-2 1.4-3.2 2.6-2.2-1 1 .2 2.8-2.6 2.2z" fill="#E53935"/><path d="M19 12l3.2-1-3.2-1z" fill="#FB8C00"/><circle cx="17.5" cy="12" r=".9" fill="#3E2723"/><path d="M7.5 18.5c-2 .3-3.5-1.2-2.6-2.4 1 1.6 2.8.8 2.6 2.4z" fill="#FB8C00"/>`,
  duck: `<path d="M7 16c-2.2 1-4.2 0-4-2.4 2 1.4 3.4.4 4 2.4z" fill="#FFD54F"/><circle cx="13" cy="12" r="6.2" fill="#FFD54F"/><circle cx="15.4" cy="10.2" r=".9" fill="#3E2723"/><path d="M18.5 12l3.5.2-2 2z" fill="#FB8C00"/>`,
  sheep: `<g fill="#FAFAFA" stroke="#E0E0E0"><circle cx="9" cy="11" r="3"/><circle cx="13" cy="9" r="3"/><circle cx="16" cy="12" r="3"/><circle cx="11" cy="14" r="3"/><circle cx="15" cy="15" r="3"/></g><ellipse cx="7" cy="10" rx="2.4" ry="3" fill="#6D4C41"/><circle cx="6.2" cy="9.2" r=".5" fill="#fff"/><path d="M5.5 13l-1 2M8 13.5l-.6 2" stroke="#6D4C41" stroke-width="1.2" stroke-linecap="round"/>`,
  egg: `<path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z" fill="#FFF8E1" stroke="#F0E0B0"/><path d="M9 16a3 3 0 0 0 5-1" stroke="#F0E0B0" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  shrimp: `<path d="M6 8c5-1 11 1 13.2 6.2-1 3-4.2 4-7.2 2.8 2-1 3-3.2 2-5.2-2-3-6.2-4-9.2-2C3.6 8.4 4 7 6 7z" fill="#FF7043"/><path d="M19 14.4c2 1 3.2 0 3.2-2.2" stroke="#FF7043" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="8" cy="9" r=".7" fill="#fff"/>`,
  crab: `<path d="M6 12C3 11 3 8 5 7c0 2 2 2 3 3zM18 12c3-1 3-4 1-5 0 2-2 2-3 3z" fill="#E53935"/><ellipse cx="12" cy="14" rx="6" ry="4.2" fill="#EF5350"/><circle cx="10" cy="13" r=".7" fill="#fff"/><circle cx="14" cy="13" r=".7" fill="#fff"/><path d="M8 18l-2 2.4M16 18l2 2.4M9.5 19l-1 2.4M14.5 19l1 2.4" stroke="#E53935" stroke-width="1.4" stroke-linecap="round"/>`,
  shell: `<path d="M12 18.5C6 18.5 3 13 4 9c1 .2 2 .8 3-.2.8-.6 1-1.3 2-1.3s1.2.9 2 1.5c.8-.6 1.2-1.5 2-1.5s1.2 1 2 1.6c1 .8 2 .1 3-.1 1 4-2 9.5-8 9.5z" fill="#FFCCBC" stroke="#FFAB91"/><path d="M12 8.5v9.5M8 9.5l2 8M16 9.5l-2 8" stroke="#FFAB91" stroke-width=".9" fill="none"/>`,
  squid: `<path d="M12 3c3 0 5 3 5 6.6 0 1.6-.8 2.6-.8 3.6 0 .8 1 .6 1 1.6s-1 .8-1 1.4 1 .6 1 1.4-1 1-1.8 1c-1 0-1.2-1-2.2-1s-1.2 1-2.2 1-1.2-1-2.2-1-1.2 1-2.2 1c-.8 0-1.8-.2-1.8-1s1-.6 1-1.4-1-.4-1-1.4 1-.8 1-1.6c0-1-.8-2-.8-3.6C7 6 9 3 12 3z" fill="#BA68C8"/><circle cx="10" cy="9.5" r="1" fill="#fff"/><circle cx="14" cy="9.5" r="1" fill="#fff"/><circle cx="10" cy="9.5" r=".4" fill="#4A148C"/><circle cx="14" cy="9.5" r=".4" fill="#4A148C"/>`,
  fish: `<path d="M4 12c3-4 9-5 13.2-3 1-2 3-3 3-3s.2 3-.8 4.2c1 1 1 2.6 0 3.6 1 1.2.8 4.2.8 4.2s-2-1-3-3C13 18 7 17 4 12z" fill="#42A5F5"/><circle cx="9" cy="11" r="1" fill="#fff"/><circle cx="9" cy="11" r=".45" fill="#0D3B66"/><path d="M11 12c2-1 4-1 6 0" stroke="#1E88E5" stroke-width="1" fill="none" stroke-linecap="round"/>`,
}

/**
 * A restrained ink outline gives every crop the same garden-illustration voice
 * as the reference art, without adding raster assets or network requests. Child
 * strokes are deliberately kept where a crop needs a darker vein or contour.
 */
const GARDEN_SVG_PREFIX = '<g stroke="#456348" stroke-width=".65" stroke-linejoin="round" stroke-linecap="round">'
const GARDEN_SVG_SUFFIX = '</g>'

interface CropIconProps {
  /** Crop name (e.g. "高麗菜"). Resolved to a category icon. */
  name: string
  /** Tailwind sizing/styling, e.g. "w-7 h-7". Defaults to "w-6 h-6". */
  className?: string
}

/** Derive an emoji font-size that fills the same box as the Tailwind w-N class. */
function emojiFontSize(className: string): string {
  const match = className.match(/\bw-(\d+(?:\.\d+)?)\b/)
  const units = match ? parseFloat(match[1]) : 6
  return `${units * 4 * 0.82}px` // 1 Tailwind unit = 4px; 0.82 keeps the glyph inside the box
}

export function CropIcon({ name, className = 'w-6 h-6' }: CropIconProps) {
  const key = resolveCropIconKey(name)

  // No curated SVG for this crop — fall back to the original emoji so the visual
  // never mismatches the item (a known emoji beats a generic placeholder).
  if (!key) {
    return (
      <span
        className={`inline-flex items-center justify-center leading-none select-none ${className}`}
        style={{ fontSize: emojiFontSize(className) }}
        role="img"
        aria-label={name || '農產品'}
      >
        {getCropEmoji(name)}
      </span>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={name || '農產品'}
      // Static, trusted markup — no user input reaches this path.
      dangerouslySetInnerHTML={{ __html: `${GARDEN_SVG_PREFIX}${ICON_SVG[key]}${GARDEN_SVG_SUFFIX}` }}
    />
  )
}

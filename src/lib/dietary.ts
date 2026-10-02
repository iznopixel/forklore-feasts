/**
 * Works out dietary tags from a recipe's ingredient lines.
 *
 * It is keyword-based, so it leans cautious: a "free-from" tag is only given when no
 * known offender turns up, and look-alikes (coconut milk, eggplant, rice flour…) are
 * set aside before matching.
 */

/** Tags this module owns. Anything else on a recipe is a cook's own tag. */
export const AUTO_DIETARY_TAGS = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "peanut-free",
  "shellfish-free",
  "egg-free",
  "spicy",
] as const

/** Tags a cook can still add by hand, since no ingredient list can tell us. */
export const SUGGESTED_TAGS = ["kid-friendly"] as const

const words = (list: string) => new RegExp(`\\b(?:${list})\\b`, "i")
const strip = (list: string) => new RegExp(`\\b(?:${list})\\b`, "gi")

/** "gluten-free flour", "vegan butter"… the qualifier and the word after it. */
const QUALIFIED = /\b(?:gluten|dairy|egg|nut|peanut|shellfish|lactose)[- ]free\s+\w+|\bvegan\s+\w+/gi

interface Rule {
  match: RegExp
  /** Look-alikes removed from the line before matching. */
  safe?: RegExp
}

const MEAT: Rule = {
  match: words(
    [
      "beef", "steaks?", "pork", "bacon", "ham", "hamburger", "sausages?", "chorizo", "pancetta",
      "prosciutto", "salami", "pepperoni", "chicken", "turkey", "duck", "lamb", "veal", "venison",
      "brisket", "short ribs?", "spare ribs?", "baby back", "meatballs?", "meat", "hot dogs?",
      "lard", "suet", "tallow", "gelatin(?:e)?", "bone broth", "jerky", "worcestershire",
      "fish", "swordfish", "catfish", "salmon", "tuna", "cod", "trout", "tilapia", "halibut",
      "sardines?", "anchov(?:y|ies)", "seafood", "shellfish", "shrimps?", "prawns?", "crab",
      "lobster", "clams?", "mussels?", "oysters?", "scallops?", "squid", "calamari", "caviar",
    ].join("|")
  ),
  safe: strip(
    "(?:veggie|vegetable|vegetarian|meatless|plant[- ]based|faux|mock)\\s+\\w+|oyster mushrooms?|crab apples?"
  ),
}

const DAIRY: Rule = {
  match: words(
    [
      "milk", "butter", "buttermilk", "cream", "cheese", "yogh?urt", "ghee", "whey", "casein",
      "parmesan", "parmigiano", "pecorino", "mozzarella", "cheddar", "feta", "ricotta",
      "mascarpone", "gruyere", "gruyère", "brie", "halloumi", "paneer", "kefir", "custard",
      "half[- ]and[- ]half", "crème fraîche", "creme fraiche", "brioche",
    ].join("|")
  ),
  safe: strip(
    [
      "(?:coconut|almond|oat|soy|rice|cashew|nut|plant|hemp|pea)\\s+(?:milk|cream)",
      "(?:peanut|almond|cocoa|shea|apple|cashew|sunflower|nut|seed)\\s+butter",
      "butternut",
      "cream of tartar",
    ].join("|")
  ),
}

const EGG: Rule = {
  match: words("eggs?|mayo(?:nnaise)?|aioli|meringue|brioche"),
  safe: strip("eggplants?|egg replacer"),
}

const SHELLFISH: Rule = {
  match: words(
    "shellfish|shrimps?|prawns?|crab|lobster|crawfish|crayfish|clams?|mussels?|oysters?|scallops?|squid|calamari|seafood|krill"
  ),
  safe: strip("oyster mushrooms?|crab apples?"),
}

/** Generic "nuts" count too: when it isn't clear which nut, assume peanuts. */
const PEANUTS: Rule = {
  match: words("peanuts?|groundnuts?|satay|nuts?"),
  safe: strip("pine nuts?|water chestnuts?|butternut"),
}

const HONEY = words("honey")

const GLUTEN: Rule = {
  match: words(
    [
      "wheat", "flour", "breads?", "cornbread", "flatbread", "gingerbread", "baguette", "brioche",
      "bread ?crumbs?", "panko", "croutons?", "pasta", "spaghetti", "penne", "macaroni", "linguine",
      "fettuccine", "lasagn[ae]", "orzo", "noodles?", "couscous", "bulgur", "farro", "barley",
      "rye", "semolina", "seitan", "pita", "naan", "tortillas?", "crackers?", "pretzels?",
      "pastry", "puff pastry", "phyllo", "filo", "dough", "pie crust", "graham", "soy sauce",
      "malt", "beer", "oats?", "rolled oats", "biscuits?",
    ].join("|")
  ),
  safe: strip(
    [
      "(?:rice|almond|coconut|corn|chickpea|gram|cassava|tapioca|potato|buckwheat|sorghum|teff|masa)\\s+flour",
      "(?:corn|rice)\\s+tortillas?",
      "rice\\s+(?:noodles?|paper|vermicelli)",
      "glass noodles?",
      "tamari",
    ].join("|")
  ),
}

const NUTS: Rule = {
  match: words(
    [
      "nuts?", "almonds?", "walnuts?", "pecans?", "cashews?", "pistachios?", "hazelnuts?",
      "macadamias?", "peanuts?", "pine nuts?", "brazil nuts?", "nutella", "marzipan", "praline",
      "frangipane",
    ].join("|")
  ),
  safe: strip("nutmeg|butternut|coconuts?"),
}

const SPICY = words(
  [
    "chil(?:i|li|e)(?:s|es)?", "jalape[nñ]os?", "cayenne", "habaneros?", "serranos?", "sriracha",
    "hot sauce", "tabasco", "(?:red|crushed) pepper flakes", "pepper flakes", "chipotles?",
    "harissa", "gochujang", "sambal", "hot pepper", "scotch bonnets?", "wasabi", "hot paprika",
    "curry paste", "calabrian",
  ].join("|")
)

const hits = (rule: Rule, text: string) =>
  rule.match.test(rule.safe ? text.replace(rule.safe, " ") : text)

/** Dietary tags that hold for a list of ingredient lines. Empty list → no tags. */
export function inferDietaryTags(ingredients: string[]): string[] {
  const lines = ingredients
    .map((l) => l.toLowerCase().replace(QUALIFIED, " ").trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const any = (test: (line: string) => boolean) => lines.some(test)
  const meat = any((l) => hits(MEAT, l))
  const dairy = any((l) => hits(DAIRY, l))
  const egg = any((l) => hits(EGG, l))
  const honey = any((l) => HONEY.test(l))

  const tags: string[] = []
  if (!meat) tags.push("vegetarian")
  if (!meat && !dairy && !egg && !honey) tags.push("vegan")
  if (!any((l) => hits(GLUTEN, l))) tags.push("gluten-free")
  if (!dairy) tags.push("dairy-free")
  if (!any((l) => hits(NUTS, l))) tags.push("nut-free")
  if (!any((l) => hits(PEANUTS, l))) tags.push("peanut-free")
  if (!any((l) => hits(SHELLFISH, l))) tags.push("shellfish-free")
  if (!egg) tags.push("egg-free")
  if (any((l) => SPICY.test(l))) tags.push("spicy")
  return tags
}

const isAuto = (t: string) => (AUTO_DIETARY_TAGS as readonly string[]).includes(t)

/** The cook's own tags, with anything this module works out for itself removed. */
export const customTags = (tags: string[]) => tags.filter((t) => !isAuto(t))

/** Final tag list for a recipe: worked-out dietary tags plus the cook's own. */
export function mergeTags(ingredients: string[], extra: string[]): string[] {
  return [...new Set([...inferDietaryTags(ingredients), ...customTags(extra)])]
}

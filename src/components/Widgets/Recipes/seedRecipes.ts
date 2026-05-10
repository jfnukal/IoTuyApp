// src/components/Widgets/Recipes/seedRecipes.ts
// Jednorázový seed — zavolej seedRecipesToFirestore() jednou z konzole nebo tlačítka v admin UI.
import { firestoreService } from '../../../services/firestoreService';
import type { RecipeFormData } from '../../../types';

const SEED_RECIPES: RecipeFormData[] = [
  {
    name: 'Hospodský guláš',
    description: 'Klasický český guláš jako z dobré hospody — tmavý, hustý, voňavý.',
    category: 'hlavní jídlo',
    seasonMonths: [], // celý rok
    tags: ['česká klasika', 'hovězí', 'guláš', 'vývar'],
    prepTime: 20,
    cookTime: 120,
    servings: 6,
    ingredients: [
      { name: 'hovězí plec nebo loupaná', amount: '1', unit: 'kg' },
      { name: 'cibule', amount: '4', unit: 'ks (velké)' },
      { name: 'olej nebo sádlo', amount: '3', unit: 'lžíce' },
      { name: 'sladká paprika mletá', amount: '3', unit: 'lžíce' },
      { name: 'pálivá paprika', amount: '0.5', unit: 'lžičky' },
      { name: 'kmín celý', amount: '1', unit: 'lžička' },
      { name: 'česnek', amount: '4', unit: 'stroužky' },
      { name: 'rajčatový protlak', amount: '2', unit: 'lžíce' },
      { name: 'hovězí vývar nebo voda', amount: '500', unit: 'ml' },
      { name: 'sůl, pepř', amount: '', unit: 'podle chuti' },
      { name: 'majoránka sušená', amount: '1', unit: 'lžička' },
    ],
    steps: [
      'Cibuli nakrájíme nadrobno a osmažíme na tuku do zlatova — čím déle, tím tmavší guláš.',
      'Přidáme kmín, chvíli restujeme, pak sundáme z ohně a přidáme mletou papriku (mimo přímý oheň, aby nezčernala).',
      'Maso nakrájíme na kostky 3×3 cm, osolíme, přidáme do hrnce k cibuli a zprudka opečeme ze všech stran.',
      'Přidáme prolisovaný česnek, rajčatový protlak a pálivou papriku. Promícháme.',
      'Podlijeme vývarem, přikryjeme a dusíme na mírném ohni 90–120 minut, dokud není maso měkké.',
      'Pokud je guláš řídký, odkryjeme a necháme odpařit. Dochutíme solí, pepřem a majoránkou.',
      'Podáváme s houskovým nebo bramborovým knedlíkem.',
    ],
    youtubeLinks: [],
    addedBy: 'seed',
    originalPhotoUrl: '',
    imageUrl: '',
  },
  {
    name: 'Vánočka',
    description: 'Měkká, voňavá vánočka s rozinkami a mandlemi — nezbytná součást Vánoc.',
    category: 'pečení',
    seasonMonths: [12, 1], // prosinec + leden
    tags: ['vánoce', 'kynuté', 'sladké pečivo', 'tradice'],
    prepTime: 40,
    cookTime: 40,
    servings: 12,
    ingredients: [
      { name: 'hladká mouka', amount: '500', unit: 'g' },
      { name: 'čerstvé droždí', amount: '40', unit: 'g' },
      { name: 'mléko vlažné', amount: '200', unit: 'ml' },
      { name: 'máslo změklé', amount: '80', unit: 'g' },
      { name: 'cukr', amount: '80', unit: 'g' },
      { name: 'vajíčka', amount: '2', unit: 'ks + 1 na potření' },
      { name: 'citronová kůra', amount: '1', unit: 'lžička (strouhaná)' },
      { name: 'vanilkový cukr', amount: '1', unit: 'sáček' },
      { name: 'sůl', amount: '1', unit: 'špetka' },
      { name: 'rozinky', amount: '100', unit: 'g' },
      { name: 'mandle plátky na posypání', amount: '30', unit: 'g' },
      { name: 'rum na namočení rozinek', amount: '2', unit: 'lžíce' },
    ],
    steps: [
      'Rozinky namočíme do rumu aspoň 30 minut předem.',
      'Droždí rozdrobíme do vlažného mléka, přidáme lžičku cukru a necháme 10 minut vzejít kvásek.',
      'V míse smícháme mouku, zbylý cukr, sůl, vanilkový cukr, citronovou kůru. Uprostřed uděláme důlek.',
      'Do důlku přidáme vejce, máslo, kvásek a vypracujeme hladké těsto. Přidáme odkapané rozinky.',
      'Těsto přikryjeme a necháme 1 hodinu kynout na teplém místě.',
      'Vykynuté těsto rozdělíme: 3 díly na spodní vrstvu (tlusté prameny), 3 na prostřední, 2 na vrchní.',
      'Upleteme třípramenný cop, na něj položíme třípramenný, navrch dvoupleteňový.',
      'Přeneseme na plech s pečicím papírem, necháme 30 minut dokynout.',
      'Potřeme rozšlehaným vejcem, posypeme mandlemi.',
      'Pečeme v troubě předehřáté na 175 °C přibližně 35–40 minut. Pokud rychle tmavne, přikryjeme alobalem.',
    ],
    youtubeLinks: [],
    addedBy: 'seed',
    originalPhotoUrl: '',
    imageUrl: '',
  },
  {
    name: 'Vanilkové rohlíčky',
    description: 'Drobivé rohlíčky s vlašskými ořechy, obalené ve vanilkovém cukru. Vánoční klasika.',
    category: 'pečení',
    seasonMonths: [12, 1], // prosinec + leden
    tags: ['vánoce', 'cukroví', 'ořechy', 'drobivé'],
    prepTime: 30,
    cookTime: 15,
    servings: 40,
    ingredients: [
      { name: 'hladká mouka', amount: '300', unit: 'g' },
      { name: 'máslo studené', amount: '200', unit: 'g' },
      { name: 'mleté vlašské ořechy', amount: '100', unit: 'g' },
      { name: 'moučkový cukr', amount: '80', unit: 'g' },
      { name: 'vanilkový cukr', amount: '2', unit: 'sáčky' },
      { name: 'sůl', amount: '1', unit: 'špetka' },
      { name: 'moučkový cukr na obalení', amount: '150', unit: 'g' },
      { name: 'vanilkový cukr na obalení', amount: '3', unit: 'sáčky' },
    ],
    steps: [
      'Studené máslo nakrájíme na kostičky. V míse rychle zpracujeme s moukou, ořechy, cukrem a solí na drobivé těsto.',
      'Těsto zabalíme do fólie a dáme na 30 minut do lednice.',
      'Troubu předehřejeme na 160 °C. Z těsta tvarujeme malé rohlíčky (cca 4–5 cm).',
      'Klademe na plech s pečicím papírem a pečeme 12–15 minut dozlatova — nesmí být tmavé.',
      'Ještě horké rohlíčky obalíme ve směsi moučkového a vanilkového cukru.',
      'Po vychladnutí znovu obalíme v cukru pro silnější vrstvu.',
    ],
    youtubeLinks: [],
    addedBy: 'seed',
    originalPhotoUrl: '',
    imageUrl: '',
  },
  {
    name: 'Španělský ptáček',
    description: 'Jemné hovězí závitky plněné okurkou, vajíčkem a uzeninou v tmavé omáčce.',
    category: 'hlavní jídlo',
    seasonMonths: [], // celý rok
    tags: ['česká klasika', 'hovězí', 'závitky', 'nedělní oběd'],
    prepTime: 30,
    cookTime: 90,
    servings: 4,
    ingredients: [
      { name: 'hovězí plátky (zadní)', amount: '4', unit: 'ks (cca 150 g každý)' },
      { name: 'tvrdě uvařená vejce', amount: '2', unit: 'ks' },
      { name: 'kyselá okurka', amount: '2', unit: 'ks (větší)' },
      { name: 'párky nebo uzená klobása', amount: '100', unit: 'g' },
      { name: 'hořčice', amount: '2', unit: 'lžíce' },
      { name: 'cibule', amount: '2', unit: 'ks' },
      { name: 'slanina nebo špek', amount: '60', unit: 'g' },
      { name: 'rajčatový protlak', amount: '1', unit: 'lžíce' },
      { name: 'hovězí vývar', amount: '400', unit: 'ml' },
      { name: 'hladká mouka na zaprášení', amount: '2', unit: 'lžíce' },
      { name: 'olej', amount: '2', unit: 'lžíce' },
      { name: 'sůl, pepř, bobkový list', amount: '', unit: 'podle chuti' },
    ],
    steps: [
      'Maso naklepeme, osolíme, opepříme a potřeme hořčicí.',
      'Na každý plátek položíme proužek okurky, čtvrtku vejce a proužek párku/uzeniny.',
      'Těsně srolujeme a zajistíme párátkem nebo provázkem.',
      'Závitky opečeme ze všech stran na oleji do zlatova, vyjmeme.',
      'Na výpeku osmažíme nakrájenou cibuli a slaninu, přidáme mouku a krátce restujeme.',
      'Přidáme protlak, zalijeme vývarem, vložíme závitky a bobkový list.',
      'Dusíme pod pokličkou 80–90 minut na mírném ohni, závitky občas otočíme.',
      'Omáčku dochutíme, případně zahustíme. Odstraníme párátka.',
      'Podáváme s houskovým knedlíkem nebo rýží a přelijeme omáčkou.',
    ],
    youtubeLinks: [],
    addedBy: 'seed',
    originalPhotoUrl: '',
    imageUrl: '',
  },
];

export async function seedRecipesToFirestore(): Promise<void> {
  console.log('🌱 Nahrávám vzorové recepty...');
  for (const recipe of SEED_RECIPES) {
    const id = await firestoreService.addRecipe(recipe);
    console.log(`✅ Přidán recept: ${recipe.name} (${id})`);
  }
  console.log('🎉 Seed dokončen!');
}

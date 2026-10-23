import {
  BabyIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CarIcon,
  DumbbellIcon,
  GiftIcon,
  HeartIcon,
  HouseIcon,
  PawPrintIcon,
  PillIcon,
  ShirtIcon,
  ShoppingBasketIcon,
  SproutIcon,
  TagIcon,
  UtensilsIcon,
  WrenchIcon,
  type LucideIcon,
} from 'lucide-react'

/** Íconos que se pueden elegir para una categoría; la clave es lo que se guarda. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'shopping-basket': ShoppingBasketIcon,
  briefcase: BriefcaseIcon,
  sprout: SproutIcon,
  'paw-print': PawPrintIcon,
  house: HouseIcon,
  utensils: UtensilsIcon,
  car: CarIcon,
  wrench: WrenchIcon,
  shirt: ShirtIcon,
  baby: BabyIcon,
  pill: PillIcon,
  dumbbell: DumbbellIcon,
  'book-open': BookOpenIcon,
  gift: GiftIcon,
  heart: HeartIcon,
  tag: TagIcon,
}

/** Nombre en español de cada ícono, para lectores de pantalla. */
export const CATEGORY_ICON_LABELS: Record<string, string> = {
  'shopping-basket': 'Canasta',
  briefcase: 'Portafolio',
  sprout: 'Planta',
  'paw-print': 'Huella',
  house: 'Casa',
  utensils: 'Cubiertos',
  car: 'Auto',
  wrench: 'Herramienta',
  shirt: 'Ropa',
  baby: 'Bebé',
  pill: 'Medicina',
  dumbbell: 'Ejercicio',
  'book-open': 'Libro',
  gift: 'Regalo',
  heart: 'Corazón',
  tag: 'Etiqueta',
}

export function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? TagIcon
}

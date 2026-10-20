import type { SlideTransition } from '@/types/slides'

/**
 * Keynote slide transitions, keyed by the effect identifier Keynote stores in
 * KN.AnimationAttributesArchive.effect (catalog of Keynote 15.2.1, extracted by
 * KeynoteKit). The gallery groups follow Keynote's own transition picker.
 *
 * `engine` names the KeyNot player animation; `fidelity` says whether that
 * animation reproduces Keynote's effect or approximates it. The identifier is
 * always what is stored and exported, so an approximated effect still reaches
 * Keynote unchanged.
 */

export type TransitionGroup = 'none' | 'magicMove' | 'appearMove' | 'flipSpinScale' | 'objectEffects' | 'textEffects'

export type TransitionEngine =
  | 'none' | 'magicMove' | 'dissolve' | 'fadeThroughColor' | 'push' | 'moveIn' | 'reveal' | 'wipe'
  | 'iris' | 'cube' | 'flip' | 'flop' | 'scale' | 'revolve' | 'doorway' | 'twirl' | 'fall' | 'drop'
  | 'pivot' | 'swap' | 'switch' | 'fadeAndMove' | 'grid' | 'objectPop' | 'objectZoom' | 'swing'

export type TransitionFidelity = 'native' | 'approximate'

export interface TransitionDefinition {
  id: string
  label: { 'en-US': string; 'pt-BR': string }
  group: TransitionGroup
  engine: TransitionEngine
  fidelity: TransitionFidelity
  /** The effect plays in one of four directions (Keynote direction constants 11-14). */
  directional?: boolean
}

const define = (
  id: string,
  en: string,
  pt: string,
  group: TransitionGroup,
  engine: TransitionEngine,
  fidelity: TransitionFidelity = 'approximate',
  directional = false
): TransitionDefinition => ({ id, label: { 'en-US': en, 'pt-BR': pt }, group, engine, fidelity, ...(directional ? { directional } : {}) })

export const TRANSITIONS: TransitionDefinition[] = [
  define('none', 'None', 'Nenhuma', 'none', 'none', 'native'),
  define('apple:magic-move-implied-motion-path', 'Magic Move', 'Movimento Mágico', 'magicMove', 'magicMove', 'native'),

  define('apple:ClotheslinePush', 'Clothesline', 'Varal', 'appearMove', 'push', 'approximate', true),
  define('com.apple.iWork.Keynote.KLNConfetti', 'Confetti', 'Confete', 'appearMove', 'dissolve'),
  define('apple:dissolve', 'Dissolve', 'Dissolver', 'appearMove', 'dissolve', 'native'),
  define('apple:bounce', 'Drop', 'Soltar', 'appearMove', 'drop'),
  define('apple:fade-and-move', 'Fade and Move', 'Esmaecer e Mover', 'appearMove', 'fadeAndMove', 'approximate', true),
  define('com.apple.iWork.Keynote.BLTFadeThruColor', 'Fade Through Color', 'Esmaecer em Cor', 'appearMove', 'fadeThroughColor', 'native'),
  define('apple:apple-grid', 'Grid', 'Grade', 'appearMove', 'grid'),
  define('apple:wipe-iris', 'Iris', 'Íris', 'appearMove', 'iris', 'native'),
  define('apple:slide', 'Move In', 'Mover para Dentro', 'appearMove', 'moveIn', 'native', true),
  define('apple:push', 'Push', 'Empurrar', 'appearMove', 'push', 'native', true),
  define('apple:reveal', 'Reveal', 'Revelar', 'appearMove', 'reveal', 'native', true),
  define('apple:FlipThrough', 'Switch', 'Alternar', 'appearMove', 'switch'),
  define('apple:wipe', 'Wipe', 'Varredura', 'appearMove', 'wipe', 'native', true),
  define('apple:droplet', 'Droplet', 'Gota', 'appearMove', 'iris'),

  define('com.apple.iWork.Keynote.BLTBlinds', 'Blinds', 'Persianas', 'flipSpinScale', 'doorway'),
  define('com.apple.iWork.Keynote.KLNColorPlanes', 'Color Planes', 'Planos de Cor', 'flipSpinScale', 'fadeThroughColor'),
  define('apple:3D-cube', 'Cube', 'Cubo', 'flipSpinScale', 'cube', 'native', true),
  define('apple:doorway', 'Doorway', 'Porta', 'flipSpinScale', 'doorway'),
  define('apple:fall', 'Fall', 'Cair', 'flipSpinScale', 'fall'),
  define('apple:revolve', 'Flip', 'Virar', 'flipSpinScale', 'flip', 'native', true),
  define('com.apple.iWork.Keynote.BUKFlop', 'Flop', 'Tombar', 'flipSpinScale', 'flop'),
  define('com.apple.iWork.Keynote.BLTMosaicFlip', 'Mosaic', 'Mosaico', 'flipSpinScale', 'flip'),
  define('apple:pageflip', 'Page Flip', 'Virar Página', 'flipSpinScale', 'revolve'),
  define('apple:pivot', 'Pivot', 'Pivô', 'flipSpinScale', 'pivot'),
  define('com.apple.iWork.Keynote.BLTReflection', 'Reflection', 'Reflexo', 'flipSpinScale', 'flop'),
  define('com.apple.iWork.Keynote.BLTRevolvingDoor', 'Revolving Door', 'Porta Giratória', 'flipSpinScale', 'revolve'),
  define('apple:scale', 'Scale', 'Escala', 'flipSpinScale', 'scale', 'native'),
  define('com.apple.iWork.Keynote.KLNSwap', 'Swap', 'Trocar', 'flipSpinScale', 'swap'),
  define('com.apple.iWork.Keynote.BLTSwoosh', 'Swoosh', 'Zunido', 'flipSpinScale', 'moveIn'),
  define('apple:twirl', 'Twirl', 'Rodopiar', 'flipSpinScale', 'twirl', 'native'),
  define('com.apple.iWork.Keynote.BUKTwist', 'Twist', 'Torcer', 'flipSpinScale', 'twirl'),

  define('apple:ca-cube', 'Object Cube', 'Cubo de Objetos', 'objectEffects', 'cube'),
  define('apple:ca-dissolve-and-flip', 'Object Flip', 'Virar Objetos', 'objectEffects', 'flip'),
  define('apple:ca-pop', 'Object Pop', 'Estourar Objetos', 'objectEffects', 'objectPop'),
  define('apple:ca-push', 'Object Push', 'Empurrar Objetos', 'objectEffects', 'push'),
  define('apple:ca-revolve', 'Object Revolve', 'Girar Objetos', 'objectEffects', 'revolve'),
  define('apple:ca-zoom', 'Object Zoom', 'Zoom de Objetos', 'objectEffects', 'objectZoom'),
  define('apple:ca-isometric', 'Perspective', 'Perspectiva', 'objectEffects', 'cube'),

  define('apple:ca-text-shimmer', 'Shimmer', 'Cintilar', 'textEffects', 'dissolve'),
  define('apple:ca-text-sparkle', 'Sparkle', 'Faiscar', 'textEffects', 'dissolve'),
  define('apple:ca-swing', 'Swing', 'Balançar', 'textEffects', 'swing'),
]

export const TRANSITION_GROUPS: { id: TransitionGroup; label: { 'en-US': string; 'pt-BR': string } }[] = [
  { id: 'none', label: { 'en-US': 'None', 'pt-BR': 'Nenhuma' } },
  { id: 'magicMove', label: { 'en-US': 'Magic Move', 'pt-BR': 'Movimento Mágico' } },
  { id: 'appearMove', label: { 'en-US': 'Appear & Move', 'pt-BR': 'Aparecer e Mover' } },
  { id: 'flipSpinScale', label: { 'en-US': 'Flip, Spin & Scale', 'pt-BR': 'Virar, Girar e Escalar' } },
  { id: 'objectEffects', label: { 'en-US': 'Object Effects', 'pt-BR': 'Efeitos de Objeto' } },
  { id: 'textEffects', label: { 'en-US': 'Text Effects', 'pt-BR': 'Efeitos de Texto' } },
]

const BY_ID = new Map(TRANSITIONS.map(definition => [definition.id, definition]))

/** Legacy KeyNot spelling; newly written effects use the verified Keynote catalog id. */
const ALIASES: Record<string, string> = { 'apple:magic-move': 'apple:magic-move-implied-motion-path' }
export const canonicalTransitionEffect = (effect: string) => ALIASES[effect] ?? effect

/** Definition for an identifier; unknown Keynote effects play as a dissolve and keep their id. */
export const getTransitionDefinition = (effect: string | undefined): TransitionDefinition => {
  const id = effect ?? 'none'
  return BY_ID.get(id) ?? BY_ID.get(ALIASES[id] ?? '') ?? {
    id,
    label: { 'en-US': id, 'pt-BR': id },
    group: 'appearMove',
    engine: 'dissolve',
    fidelity: 'approximate',
  }
}

export const isMagicMove = (transition: SlideTransition | undefined) =>
  !!transition && getTransitionDefinition(transition.effect).engine === 'magicMove'

/** Keynote direction constants (verified for Push by KeynoteKit): the edge the new slide comes from. */
export const TRANSITION_DIRECTIONS = [
  { value: 12, label: { 'en-US': 'Right to Left', 'pt-BR': 'Da Direita para a Esquerda' } },
  { value: 11, label: { 'en-US': 'Left to Right', 'pt-BR': 'Da Esquerda para a Direita' } },
  { value: 14, label: { 'en-US': 'Bottom to Top', 'pt-BR': 'De Baixo para Cima' } },
  { value: 13, label: { 'en-US': 'Top to Bottom', 'pt-BR': 'De Cima para Baixo' } },
]

export const DEFAULT_TRANSITION: SlideTransition = {
  effect: 'none',
  duration: 1000,
  startMode: 'click',
  delay: 0,
}

/** Keynote's defaults when an effect is picked from the gallery. */
export const createTransition = (effect: string, previous?: SlideTransition): SlideTransition => {
  const definition = getTransitionDefinition(effect)
  const base: SlideTransition = {
    effect: canonicalTransitionEffect(effect),
    duration: previous && previous.effect !== 'none' ? previous.duration : definition.engine === 'magicMove' ? 2000 : 1000,
    startMode: previous?.startMode ?? 'click',
    delay: previous?.delay ?? 0,
  }
  if (definition.directional) base.direction = previous?.direction ?? 12
  if (definition.engine === 'magicMove') {
    base.acceleration = previous?.acceleration ?? 'easeInOut'
    base.unmatchedBehavior = previous?.unmatchedBehavior ?? 'fade'
    base.textMatchMode = previous?.textMatchMode ?? 'object'
  }
  return base
}

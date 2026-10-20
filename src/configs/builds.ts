import type { AnimationType } from '@/types/slides'

/**
 * Keynote object builds, keyed by the effect identifier Keynote stores in
 * KN.BuildArchive.attributes.animationAttributes.effect (Keynote 15.2.1 catalog,
 * extracted by KeynoteKit). `kind` is Keynote's animation_type: "In", "Out" or an
 * action. `player` is the KeyNot animation that plays it; the identifier is what
 * is stored and exported.
 *
 * Display names follow Keynote's build gallery where they are known; effects
 * whose gallery name could not be confirmed are named after their identifier.
 */

export type BuildKind = 'in' | 'out' | 'action'

export interface BuildDefinition {
  id: string
  kind: BuildKind
  label: { 'en-US': string; 'pt-BR': string }
  /** KeyNot player animation (animate.css name or action effect). */
  player: string
  type: AnimationType
  fidelity: 'native' | 'approximate'
}

const build = (
  kind: BuildKind,
  id: string,
  en: string,
  pt: string,
  player: string,
  fidelity: 'native' | 'approximate' = 'approximate'
): BuildDefinition => ({
  id,
  kind,
  label: { 'en-US': en, 'pt-BR': pt },
  player,
  type: kind === 'action' ? (player.startsWith('action') ? 'action' : 'attention') : kind,
  fidelity,
})

/** Effects shared by Build In and Build Out, with their in and out player animations. */
const BOTH: [string, string, string, string, string, ('native' | 'approximate')?][] = [
  ['apple:bc-appear', 'Appear', 'Aparecer', 'fadeIn', 'fadeOut', 'native'],
  ['com.apple.iWork.Keynote.Blur', 'Blur', 'Desfocar', 'fadeIn', 'fadeOut'],
  ['apple:bc-expand', 'Expand', 'Expandir', 'zoomIn', 'zoomOut'],
  ['apple:dissolve character', 'Dissolve', 'Dissolver', 'fadeIn', 'fadeOut', 'native'],
  ['apple:fade and move character', 'Fade and Move', 'Esmaecer e Mover', 'fadeInLeft', 'fadeOutRight'],
  ['com.apple.iWork.Keynote.FromDarkness', 'From Darkness', 'Da Escuridão', 'fadeIn', 'fadeOut'],
  ['apple:sidezoom', 'Side Zoom', 'Zoom Lateral', 'zoomInLeft', 'zoomOutRight'],
  ['apple:wipe-iris', 'Iris', 'Íris', 'zoomIn', 'zoomOut'],
  ['apple:keyboard', 'Keyboard', 'Teclado', 'fadeInUp', 'fadeOutDown'],
  ['apple:move in character', 'Move In', 'Mover para Dentro', 'slideInLeft', 'slideOutRight', 'native'],
  ['apple:wipe', 'Wipe', 'Varredura', 'fadeInLeft', 'fadeOutRight'],
  ['com.apple.iWork.Keynote.BLTBlinds', 'Blinds', 'Persianas', 'flipInX', 'flipOutX'],
  ['apple:bc-3D-cube', 'Cube', 'Cubo', 'flipInY', 'flipOutY'],
  ['apple:bc-flip', 'Flip', 'Virar', 'flipInY', 'flipOutY'],
  ['apple:bc-orbital', 'Orbital', 'Orbital', 'rotateIn', 'rotateOut'],
  ['apple:pivot-build', 'Pivot', 'Pivô', 'rotateInDownLeft', 'rotateOutDownLeft'],
  ['apple:bc-pop', 'Pop', 'Estourar', 'bounceIn', 'bounceOut'],
  ['apple:zoom character', 'Scale', 'Escala', 'zoomIn', 'zoomOut', 'native'],
  ['apple:bc-zoom-big character', 'Scale Big', 'Escala Grande', 'zoomIn', 'zoomOut'],
  ['apple:bc-superflip', 'Superflip', 'Supervirada', 'flipInX', 'flipOutX'],
  ['com.apple.iWork.Keynote.BLTSwoosh', 'Swoosh', 'Zunido', 'lightSpeedInRight', 'lightSpeedOutRight'],
  ['apple:spin', 'Spin', 'Girar', 'rotateIn', 'rotateOut'],
  ['apple:twist-and-scale', 'Twist', 'Torcer', 'rotateIn', 'rotateOut'],
  ['com.apple.iWork.Keynote.KLNBCBlast', 'Blast', 'Explosão', 'zoomIn', 'zoomOut'],
  ['com.apple.iWork.Keynote.KLNBouncy', 'Bounce', 'Quicar', 'bounceIn', 'bounceOut'],
  ['com.apple.iWork.Keynote.KLNComet', 'Comet', 'Cometa', 'lightSpeedInLeft', 'lightSpeedOutLeft'],
  ['com.apple.iWork.Keynote.KLNConfetti', 'Confetti', 'Confete', 'fadeIn', 'fadeOut'],
  ['com.apple.iWork.Keynote.KLNFlame', 'Flame', 'Chama', 'fadeInUp', 'fadeOutUp'],
  ['com.apple.iWork.Keynote.BUKFlashBulbs', 'Flash Bulb', 'Flash', 'fadeIn', 'fadeOut'],
  ['com.apple.iWork.Keynote.BUKLensFlare', 'Lens Flare', 'Reflexo de Lente', 'fadeIn', 'fadeOut'],
  ['com.apple.iWork.Keynote.KLNShimmer', 'Shimmer', 'Cintilar', 'fadeIn', 'fadeOut'],
  ['com.apple.iWork.Keynote.KNBuildSkidByCharacter', 'Skid', 'Derrapar', 'lightSpeedInRight', 'lightSpeedOutRight'],
  ['com.apple.iWork.Keynote.KLNSparkle', 'Sparkle', 'Faiscar', 'fadeIn', 'fadeOut'],
  ['com.apple.iWork.Keynote.KLNSquish', 'Squish', 'Esmagar', 'bounceInUp', 'bounceOutDown'],
  ['com.apple.iWork.Keynote.Trace', 'Trace', 'Traçar', 'fadeIn', 'fadeOut'],
]

const IN_ONLY: [string, string, string, string][] = [
  ['apple:drift', 'Drift', 'Deslizar', 'fadeInUp'],
  ['apple:drift and scale character', 'Drift and Scale', 'Deslizar e Escalar', 'zoomInUp'],
  ['apple:bc-drop', 'Drop', 'Soltar', 'bounceInDown'],
  ['com.apple.iWork.Keynote.BUKAnvil', 'Anvil', 'Bigorna', 'backInDown'],
  ['com.apple.iWork.Keynote.KNFireworks', 'Fireworks', 'Fogos de Artifício', 'zoomIn'],
]

const OUT_ONLY: [string, string, string, string][] = [
  ['com.apple.iWork.Keynote.Crumble', 'Crumble', 'Esfarelar', 'zoomOut'],
  ['com.apple.iWork.Keynote.KLNDiffuse', 'Diffuse', 'Difundir', 'fadeOut'],
  ['apple:fall-apart', 'Fall Apart', 'Desmoronar', 'fadeOutDown'],
  ['com.apple.iWork.Keynote.Vanish', 'Vanish', 'Sumir', 'zoomOut'],
]

export const BUILDS: BuildDefinition[] = [
  ...BOTH.map(([id, en, pt, player, , fidelity]) => build('in', id, en, pt, player, fidelity)),
  ...IN_ONLY.map(([id, en, pt, player]) => build('in', id, en, pt, player)),
  build('action', 'apple:action-motion-path', 'Move', 'Mover', 'actionMove', 'native'),
  build('action', 'apple:action-opacity', 'Opacity', 'Opacidade', 'actionOpacity', 'native'),
  build('action', 'apple:action-rotation', 'Rotate', 'Girar', 'actionRotate', 'native'),
  build('action', 'apple:action-scale', 'Scale', 'Escala', 'actionScale', 'native'),
  build('action', 'apple:action-blink', 'Blink', 'Piscar', 'flash'),
  build('action', 'apple:action-bounce', 'Bounce', 'Quicar', 'bounce'),
  build('action', 'apple:action-flip', 'Flip', 'Virar', 'swing'),
  build('action', 'apple:action-jiggle', 'Jiggle', 'Balançar', 'wobble'),
  build('action', 'apple:action-pop', 'Pop', 'Estourar', 'rubberBand'),
  build('action', 'apple:action-pulse', 'Pulse', 'Pulsar', 'pulse'),
  ...BOTH.map(([id, en, pt, , player, fidelity]) => build('out', id, en, pt, player, fidelity)),
  ...OUT_ONLY.map(([id, en, pt, player]) => build('out', id, en, pt, player)),
]

export const BUILD_KINDS: { id: BuildKind; label: { 'en-US': string; 'pt-BR': string } }[] = [
  { id: 'in', label: { 'en-US': 'Build In', 'pt-BR': 'Entrada' } },
  { id: 'action', label: { 'en-US': 'Action', 'pt-BR': 'Ação' } },
  { id: 'out', label: { 'en-US': 'Build Out', 'pt-BR': 'Saída' } },
]

/** Keynote animation_type for a build kind. */
export const KEYNOTE_BUILD_KIND: Record<BuildKind, string> = { in: 'In', out: 'Out', action: 'Action' }

export const buildKindOf = (animationType: string): BuildKind => {
  const lower = animationType.toLowerCase()
  return lower === 'in' ? 'in' : lower === 'out' ? 'out' : 'action'
}

/** Definition for a native effect of a given kind; unknown effects keep their id and fade. */
export const getBuildDefinition = (kind: BuildKind, effect: string): BuildDefinition =>
  BUILDS.find(definition => definition.kind === kind && definition.id === effect)
  ?? build(kind, effect, effect, effect, kind === 'out' ? 'fadeOut' : kind === 'in' ? 'fadeIn' : 'pulse')

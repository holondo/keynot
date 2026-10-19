import type { TurningMode } from '@/types/slides'

export const ANIMATION_DEFAULT_DURATION = 1000
export const ANIMATION_DEFAULT_TRIGGER = 'click'
export const ANIMATION_CLASS_PREFIX = 'animate__'

export const ENTER_ANIMATIONS = [
  {
    type: 'fade',
    name: 'Dissolve & Fade',
    children: [
      { name: 'Dissolve In', value: 'fadeIn' },
      { name: 'Drift In Down', value: 'fadeInDown' },
      { name: 'Sweep In Down', value: 'fadeInDownBig' },
      { name: 'Drift In Right', value: 'fadeInLeft' },
      { name: 'Sweep In Right', value: 'fadeInLeftBig' },
      { name: 'Drift In Left', value: 'fadeInRight' },
      { name: 'Sweep In Left', value: 'fadeInRightBig' },
      { name: 'Drift In Up', value: 'fadeInUp' },
      { name: 'Sweep In Up', value: 'fadeInUpBig' },
      { name: 'Drift Top-Left', value: 'fadeInTopLeft' },
      { name: 'Drift Top-Right', value: 'fadeInTopRight' },
      { name: 'Drift Bottom-Left', value: 'fadeInBottomLeft' },
      { name: 'Drift Bottom-Right', value: 'fadeInBottomRight' },
    ],
  },
  {
    type: 'zoom',
    name: 'Scale & Pop',
    children: [
      { name: 'Scale In', value: 'zoomIn' },
      { name: 'Scale In Down', value: 'zoomInDown' },
      { name: 'Scale In Left', value: 'zoomInLeft' },
      { name: 'Scale In Right', value: 'zoomInRight' },
      { name: 'Scale In Up', value: 'zoomInUp' },
    ],
  },
  {
    type: 'slide',
    name: 'Move In',
    children: [
      { name: 'Move In Down', value: 'slideInDown' },
      { name: 'Move In Right', value: 'slideInLeft' },
      { name: 'Move In Left', value: 'slideInRight' },
      { name: 'Move In Up', value: 'slideInUp' },
    ],
  },
  {
    type: 'bounce',
    name: 'Bounce',
    children: [
      { name: 'Bounce In', value: 'bounceIn' },
      { name: 'Bounce In Right', value: 'bounceInLeft' },
      { name: 'Bounce In Left', value: 'bounceInRight' },
      { name: 'Bounce In Up', value: 'bounceInUp' },
      { name: 'Bounce In Down', value: 'bounceInDown' },
    ],
  },
  {
    type: 'rotate',
    name: 'Rotate & Spin',
    children: [
      { name: 'Spin In', value: 'rotateIn' },
      { name: 'Pivot Bottom-Left', value: 'rotateInDownLeft' },
      { name: 'Pivot Bottom-Right', value: 'rotateInDownRight' },
      { name: 'Pivot Top-Left', value: 'rotateInUpLeft' },
      { name: 'Pivot Top-Right', value: 'rotateInUpRight' },
    ],
  },
  {
    type: 'flip',
    name: '3D Flip',
    children: [
      { name: 'Flip In X', value: 'flipInX' },
      { name: 'Flip In Y', value: 'flipInY' },
    ],
  },
  {
    type: 'back',
    name: 'Spring Slide',
    children: [
      { name: 'Spring In Down', value: 'backInDown' },
      { name: 'Spring In Left', value: 'backInLeft' },
      { name: 'Spring In Right', value: 'backInRight' },
      { name: 'Spring In Up', value: 'backInUp' },
    ],
  },
  {
    type: 'lightSpeed',
    name: 'Skid & Rush',
    children: [
      { name: 'Rush In Left', value: 'lightSpeedInRight' },
      { name: 'Rush In Right', value: 'lightSpeedInLeft' },
    ],
  },
]

export const EXIT_ANIMATIONS = [
  {
    type: 'fade',
    name: 'Dissolve & Fade',
    children: [
      { name: 'Dissolve Out', value: 'fadeOut' },
      { name: 'Drift Out Down', value: 'fadeOutDown' },
      { name: 'Sweep Out Down', value: 'fadeOutDownBig' },
      { name: 'Drift Out Left', value: 'fadeOutLeft' },
      { name: 'Sweep Out Left', value: 'fadeOutLeftBig' },
      { name: 'Drift Out Right', value: 'fadeOutRight' },
      { name: 'Sweep Out Right', value: 'fadeOutRightBig' },
      { name: 'Drift Out Up', value: 'fadeOutUp' },
      { name: 'Sweep Out Up', value: 'fadeOutUpBig' },
      { name: 'Drift Out Top-Left', value: 'fadeOutTopLeft' },
      { name: 'Drift Out Top-Right', value: 'fadeOutTopRight' },
      { name: 'Drift Out Bottom-Left', value: 'fadeOutBottomLeft' },
      { name: 'Drift Out Bottom-Right', value: 'fadeOutBottomRight' },
    ],
  },
  {
    type: 'zoom',
    name: 'Scale Out',
    children: [
      { name: 'Scale Out', value: 'zoomOut' },
      { name: 'Scale Out Down', value: 'zoomOutDown' },
      { name: 'Scale Out Left', value: 'zoomOutLeft' },
      { name: 'Scale Out Right', value: 'zoomOutRight' },
      { name: 'Scale Out Up', value: 'zoomOutUp' },
    ],
  },
  {
    type: 'slide',
    name: 'Move Out',
    children: [
      { name: 'Move Out Down', value: 'slideOutDown' },
      { name: 'Move Out Left', value: 'slideOutLeft' },
      { name: 'Move Out Right', value: 'slideOutRight' },
      { name: 'Move Out Up', value: 'slideOutUp' },
    ],
  },
  {
    type: 'bounce',
    name: 'Bounce Out',
    children: [
      { name: 'Bounce Out', value: 'bounceOut' },
      { name: 'Bounce Out Left', value: 'bounceOutLeft' },
      { name: 'Bounce Out Right', value: 'bounceOutRight' },
      { name: 'Bounce Out Up', value: 'bounceOutUp' },
      { name: 'Bounce Out Down', value: 'bounceOutDown' },
    ],
  },
  {
    type: 'rotate',
    name: 'Rotate Out',
    children: [
      { name: 'Spin Out', value: 'rotateOut' },
      { name: 'Pivot Out Bottom-Left', value: 'rotateOutDownLeft' },
      { name: 'Pivot Out Bottom-Right', value: 'rotateOutDownRight' },
      { name: 'Pivot Out Top-Left', value: 'rotateOutUpLeft' },
      { name: 'Pivot Out Top-Right', value: 'rotateOutUpRight' },
    ],
  },
  {
    type: 'flip',
    name: '3D Flip Out',
    children: [
      { name: 'Flip Out X', value: 'flipOutX' },
      { name: 'Flip Out Y', value: 'flipOutY' },
    ],
  },
  {
    type: 'back',
    name: 'Spring Out',
    children: [
      { name: 'Spring Out Down', value: 'backOutDown' },
      { name: 'Spring Out Left', value: 'backOutLeft' },
      { name: 'Spring Out Right', value: 'backOutRight' },
      { name: 'Spring Out Up', value: 'backOutUp' },
    ],
  },
  {
    type: 'lightSpeed',
    name: 'Skid Out',
    children: [
      { name: 'Rush Out Right', value: 'lightSpeedOutRight' },
      { name: 'Rush Out Left', value: 'lightSpeedOutLeft' },
    ],
  },
]

export const ATTENTION_ANIMATIONS = [
  {
    type: 'shake',
    name: 'Jiggle & Shake',
    children: [
      { name: 'Shake X', value: 'shakeX' },
      { name: 'Shake Y', value: 'shakeY' },
      { name: 'Head Shake', value: 'headShake' },
      { name: 'Swing', value: 'swing' },
      { name: 'Wobble', value: 'wobble' },
      { name: 'Pop Tada', value: 'tada' },
      { name: 'Jello', value: 'jello' },
    ],
  },
  {
    type: 'other',
    name: 'Pulse & Pop',
    children: [
      { name: 'Bounce', value: 'bounce' },
      { name: 'Flash', value: 'flash' },
      { name: 'Pulse', value: 'pulse' },
      { name: 'Rubber Band', value: 'rubberBand' },
      { name: 'Heartbeat', value: 'heartBeat' },
    ],
  },
]

export const ACTION_ANIMATIONS = [
  {
    type: 'transform',
    name: 'Transform Action',
    children: [
      { name: 'Move (Offset ΔX/ΔY)', value: 'actionMove' },
      { name: 'Scale (Resize)', value: 'actionScale' },
      { name: 'Rotate (Angle)', value: 'actionRotate' },
      { name: 'Opacity (Dim/Reveal)', value: 'actionOpacity' },
      { name: 'Combined Transform', value: 'actionTransform' },
    ],
  },
]

interface SlideAnimation {
  label: string
  value: TurningMode
}

export const SLIDE_ANIMATIONS: SlideAnimation[] = [
  { label: 'None', value: 'no' },
  { label: 'Object Transition (Magic Move)', value: 'magicMove' },
  { label: 'Dissolve', value: 'fade' },
  { label: 'Push Horizontal', value: 'slideX' },
  { label: 'Push Vertical', value: 'slideY' },
  { label: '3D Cube Horizontal', value: 'slideX3D' },
  { label: '3D Cube Vertical', value: 'slideY3D' },
  { label: 'Revolve', value: 'rotate' },
  { label: 'Expand Vertical', value: 'scaleY' },
  { label: 'Expand Horizontal', value: 'scaleX' },
  { label: 'Zoom In', value: 'scale' },
  { label: 'Zoom Out', value: 'scaleReverse' },
  { label: 'Random', value: 'random' },
]
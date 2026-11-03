// Strings shared by all journey stages (chrome: language, sound, continue...). Stage-specific copy lives in
// src/stages/<stage>/dict.ts with keys prefixed by the stage id ('meadow.*', 'shop.*', 'night.*') so dictionaries never collide.
export const en = {
  'ui.lang': 'Language',
  'ui.sound.on': 'Sound on', 'ui.sound.off': 'Sound off',
  'ui.continue': 'Continue', 'ui.skip': 'Skip',
  'ui.tap': 'Tap to start', 'ui.press': 'Press any key',
  'ui.rotate': 'Turn your phone sideways for a bigger view',
  'ctl.left': 'Left', 'ctl.right': 'Right', 'ctl.jump': 'Jump', 'ctl.act': 'Look',
};
export type SharedKey = keyof typeof en;
export const zh: Record<SharedKey, string> = {
  'ui.lang': '语言',
  'ui.sound.on': '声音开', 'ui.sound.off': '声音关',
  'ui.continue': '继续', 'ui.skip': '跳过',
  'ui.tap': '轻触开始', 'ui.press': '按任意键开始',
  'ui.rotate': '横过手机，视野更大',
  'ctl.left': '向左', 'ctl.right': '向右', 'ctl.jump': '跳', 'ctl.act': '看看',
};

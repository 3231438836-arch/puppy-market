import {it,expect} from 'vitest';
import {defaultLayout,validLayout,viewportOrientation} from '../src/simulation/layout';
it('横竖屏按实际视口判定，方形默认竖屏',()=>{expect(viewportOrientation(390,844)).toBe('portrait');expect(viewportOrientation(844,390)).toBe('landscape');expect(viewportOrientation(400,400)).toBe('portrait');});
it('偏好独立、默认触控尺寸与位置受限，不接受损坏或未来版本',()=>{const p=defaultLayout();expect(validLayout(p)).toBe(true);expect(p.joystickSize).toBe(120);expect(p.buttonSize).toBe(78);expect(validLayout({...p,buttonSize:30})).toBe(false);expect(validLayout({...p,joystickSize:150})).toBe(false);expect(validLayout({...p,joystickInset:-5})).toBe(false);expect(validLayout({...p,version:2})).toBe(false);expect(validLayout({...p,preferred:'rotate-canvas'})).toBe(false);});

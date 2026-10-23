import {describe,it,expect} from 'vitest';
import {selectInteraction} from '../src/simulation/interaction';
import {joystickVector,joystickOrigin} from '../src/simulation/floating-joystick';
describe('immersive controls',()=>{
 it('uses range, facing and hysteresis for contextual targets',()=>{
  const points=[{id:'left',x:-20,y:0,range:45},{id:'right',x:20,y:0,range:45}];
  expect(selectInteraction({x:0,y:0},{x:1,y:0},points)).toBe('right');
  expect(selectInteraction({x:100,y:0},{x:1,y:0},points)).toBeNull();
  expect(selectInteraction({x:0,y:0},{x:0,y:1},points,'right')).toBe('right');
 });
 it('clamps floating origin and applies radial deadzone and sensitivity',()=>{
  expect(joystickOrigin(2,4,390,844,120)).toEqual({x:66,y:66});
  expect(joystickVector(3,3)).toEqual({x:0,y:0});
  expect(Math.hypot(...Object.values(joystickVector(100,100)))).toBeCloseTo(1);
  expect(joystickVector(20,0,40,.75).x).toBeLessThan(joystickVector(20,0,40,1.3).x);
 });
});

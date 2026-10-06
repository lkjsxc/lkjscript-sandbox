import assert from 'node:assert/strict';
export const emptyTransit=()=>({lines:[],ids:[],nextId:0,plans:[],choices:[],boardings:0,completed:0,spent:0});
export function conserveRail(frame,people){assert.equal(frame.stats.population,people.length);assert.equal(frame.stats.requested,frame.stats.arrived+frame.stats.cancelled+people.filter(p=>[1,2,4,5,6].includes(p.state)).length);for(const line of frame.rails){assert(line.occupancy<=line.capacity);assert(line.occupancy>=0);assert(line.waitingA>=0&&line.waitingB>=0)}}

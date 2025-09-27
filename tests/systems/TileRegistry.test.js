import { describe, it, expect } from 'vitest';
import { TileRegistry, getTileDef, getTileByGlyph } from '../../src/js/world/TileRegistry.js';

describe('TileRegistry structure', () => {
  it('contains default floor definition', () => {
    const def = getTileDef('floor.default');
    expect(def).toBeDefined();
    expect(def.glyph).toBe('.');
    expect(def.sprite).toBe('tile4.png');
    expect(def.terrain.passable).toBe(true);
  });

  it('maps glyph to id', () => {
    expect(getTileByGlyph('┌')).toBe('wall.brick.corner.top_left');
  });

  it('throws on unknown id', () => {
    expect(() => getTileDef('unknown.id')).toThrow();
  });

  it('provides definitions for candy market fixtures', () => {
    const canopy = getTileDef('structure.market.stall.canopy');
    expect(canopy.glyph).toBe('╬');
    expect(canopy.terrain.passable).toBe(true);
    expect(getTileByGlyph('╤')).toBe('structure.market.stall.table');
    expect(getTileByGlyph('≡')).toBe('structure.market.stall.goods_table');
    expect(getTileByGlyph('¤')).toBe('structure.market.cart');
    expect(getTileByGlyph('☐')).toBe('structure.market.crate');
    expect(getTileByGlyph('║')).toBe('structure.market.cart.support');
    expect(getTileByGlyph('♣')).toBe('decoration.candy.tree');
    expect(getTileByGlyph('○')).toBe('decoration.fountain.center');
    expect(getTileByGlyph('▲')).toBe('decoration.shrine.marker');
    expect(getTileByGlyph('V')).toBe('interaction.vendor.tile');
    expect(getTileByGlyph('★')).toBe('item.collectible.artifact');
    expect(getTileByGlyph('♪')).toBe('item.collectible.oddity');
    expect(getTileByGlyph('!')).toBe('item.drop.potion');
    expect(getTileByGlyph('/')).toBe('item.drop.weapon');
    expect(getTileByGlyph(']')).toBe('item.drop.armor');
    expect(getTileDef('item.drop.ring').glyph).toBe('○');
    expect(getTileByGlyph('⚱')).toBe('item.drop.throwable');
    expect(getTileByGlyph('b')).toBe('container.barrel.candy');
    expect(getTileByGlyph('·')).toBe('floor.candy.polished');
    expect(getTileByGlyph('═')).toBe('furniture.bench.horizontal');
    expect(getTileByGlyph('-')).toBe('floor.candy.walkway');
    expect(getTileByGlyph('=')).toBe('road.paved.main');
    expect(getTileByGlyph('†')).toBe('decoration.streetlamp');
    expect(getTileByGlyph('□')).toBe('container.storage.crate');
    expect(getTileByGlyph('|')).toBe('structure.training.rack');
    expect(getTileByGlyph('^')).toBe('terrain.hazard.spikes');
    expect(getTileByGlyph('%')).toBe('material.candy.dust');
    expect(getTileByGlyph('▓')).toBe('structure.building.block');
    expect(getTileByGlyph('∘')).toBe('decoration.transition.marker');
    expect(getTileByGlyph('T')).toBe('decoration.tree.generic');
    expect(getTileByGlyph('⚰')).toBe('structure.grave.marker');
    expect(getTileByGlyph('&')).toBe('decoration.bush.generic');
    expect(getTileByGlyph('*')).toBe('decoration.flower.patch');
    expect(getTileByGlyph('v')).toBe('decoration.mushroom.cluster');
    expect(getTileByGlyph('i')).toBe('decoration.crystal.cluster');
    expect(getTileByGlyph('o')).toBe('terrain.grass.scatter');
    expect(getTileByGlyph('C')).toBe('container.chest.generic');
  });
});

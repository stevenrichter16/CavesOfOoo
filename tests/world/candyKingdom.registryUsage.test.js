import { describe, it, expect, vi, beforeEach } from 'vitest';

async function setupSpy() {
  const tileUtils = await import('../../src/js/world/tileUtils.js');
  const spy = vi.spyOn(tileUtils, 'glyphToTileId');
  return { tileUtils, spy };
}

describe('Candy Kingdom generators rely on tile ids instead of glyph fallback', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('candy market map generation avoids glyph-to-id fallback', async () => {
    const { spy } = await setupSpy();
    const { generateCandyMarketMap } = await import('../../src/js/world/candyMarketChunk.js');
    generateCandyMarketMap();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('candy kingdom town generation avoids glyph-to-id fallback', async () => {
    const { spy } = await setupSpy();
    const { generateCandyKingdomMap } = await import('../../src/js/world/candyKingdomTown.js');
    generateCandyKingdomMap();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('north gate chunk generation avoids glyph-to-id fallback', async () => {
    const { spy } = await setupSpy();
    const { generateNorthGateChunk } = await import('../../src/js/world/candyKingdomChunks.js');
    generateNorthGateChunk(0, 0, -1);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('east gate chunk generation avoids glyph-to-id fallback', async () => {
    const { spy } = await setupSpy();
    const { generateEastGateChunk } = await import('../../src/js/world/candyKingdomChunks.js');
    generateEastGateChunk(0, 1, 0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('south gate chunk generation avoids glyph-to-id fallback', async () => {
    const { spy } = await setupSpy();
    const { generateSouthGateChunk } = await import('../../src/js/world/candyKingdomChunks.js');
    generateSouthGateChunk(0, 0, 1);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('west gate chunk generation avoids glyph-to-id fallback', async () => {
    const { spy } = await setupSpy();
    const { generateWestGateChunk } = await import('../../src/js/world/candyKingdomChunks.js');
    generateWestGateChunk(0, -1, 0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('clean shopping district generation avoids glyph-to-id fallback', async () => {
    const { spy } = await setupSpy();
    const { generateCleanShoppingDistrict } = await import('../../src/js/world/candyShoppingDistrictClean.js');
    generateCleanShoppingDistrict(1, 0, 42);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

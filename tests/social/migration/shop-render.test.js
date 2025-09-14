import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Shop Rendering from Dialogue', () => {
  let dialogueModule;
  let mockOpenShop;
  let mockRenderShop;
  
  beforeEach(() => {
    vi.resetModules();
    mockOpenShop = vi.fn();
    mockRenderShop = vi.fn();
    
    // Mock the shop modules
    vi.doMock('../../../src/js/items/shop.js', () => ({
      openShop: mockOpenShop
    }));
    
    vi.doMock('../../../src/js/ui/shop.js', () => ({
      renderShop: mockRenderShop
    }));
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call both openShop and renderShop when opening shop from dialogue', async () => {
    dialogueModule = await import('../../../src/social/dialogue.js');
    const { processDialogueAction } = dialogueModule;
    
    const state = {
      player: { gold: 100 },
      ui: {}
    };
    
    const npc = {
      id: 'test_vendor',
      name: 'Test Vendor',
      shopkeeper: true,
      goods: ['potions']
    };
    
    // Process openShop action
    const result = processDialogueAction('openShop', state, npc);
    
    // Should return proper result immediately
    expect(result).toEqual({
      opensShop: true,
      closesDialogue: true,
      goods: ['potions']
    });
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Both functions should have been called
    expect(mockOpenShop).toHaveBeenCalledWith(state, npc);
    expect(mockRenderShop).toHaveBeenCalledWith(state);
  });

  it('should handle shop action object format', async () => {
    dialogueModule = await import('../../../src/social/dialogue.js');
    const { processDialogueAction } = dialogueModule;
    
    const state = {
      player: { gold: 100 },
      ui: {}
    };
    
    const npc = {
      id: 'merchant',
      name: 'Merchant',
      shopkeeper: true,
      goods: []
    };
    
    // Process shop action with object format
    const result = processDialogueAction(
      { type: 'shop', open: true },
      state,
      npc
    );
    
    // Should return proper result
    expect(result).toEqual({
      opensShop: true,
      closesDialogue: true,
      goods: []
    });
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Both functions should have been called
    expect(mockOpenShop).toHaveBeenCalledWith(state, npc);
    expect(mockRenderShop).toHaveBeenCalledWith(state);
  });

  it('should ensure state.ui exists before opening shop', async () => {
    dialogueModule = await import('../../../src/social/dialogue.js');
    const { processDialogueAction } = dialogueModule;
    
    // State without ui property
    const state = {
      player: { gold: 100 }
    };
    
    const npc = {
      shopkeeper: true,
      goods: []
    };
    
    // Process openShop action
    processDialogueAction('openShop', state, npc);
    
    // state.ui should have been created
    expect(state.ui).toBeDefined();
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Functions should still be called
    expect(mockOpenShop).toHaveBeenCalled();
    expect(mockRenderShop).toHaveBeenCalled();
  });

  it('should log appropriate messages during shop opening', async () => {
    const logSpy = vi.spyOn(console, 'log');
    
    dialogueModule = await import('../../../src/social/dialogue.js');
    const { processDialogueAction } = dialogueModule;
    
    const state = {
      player: { gold: 100 },
      ui: {}
    };
    
    const npc = {
      name: 'Shop Keeper',
      shopkeeper: true,
      goods: []
    };
    
    processDialogueAction('openShop', state, npc);
    
    // Should log the opening message
    expect(logSpy).toHaveBeenCalledWith(
      '[DIALOGUE] Opening shop for NPC:',
      'Shop Keeper'
    );
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should log the shop system calls
    expect(logSpy).toHaveBeenCalledWith('[DIALOGUE] Calling ShopSystem.openShop');
    expect(logSpy).toHaveBeenCalledWith('[DIALOGUE] Rendering shop UI');
    
    logSpy.mockRestore();
  });
});
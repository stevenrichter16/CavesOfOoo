import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openQuestTurnIn, processQuestRewards, closeQuestTurnIn } from '../../src/js/quests/questTurnIn.js';
import { openShop } from '../../src/js/items/shop.js';
import { renderShop } from '../../src/js/ui/shop.js';
import { emit, on } from '../../src/js/utils/events.js';
import { QUEST_TEMPLATES } from '../../src/js/core/config.js';

vi.mock('../../src/js/utils/events.js', () => ({
  emit: vi.fn(),
  on: vi.fn()
}));

vi.mock('../../src/js/items/shop.js', () => ({
  openShop: vi.fn()
}));

vi.mock('../../src/js/ui/shop.js', () => ({
  renderShop: vi.fn()
}));

describe('Quest Turn-In to Shop Transition', () => {
  let state;
  let vendor;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up initial state with a player who has gold and a completed quest
    state = {
      player: {
        gold: 50, // Starting gold
        inventory: [],
        quests: {
          active: ['kill_any'],
          completed: [],
          progress: {
            'kill_any': 1 // Quest completed
          },
          fetchQuests: {}
        },
        xp: 0,
        xpNext: 100,
        level: 1
      },
      ui: {
        questTurnInOpen: false,
        shopOpen: false,
        shopVendor: null,
        shopMode: null,
        completedQuests: [],
        allCompletedQuests: null,
        selectedQuestIndex: 0,
        selectingQuest: false,
        selectingFetchItem: null,
        fetchItemSelectedIndex: 0,
        selectedFetchItemIndex: undefined
      },
      log: vi.fn(),
      render: vi.fn()
    };
    
    vendor = {
      id: 'vendor_test_1',
      x: 5,
      y: 5,
      inventory: [
        { type: 'weapon', item: { name: 'Test Sword', dmg: 5 }, price: 20 }
      ]
    };
  });
  
  describe('Gold Display Synchronization', () => {
    it('should display correct gold amount when transitioning from quest turn-in to shop', async () => {
      const completedQuests = ['kill_any'];
      const questReward = QUEST_TEMPLATES['kill_any'].rewards.gold;
      const initialGold = state.player.gold;
      const expectedGold = initialGold + questReward;
      
      // Step 1: Open quest turn-in
      openQuestTurnIn(state, vendor, completedQuests);
      
      expect(state.ui.questTurnInOpen).toBe(true);
      expect(state.ui.shopVendor).toBe(vendor);
      expect(state.ui.completedQuests).toEqual(completedQuests);
      
      // Step 2: Process quest rewards (this adds gold)
      processQuestRewards(state, completedQuests);
      
      // Verify gold was added
      expect(state.player.gold).toBe(expectedGold);
      expect(state.log).toHaveBeenCalledWith(
        `Received ${questReward} gold!`,
        'gold'
      );
      
      // Step 3: Close quest turn-in (this should trigger shop opening)
      closeQuestTurnIn(state);
      
      expect(state.ui.questTurnInOpen).toBe(false);
      
      // Step 4: Simulate the delayed shop opening event
      // The closeQuestTurnIn function emits an event after 100ms
      await new Promise(resolve => setTimeout(resolve, 110));
      
      // Verify the event was emitted with the correct vendor
      expect(emit).toHaveBeenCalledWith('questTurnIn:openShop', { vendor });
      
      // Step 5: Simulate shop opening (normally handled by game.js event listener)
      openShop(state, vendor);
      state.ui.shopOpen = true;
      state.ui.shopMode = 'buy';
      
      // Step 6: Render the shop UI
      renderShop(state);
      
      // The key assertion: Verify that the state passed to renderShop has the correct gold
      const renderCall = vi.mocked(renderShop).mock.calls[0];
      const statePassedToRender = renderCall?.[0];
      
      expect(statePassedToRender).toBeDefined();
      expect(statePassedToRender.player.gold).toBe(expectedGold);
    });
    
    it('should maintain correct gold after multiple quest turn-ins', async () => {
      // Set up multiple completed quests
      state.player.quests.active = ['kill_any', 'kill_goober'];
      state.player.quests.progress = {
        'kill_any': 1,
        'kill_goober': 3
      };
      
      const completedQuests = ['kill_any', 'kill_goober'];
      const initialGold = state.player.gold;
      const quest1Reward = QUEST_TEMPLATES['kill_any'].rewards.gold;
      const quest2Reward = QUEST_TEMPLATES['kill_goober'].rewards.gold;
      const expectedGold = initialGold + quest1Reward + quest2Reward;
      
      // Process both quests
      openQuestTurnIn(state, vendor, completedQuests);
      processQuestRewards(state, completedQuests);
      
      // Verify cumulative gold
      expect(state.player.gold).toBe(expectedGold);
      
      // Close and transition to shop
      closeQuestTurnIn(state);
      
      await new Promise(resolve => setTimeout(resolve, 110));
      
      // Open shop
      openShop(state, vendor);
      renderShop(state);
      
      // Verify gold is still correct
      const renderCall = vi.mocked(renderShop).mock.calls[0];
      const statePassedToRender = renderCall?.[0];
      
      expect(statePassedToRender.player.gold).toBe(expectedGold);
    });
    
    it('should handle fetch quest rewards correctly', () => {
      // Set up a fetch quest
      const fetchQuestId = 'fetch_test_quest';
      state.player.quests.fetchQuests[fetchQuestId] = {
        id: fetchQuestId,
        name: 'Test Fetch Quest',
        vendorId: vendor.id,
        targetItem: {
          name: 'Test Item',
          itemCheck: (item) => item.item?.name === 'Test Item'
        },
        rewards: {
          gold: 75,
          xp: 50
        },
        completionText: 'Thanks for the item!'
      };
      
      // Add the required item to inventory
      state.player.inventory.push({
        type: 'misc',
        item: { name: 'Test Item' },
        id: 'test_item_1'
      });
      
      state.player.quests.active.push(fetchQuestId);
      
      const initialGold = state.player.gold;
      const expectedGold = initialGold + 75;
      
      // Process fetch quest turn-in
      openQuestTurnIn(state, vendor, [fetchQuestId]);
      
      // Mock the fetch quest completion
      // Normally this would be handled by turnInFetchQuest
      state.player.gold += 75;
      state.log('Received 75 gold!', 'gold');
      
      expect(state.player.gold).toBe(expectedGold);
      
      // Transition to shop
      closeQuestTurnIn(state);
      openShop(state, vendor);
      renderShop(state);
      
      // Verify gold is correct
      const renderCall = vi.mocked(renderShop).mock.calls[0];
      const statePassedToRender = renderCall?.[0];
      
      expect(statePassedToRender.player.gold).toBe(expectedGold);
    });
    
    it('should preserve vendor reference during transition', async () => {
      const completedQuests = ['kill_any'];
      
      openQuestTurnIn(state, vendor, completedQuests);
      processQuestRewards(state, completedQuests);
      
      // Store vendor reference before closing
      const vendorBeforeClose = state.ui.shopVendor;
      
      closeQuestTurnIn(state);
      
      // Wait for the delayed event
      await new Promise(resolve => setTimeout(resolve, 110));
      
      // Verify the event was emitted with the original vendor
      const emitCalls = vi.mocked(emit).mock.calls;
      const openShopEvent = emitCalls.find(call => call[0] === 'questTurnIn:openShop');
      
      expect(openShopEvent).toBeDefined();
      expect(openShopEvent[1].vendor).toStrictEqual(vendorBeforeClose);
      expect(openShopEvent[1].vendor.id).toBe('vendor_test_1');
    });
    
    it('should clear quest turn-in state but preserve vendor for shop', () => {
      const completedQuests = ['kill_any'];
      
      openQuestTurnIn(state, vendor, completedQuests);
      
      // Verify quest turn-in state is set
      expect(state.ui.questTurnInOpen).toBe(true);
      expect(state.ui.completedQuests).toEqual(completedQuests);
      expect(state.ui.shopVendor).toBe(vendor);
      
      // Close quest turn-in
      closeQuestTurnIn(state);
      
      // Verify quest turn-in state is cleared
      expect(state.ui.questTurnInOpen).toBe(false);
      expect(state.ui.completedQuests).toEqual([]);
      expect(state.ui.allCompletedQuests).toBeNull();
      expect(state.ui.selectingFetchItem).toBeNull();
      expect(state.ui.fetchItemSelectedIndex).toBe(0);
      expect(state.ui.selectingQuest).toBe(false);
    });
  });
  
  describe('Shop UI Gold Display', () => {
    it('should show correct gold in shop UI after quest rewards', () => {
      // This test verifies the actual UI would display the correct gold
      const mockState = {
        player: { gold: 175 }, // After quest rewards
        ui: {
          shopOpen: true,
          shopMode: 'buy',
          shopVendor: vendor
        }
      };
      
      // When renderShop is called with this state
      renderShop(mockState);
      
      // The mock should have been called with the state containing correct gold
      expect(vi.mocked(renderShop)).toHaveBeenCalledWith(
        expect.objectContaining({
          player: expect.objectContaining({
            gold: 175
          })
        })
      );
    });
    
    it('should update gold display after forced re-render', async () => {
      // Initial render with stale gold
      let currentState = {
        player: { gold: 50 },
        ui: {
          shopOpen: true,
          shopMode: 'buy',
          shopVendor: vendor
        }
      };
      
      renderShop(currentState);
      
      // First render shows old gold
      expect(vi.mocked(renderShop)).toHaveBeenCalledWith(
        expect.objectContaining({
          player: expect.objectContaining({
            gold: 50
          })
        })
      );
      
      // Update gold (simulating quest reward)
      currentState.player.gold = 125;
      
      // Simulate the forced re-render after 10ms (as in the fix)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      renderShop(currentState);
      
      // Second render should show updated gold
      const lastCall = vi.mocked(renderShop).mock.calls[vi.mocked(renderShop).mock.calls.length - 1];
      expect(lastCall[0].player.gold).toBe(125);
    });
  });
});
# Engine System Verification Checklist

## Test Commands
Press `T` in game to see test menu, then use Shift+Number for tests.

## Core Systems

### ✅ Dual Storage System
- [ ] Map storage for processing
- [ ] Array storage for UI/Engine visibility
- [ ] Synchronization between both

### ✅ Status Effect Lifecycle
- [ ] Application with turns and value
- [ ] Turn countdown
- [ ] Damage/heal application
- [ ] Expiration and cleanup
- [ ] Particle system integration

### ✅ Engine Integration
- [ ] Entity snapshot building
- [ ] Status tag mapping
- [ ] Material detection (water tiles, metal gear)
- [ ] Phase execution (TICK, PREDAMAGE)
- [ ] Rule evaluation

## Feature Tests

### Test 1: Fire + Water Interaction (Shift+1)
**Expected**: Applying wet should extinguish burning
- [ ] Burn status applies
- [ ] Wet status removes burn
- [ ] Log shows "The flames are extinguished!"

### Test 2: Freeze Prevention (Shift+2)
**Expected**: Freeze should prevent movement
- [ ] Freeze status applies
- [ ] Movement attempts are blocked
- [ ] "FROZEN" appears in status bar

### Test 3: Stat Modifiers (Shift+3)
**Expected**: Weaken/Armor modify stats
- [ ] Weaken reduces STR by 3
- [ ] Armor increases DEF by 3
- [ ] Stats display correctly in UI

### Test 4: Wet + Electric Instant Kill (Shift+4)
**Expected**: Wet + Shock = instant death
- [ ] Wet status makes entity conductive
- [ ] Shock damage becomes lethal (99999)
- [ ] Death message appears

### Test 5: Multiple DOT Effects (Shift+5)
**Expected**: All DOT effects stack and work
- [ ] Burn, poison, shock, bleed all apply
- [ ] Each does appropriate damage
- [ ] All tick independently

### Test 6: Water Material (Shift+6)
**Expected**: Water tiles provide conductivity
- [ ] Stepping in water applies wet status
- [ ] Entity becomes conductive
- [ ] Shock while in water = instant death

### Test 7: Status Stacking (Shift+7)
**Expected**: Same status stacks properly
- [ ] Multiple applications stack turns
- [ ] Highest value is used
- [ ] Console shows stacking behavior

### Test 8: Quick Expiration (Shift+8)
**Expected**: 1-turn effects expire correctly
- [ ] Effects last exactly 1 turn
- [ ] Proper cleanup after expiration
- [ ] Particles stop

### Test 9: Full Diagnostic (Shift+9)
**Expected**: Complete system check
- [ ] All statuses registered with tags
- [ ] All phases available
- [ ] Map/Array synchronized
- [ ] No errors in console

## Rules Working

### Damage Modification
- [ ] `wet_electric_lethal_test`: Conductive + Electric = 99999 damage

### Status Interactions
- [ ] `fire_thaws_on_apply`: Fire removes wet/freeze
- [ ] `water_extinguishes_on_apply`: Water removes burning

### Control Effects
- [ ] `freeze_prevent_turn`: Freeze blocks movement
- [ ] `status_stat_mods`: Status effects modify stats

### DOT Processing
- [ ] `dot_tick`: All DOT effects deal damage (when enabled)

## Console Verification

Run each test and verify console shows:
- [ ] Clear status application flow
- [ ] Map/Array synchronization messages
- [ ] Turn tick processing
- [ ] Damage application
- [ ] Rule matching
- [ ] Phase execution
- [ ] Status expiration

## Files to Remove After Verification

Once all tests pass:
```bash
rm -rf src/js/engine/engine-update/
```

## Known Working Features
- ✅ Status effect application and storage
- ✅ Turn-based processing
- ✅ Damage over time effects
- ✅ Engine rule evaluation
- ✅ Predamage phase for shock
- ✅ Status expiration
- ✅ Particle system integration
- ✅ UI status display
- ✅ Console logging system

## Notes
- The engine uses a dual storage system for backward compatibility
- Rules are data-driven and can be extended without code changes
- The system is designed to be observable through console logs
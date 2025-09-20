export const killMonsterQuestDef = {
    id: 'kill_monster_quest',

    create: (params = {}) => ({
        id: 'kill_monster_quest',
        name: 'Kill a Monster',
        description: 'Venture into the wild and slay a beast!',

        giver: 'Steven',
        giverLocation: { cx: 0, cy: 0, biome: 'candy_kingdom'},
        priority: 'SIDE',
        difficulty: 'TRIVIAL',
        level: 1,

        objectives: [
            {
                id: 'kill_monster',
                type: 'EVENT_BASED',
                description: 'Kill a monster by attacking it!',
                progress: 0,
                count: 1,
                completed: false,
                conditions: {
                    events: ['MONSTER_KILLED']
                }
            }
        ],

        rewards: {
            gold: 5250,
            experience: 1000,
            items: []
        },

        state: 'ACTIVE',
        startedAt: null,
        completedAt: null,

        flags: params.flags || {}
    }),

    onStart: (state, quest) => {
        if(state.flags) {
            state.flags.monster_kill_quest_started = true;
        }

        if (state.log) {
            state.log("'Steven! Kill a monster!'", "quest");
        }
    },

    onComplete: (state, quest, rewards) => {
        // Set completion flag for dialogue system
        if (state.flags) {
            state.flags.monster_kill_quest_completed = true;
        }
        
        // Log completion
        if (state.log) {
            state.log("Steven: 'WOW! You're a natural killer!'", "quest");
            state.log("'Here's your reward for killing that thing!'", "quest");
        }
    }
};
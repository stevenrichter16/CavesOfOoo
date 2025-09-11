import { ChunkSystem } from '../../src/js/world/ChunkSystem.js';
import { ChunkPipeline } from '../../src/js/world/pipeline/ChunkPipeline.js';
import { SeededRandom } from '../../src/js/world/pipeline/SeededRandom.js';
import { Chunk } from '../../src/js/world/core/Chunk.js';

const mockEventBus = { 
  emit: () => {}, 
  on: () => {},
  off: () => {}
};

console.log('🔍 Detailed BiomeManager Integration Debug\n');
console.log('=' .repeat(50));

// Test 1: ChunkSystem initialization
console.log('\n1️⃣ ChunkSystem Initialization');
const system = new ChunkSystem(mockEventBus, { 
  useAdventureTimeBiomes: true, 
  seed: 'test' 
});

await system.initializeBiomeManager();
console.log('   BiomeManager exists:', !!system.biomeManager);
console.log('   Pipeline exists:', !!system.pipeline);

// Test 2: Check what pipeline receives
console.log('\n2️⃣ Pipeline Context Check');

// Monkey-patch the pipeline to see what it receives
const originalGenerate = system.pipeline.generate.bind(system.pipeline);
let capturedOptions = null;

system.pipeline.generate = async function(seed, cx, cy, options) {
  capturedOptions = options;
  console.log('   Pipeline received options:', {
    hasBiomeManager: !!options?.biomeManager,
    optionsKeys: options ? Object.keys(options) : []
  });
  return originalGenerate(seed, cx, cy, options);
};

// Generate a chunk through ChunkSystem
await system.generateChunk('test', 0, 0);

console.log('   Options captured:', {
  hasBiomeManager: !!capturedOptions?.biomeManager,
  biomeManagerType: capturedOptions?.biomeManager?.constructor?.name
});

// Test 3: Check BiomeStep directly
console.log('\n3️⃣ BiomeStep Context Check');

// Get the BiomeStep from pipeline
const biomeStep = system.pipeline.steps.find(s => s.name === 'BiomeStep');
if (biomeStep) {
  // Monkey-patch BiomeStep process
  const originalProcess = biomeStep.process.bind(biomeStep);
  
  biomeStep.process = async function(context) {
    console.log('   BiomeStep context:', {
      hasBiomeManager: !!context.biomeManager,
      hasChunk: !!context.chunk,
      cx: context.cx,
      cy: context.cy
    });
    
    const result = await originalProcess(context);
    
    console.log('   BiomeStep result:', {
      biome: context.chunk.biome,
      usedBiomeManager: !!context.biomeManager
    });
    
    return result;
  };
  
  // Generate another chunk to see the debug
  await system.generateChunk('test', 1, 0);
}

// Test 4: Direct pipeline test with explicit biomeManager
console.log('\n4️⃣ Direct Pipeline Test');
const directChunk = await system.pipeline.generate('test', 0, 0, {
  biomeManager: system.biomeManager
});
console.log('   Direct result:', directChunk.biome);

// Test 5: Create new pipeline with biomeManager
console.log('\n5️⃣ New Pipeline with BiomeManager');
const newPipeline = new ChunkPipeline(mockEventBus);

// Ensure BiomeStep has access to biomeManager
const testContext = {
  seed: 'test',
  cx: 0,
  cy: 0,
  chunk: new Chunk(0, 0),
  rng: new SeededRandom('test', 0, 0),
  params: {},
  cancelled: false,
  biomeManager: system.biomeManager
};

// Process through each step manually
for (const step of newPipeline.steps) {
  if (step.name === 'BiomeStep') {
    console.log('   Before BiomeStep:', testContext.chunk.biome);
    await step.process(testContext);
    console.log('   After BiomeStep:', testContext.chunk.biome);
    console.log('   BiomeManager was used:', !!testContext.biomeManager);
  }
}

console.log('\n' + '=' .repeat(50));
console.log('🔎 Debug Summary:');
console.log('   ChunkSystem has BiomeManager:', !!system.biomeManager);
console.log('   BiomeManager returns correct biome:', system.biomeManager?.getBiome(0, 0));
console.log('   Pipeline receives biomeManager:', !!capturedOptions?.biomeManager);
console.log('   BiomeStep uses biomeManager:', testContext.chunk.biome === 'candy_kingdom');

if (testContext.chunk.biome === 'candy_kingdom') {
  console.log('\n✅ BiomeManager integration is working correctly!');
} else {
  console.log('\n❌ BiomeManager integration needs fixing');
  console.log('   Expected: candy_kingdom');
  console.log('   Got:', testContext.chunk.biome);
}
#!/usr/bin/env node

/**
 * API Performance Tester
 * Compare avant/après optimisation des endpoints
 * 
 * Usage: node scripts/testApiSize.js
 */

const http = require('http');

const testCases = [
  {
    name: 'Événement Complet (ancien)',
    endpoint: '/api/events/cmj1l51gl0007vka0li6mlpfb',
    description: 'Charge TOUT (avant optimisation)'
  },
  {
    name: 'Minimal (nouveau)',
    endpoint: '/api/events/cmj1l51gl0007vka0li6mlpfb/minimal',
    description: 'Infos basiques uniquement'
  },
  {
    name: 'Participants',
    endpoint: '/api/events/cmj1l51gl0007vka0li6mlpfb/participants',
    description: 'Liste des participants'
  },
  {
    name: 'Messages',
    endpoint: '/api/events/cmj1l51gl0007vka0li6mlpfb/messages?limit=50',
    description: '50 derniers messages'
  },
  {
    name: 'Polls',
    endpoint: '/api/events/cmj1l51gl0007vka0li6mlpfb/polls',
    description: 'Tous les sondages'
  },
  {
    name: 'Contributions',
    endpoint: '/api/events/cmj1l51gl0007vka0li6mlpfb/contributions',
    description: 'Toutes les contributions'
  },
  {
    name: 'Tasks',
    endpoint: '/api/events/cmj1l51gl0007vka0li6mlpfb/tasks',
    description: 'Toutes les tâches'
  },
  {
    name: 'Menu',
    endpoint: '/api/events/cmj1l51gl0007vka0li6mlpfb/menu',
    description: 'Menu + ingrédients'
  },
];

function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3000${endpoint}`;
    
    const startTime = Date.now();
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const size = Buffer.byteLength(data, 'utf8');
        
        resolve({
          status: res.statusCode,
          size: size,
          duration: duration,
          headers: res.headers
        });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('\n🧪 API Performance Test\n');
  console.log('=' .repeat(80));
  
  let totalSize = 0;
  let totalTime = 0;
  const results = [];
  
  for (const test of testCases) {
    try {
      console.log(`\n📍 Testing: ${test.name}`);
      console.log(`   ${test.description}`);
      console.log(`   GET ${test.endpoint}`);
      process.stdout.write('   Loading... ');
      
      const result = await makeRequest(test.endpoint);
      
      const sizeKB = (result.size / 1024).toFixed(2);
      const sizeColor = result.size > 50000 ? '🔴' : result.size > 20000 ? '🟡' : '🟢';
      
      console.log(`${sizeColor}`);
      console.log(`   ✓ Status: ${result.status}`);
      console.log(`   ✓ Size: ${sizeKB} KB (${result.size} bytes)`);
      console.log(`   ✓ Time: ${result.duration} ms`);
      
      results.push({
        name: test.name,
        size: result.size,
        time: result.duration,
        sizeKB: parseFloat(sizeKB)
      });
      
      totalSize += result.size;
      totalTime += result.duration;
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  
  const totalKB = (totalSize / 1024).toFixed(2);
  const avgTime = (totalTime / testCases.length).toFixed(0);
  
  console.log(`Total Size: ${totalKB} KB (${totalSize} bytes)`);
  console.log(`Total Time: ${totalTime} ms`);
  console.log(`Average Response Time: ${avgTime} ms`);
  
  // Breakdown
  console.log('\n📈 BREAKDOWN:\n');
  results.sort((a, b) => b.size - a.size);
  
  results.forEach(r => {
    const bar = '█'.repeat(Math.ceil(r.sizeKB / 5));
    console.log(`${r.name.padEnd(25)} ${bar} ${r.sizeKB.padEnd(8)} KB (${r.time} ms)`);
  });
  
  // Comparison
  console.log('\n💡 KEY INSIGHTS:\n');
  
  const oldSize = results.find(r => r.name.includes('Événement Complet'));
  const newSize = results.filter(r => !r.name.includes('Événement Complet'));
  
  if (oldSize) {
    const newTotal = newSize.reduce((sum, r) => sum + r.size, 0);
    const reduction = (((oldSize.size - newTotal) / oldSize.size) * 100).toFixed(0);
    
    console.log(`Old approach (load all): ${oldSize.sizeKB} KB`);
    console.log(`New approach (load on demand): ${(newTotal/1024).toFixed(2)} KB`);
    console.log(`Reduction: ${reduction}% 🎉\n`);
  }
  
  // Largest endpoint
  const largest = results[0];
  console.log(`Largest endpoint: ${largest.name} (${largest.sizeKB} KB)`);
  console.log(`Smallest endpoint: ${results[results.length - 1].name} (${results[results.length - 1].sizeKB} KB)\n`);
  
  console.log('=' .repeat(80));
  console.log('\n✅ Test complete!\n');
}

// Run tests
runTests().catch(console.error);

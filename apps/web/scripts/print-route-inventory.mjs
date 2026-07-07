import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { buildRouteInventory } = require('../dist-test/lib/server/access/route-policy-inventory.js');
const inventory = buildRouteInventory();
writeFileSync('route-inventory.snapshot.json', `${JSON.stringify({ generatedAt: new Date().toISOString(), count: inventory.length, inventory }, null, 2)}\n`);
console.log(`wrote route-inventory.snapshot.json (${inventory.length} routes)`);

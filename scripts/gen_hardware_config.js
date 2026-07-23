const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../shared/plant_config.json');
const headerPath = path.join(
  __dirname,
  '../hardware/lib/shared/shared_constants.h'
);

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function cppDeclaration(key, value) {
  const name = `SHARED_${key.toUpperCase()}`;
  if (typeof value === 'string') {
    return `static const char* ${name} = "${value}";`;
  }
  if (typeof value === 'number') {
    const type = Number.isInteger(value) ? 'int' : 'double';
    return `static const ${type} ${name} = ${value};`;
  }
  if (typeof value === 'boolean') {
    return `static const bool ${name} = ${value ? 'true' : 'false'};`;
  }
  throw new Error(
    `gen_hardware_config: unsupported value type for "${key}": ${typeof value}`
  );
}

// Constant names are derived directly from the JSON keys, so adding a new
// field to plant_config.json is enough on its own — no template edit here
// required to expose it to firmware.
const declarations = Object.entries(config).map(([key, value]) =>
  cppDeclaration(key, value)
);

const header = `#ifndef SHARED_CONSTANTS_H
#define SHARED_CONSTANTS_H

${declarations.join('\n')}

#endif
`;

fs.writeFileSync(headerPath, header, 'utf8');
console.log(`Wrote ${headerPath}`);

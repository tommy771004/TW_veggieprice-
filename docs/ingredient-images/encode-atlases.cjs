// Format-only encoding; original generated PNG masters remain untouched.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
(async () => {
  const directory = path.resolve(__dirname, '../../public/images/ingredients');
  const files = (await fs.readdir(directory)).filter(name => name.endsWith('.png'));
  let original = 0, encoded = 0;
  for (const name of files) {
    const input = path.join(directory, name);
    const output = input.replace(/\.png$/, '.webp');
    await sharp(input).webp({ quality: 90, effort: 6 }).toFile(output);
    original += (await fs.stat(input)).size;
    encoded += (await fs.stat(output)).size;
  }
  console.log(JSON.stringify({ atlases: files.length, originalBytes: original, encodedBytes: encoded }));
})();

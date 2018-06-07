import * as fs from 'fs';
import * as util from 'util';

if (process.argv.length < 3) {
    console.log('Usage: javascript-deobfuscator <file>');
    process.exit(1);
}

async function main() {
    const readFile = util.promisify(fs.readFile);
    var code = await readFile(process.argv[2], 'utf8');
}

main().catch(console.error);
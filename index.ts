import * as fs from 'fs';
import * as util from 'util';
import { Deobfuscator } from './src/deobfuscator';

if (process.argv.length < 3) {
    console.log('Usage: javascript-deobfuscator <file>');
    process.exit(1);
}

try {
    const code = fs.readFileSync(process.argv[2], 'utf8');
    const deobf = new Deobfuscator(code);
    deobf.init();
    const result = deobf.deobfuscate();
    console.log(result);
} catch (e) {
    console.error(e);
}

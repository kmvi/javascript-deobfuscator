import * as fs from 'fs';
import * as util from 'util';
import { Deobfuscator } from './src/deobfuscator';

if (process.argv.length < 4) {
    console.log('Usage: javascript-deobfuscator <in-file> <out-file>');
    process.exit(1);
}

try {
    console.log('Loading file %s...', process.argv[2]);
    const code = fs.readFileSync(process.argv[2], 'utf8');
    const deobf = new Deobfuscator(code);
    deobf.init();
    const result = deobf.deobfuscate();
    console.log();
    if (process.argv[3] === '-') {
        console.log(result);
    } else {
        console.log('Writing result to %s...', process.argv[3]);
        fs.writeFileSync(process.argv[3], result, 'utf8');
    }
} catch (e) {
    console.error(e);
    console.error(e.stack);
}

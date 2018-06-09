import * as espree from 'espree';
import * as estree from 'estree';
import { generate } from 'escodegen';
import { EspreeFacade } from './EspreeFacade';
import { VariableDeclaration } from 'estree';
import { StringArrayProtection } from './string-array';
import { registerDecoders } from './utils';

export class Deobfuscator {

    private static readonly espreeParseOptions: espree.ParseOptions = {
        attachComment: true,
        comment: true,
        ecmaFeatures: {
            experimentalObjectRestSpread: true
        },
        ecmaVersion: 9,
        loc: true,
        range: true
    };

    private ast: estree.Program | null = null;

    constructor (public code: string) {
        
    }

    init(): void {
        this.ast = EspreeFacade.parse(this.code, Deobfuscator.espreeParseOptions);
        registerDecoders();
    }

    deobfuscate(): string {
        if (!this.ast)
            throw new Error('Call init() first.');

        let code = this.code;
        let ast = this.ast;

        let p = new StringArrayProtection(code, ast);
        p.detect();
        p.remove();

        let result = generate(this.ast);
        
        return result;
    }

}

import * as espree from 'espree';
import * as estree from 'estree';

export abstract class ProtectionBase {
    constructor (
        protected code: string,
        protected ast: estree.Program) {

    }
}

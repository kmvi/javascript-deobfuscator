import * as espree from 'espree';
import * as estree from 'estree';

export abstract class ProtectionBase {

    protected active: boolean = false;

    constructor (
        protected code: string,
        protected ast: estree.Program)
    {

    }

    abstract detect(): boolean;
    abstract remove(): estree.Program;

    isActive() {
        return this.active;
    }

}

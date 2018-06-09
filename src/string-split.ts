import * as espree from 'espree';
import * as estree from 'estree';
import { ProtectionBase } from "./protection";
import { VisitorOption, traverse, replace } from 'estraverse';
import { isBinaryExpression, isLiteral } from './utils';

export class StringSplit extends ProtectionBase {

    constructor(code: string, ast: estree.Program) {
        super(code, ast);
        this.active = true;
    }

    detect(): boolean {
        return this.active;
    }

    remove(): estree.Program {
        if (!this.active)
            return this.ast;

        this.ast = <estree.Program> replace(this.ast, {
            enter: (node, parent) => {
                if (isBinaryExpression(node) && node.operator === '+' &&
                    isLiteral(node.left) && isLiteral(node.right) &&
                    typeof node.left.value === 'string' && typeof node.right.value === 'string')
                {
                    return <estree.Literal> {
                        type: 'Literal',
                        value: node.left.value + node.right.value
                    };
                }
            }
        });
        
        return this.ast;
    }

}
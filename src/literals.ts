import * as espree from 'espree';
import * as estree from 'estree';
import { ProtectionBase } from "./protection";
import { VisitorOption, traverse, replace } from 'estraverse';
import * as Utils from './utils';

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

        process.stdout.write('* Merging string literals...');
        this.ast = <estree.Program> replace(this.ast, {
            enter: (node, parent) => {
                if (Utils.isBinaryExpression(node) && node.operator === '+' &&
                Utils.isLiteral(node.left) && Utils.isLiteral(node.right) &&
                    typeof node.left.value === 'string' && typeof node.right.value === 'string')
                {
                    return <estree.Literal> {
                        type: 'Literal',
                        value: node.left.value + node.right.value
                    };
                }
            }
        });
        process.stdout.write(' done.\n');

        return this.ast;
    }

}

export class BooleanLiterals extends ProtectionBase {

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

        process.stdout.write('* Replacing bool expressions...');
        this.ast = <estree.Program> replace(this.ast, {
            enter: (node, parent) => {
                let isEmptyArray = function (e: estree.Node): e is estree.ArrayExpression {
                    return Utils.isArrayExpression(e) && e.elements.length === 0;
                };
                let isNegate = function (e: estree.Node): e is estree.UnaryExpression {
                    return Utils.isUnaryExpression(e) && e.operator === '!';
                };
                if (isNegate(node)) {
                    if (isNegate(node.argument) && isEmptyArray(node.argument.argument)) {
                        return <estree.Literal> {
                            type: 'Literal',
                            value: true
                        };
                    } else if (isEmptyArray(node.argument)) {
                        return <estree.Literal> {
                            type: 'Literal',
                            value: false
                        };
                    }
                }
            }
        });
        process.stdout.write(' done.\n');

        return this.ast;
    }

}

import * as espree from 'espree';
import * as estree from 'estree';
import { ProtectionBase } from "./protection";
import { VisitorOption, traverse, replace } from 'estraverse';
import * as Utils from './utils';

export class MemberExpr extends ProtectionBase {

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

        replace(this.ast, {
            enter: (node, parent) => {
                if (!Utils.isMemberExpression(node) || !node.computed)
                    return undefined;
                if (Utils.isLiteral(node.property) && typeof node.property.value === 'string') {
                    if (/^[_a-zA-Z][_0-9a-zA-Z]*$/.test(node.property.value)) {
                        let result = JSON.parse(JSON.stringify(node));
                        result.computed = false;
                        result.property = <estree.Identifier> {
                            type: 'Identifier',
                            name: node.property.value
                        };
                        return result;
                    }
                }
            }
        });

        return this.ast;
    }

}

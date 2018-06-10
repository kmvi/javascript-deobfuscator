import * as espree from 'espree';
import * as estree from 'estree';
import { ProtectionBase } from "./protection";
import { VisitorOption, traverse, replace } from 'estraverse';
import * as Utils from './utils';
import { assert } from 'console';

type SwitchInfo = {
    discrVar: estree.VariableDeclaration;
    discr: estree.VariableDeclarator;
    loop: estree.WhileStatement;
    discrArray: string[];
    sw: estree.SwitchStatement;
    parent: estree.BlockStatement;
};

type Replace = {
    [key: string]: estree.Expression;
};

type ObjReplace = {
    [varname: string]: Replace;
};

export class BlockControlFlow extends ProtectionBase {

    private loops: SwitchInfo[] = [];

    constructor(code: string, ast: estree.Program) {
        super(code, ast);
    }

    detect(): boolean {
        this.active = false;
        this.loops = this.findLoops();
        this.active = this.loops.length > 0;
        return this.active;
    }

    private fillDiscriminators(loop: SwitchInfo): void {
        assert(loop.discr.init && Utils.isCallExpression(loop.discr.init));
        let call = loop.discr.init as estree.CallExpression;
        assert(call.arguments.length === 1
            && Utils.isLiteral(call.arguments[0])
            && (<estree.Literal> call.arguments[0]).value === '|');
        assert(Utils.isMemberExpression(call.callee)
            && Utils.isLiteral(call.callee.property)
            && call.callee.property.value === 'split');
        let obj = (<estree.MemberExpression> call.callee).object;
        if (Utils.isLiteral(obj) && typeof obj.value === 'string') {
            loop.discrArray = obj.value.split('|');
        } else if (Utils.isMemberExpression(obj)
            && Utils.isIdentifier(obj.object)
            && Utils.isLiteral(obj.property))
        {
            const val = this.findValue(obj.object.name, obj.property.value as string);
            if (val) {
                loop.discrArray = val.split('|');
            } else {
                throw new Error('Unable to find value of ' + Utils.cutCode(this.code, obj));
            }
        } else {
            throw new Error('Unexpected expression: ' + Utils.cutCode(this.code, obj));
        }
    }

    private findValue(name: string, key: string): string | undefined {
        let result: string | undefined = undefined;
        traverse(this.ast, {
            enter: (node, parent) => {
                if (Utils.isVariableDeclaration(node)) {
                    const decl = node.declarations.find(x => Utils.isIdentifier(x.id) && x.id.name === name);
                    if (decl && decl.init && Utils.isObjectExpression(decl.init)) {
                        let prop = decl.init.properties.find(x =>
                            Utils.isLiteral(x.key) && typeof x.key.value === 'string' && x.key.value === key);
                        if (prop && Utils.isLiteral(prop.value) && typeof prop.value.value === 'string') {
                            result = prop.value.value;
                            return VisitorOption.Break;
                        } else if (prop) {
                            if (Utils.isMemberExpression(prop.value)
                                && Utils.isIdentifier(prop.value.object)
                                && Utils.isLiteral(prop.value.property))
                            {
                                result = this.findValue(prop.value.object.name,
                                    prop.value.property.value as string);
                                return VisitorOption.Break;
                            } else {
                                throw new Error('Unexpected property value: ' +
                                    Utils.cutCode(this.code, prop));
                            }
                        }
                    }
                }
            }
        });
        return result;
    }

    private findLoops(): SwitchInfo[] {
        let loops: SwitchInfo[] = [];

        traverse(this.ast, {
            enter: (node, parent) => {
                const checkContinueAndReturn = function (e: estree.SwitchCase): boolean {
                    return e.consequent.length > 0
                        && (Utils.isContinueStatement(e.consequent[e.consequent.length - 1])
                            || Utils.isReturnStatement(e.consequent[0]));
                };
                const isInfiniteWhile = function (e: estree.Node): e is estree.WhileStatement {
                    return Utils.isWhileStatement(node) &&
                        Utils.isLiteral(node.test) &&
                        node.test.value === true;
                };
                let sw: estree.SwitchStatement | null = null;
                if (isInfiniteWhile(node) && Utils.isBlockStatement(node.body) && node.body.body.length === 2) {
                    const firstStmt = node.body.body[0];
                    const lastStmt = node.body.body[1];
                    if (Utils.isSwitchStatement(firstStmt) &&
                        firstStmt.cases.every(checkContinueAndReturn) &&
                        Utils.isBreakStatement(lastStmt))
                    {
                        sw = firstStmt;
                    }
                }
                if (!sw) return;
                if (Utils.isMemberExpression(sw.discriminant) && Utils.isIdentifier(sw.discriminant.object)) {
                    assert(Utils.isUpdateExpression(sw.discriminant.property));
                    const switchArrayName = sw.discriminant.object.name;
                    if (parent && Utils.isBlockStatement(parent)) {
                        const loopIndex = parent.body.indexOf(node as estree.Statement);
                        assert(loopIndex > 0);
                        const prevStmt = parent.body[loopIndex-1];
                        if (Utils.isVariableDeclaration(prevStmt)) {
                            const decl = prevStmt.declarations[0];
                            const name = (<estree.Identifier> decl.id).name;
                            assert(name === switchArrayName);
                            loops.push({
                                discrVar: prevStmt,
                                discr: decl,
                                loop: node as estree.WhileStatement,
                                discrArray: [],
                                sw: sw,
                                parent: parent,
                            });
                        }
                    }
                }
            }
        });

        return loops;
    }

    remove(): estree.Program {
        if (!this.active)
            return this.ast;

        this.loops.forEach(x => this.fillDiscriminators(x));
        for (const loop of this.loops) {
            replace(this.ast, {
                enter: (node, parent) => {
                    if (node === loop.parent) {
                        let result = <estree.BlockStatement> {
                            type: 'BlockStatement',
                            body: [],
                        };
                        for (const item of node.body) {
                            if (item !== loop.loop && item !== loop.discrVar)
                                result.body.push(item);
                        }
                        for (const i of loop.discrArray) {
                            let $case = loop.sw.cases.find(x => i === (<estree.Literal> x.test).value as string);
                            if (!$case)
                                throw new Error('Unable to find case ' + i);
                            for (const stmt of $case.consequent) {
                                if (!Utils.isContinueStatement(stmt)) {
                                    result.body.push(stmt);
                                }
                            }
                        }
                        return result;
                    }
                }
            });
        }

        return this.ast;
    }
}

export class FunctionControlFlow extends ProtectionBase {

    private data: ObjReplace = {};
    private decl: { [key: string]: estree.VariableDeclaration } = {};

    constructor(code: string, ast: estree.Program) {
        super(code, ast);
    }

    detect(): boolean {
        this.active = false;
        traverse(this.ast, {
            enter: (node, parent) => {
                const isString = function (x: estree.Node): boolean {
                    return Utils.isLiteral(x) && typeof x.value === 'string';
                };
                const checkProperty = function (x: estree.Node): boolean {
                    return Utils.isLiteral(x)
                        || (Utils.isFunctionExpression(x) && x.body.body.length === 1)
                        || (Utils.isMemberExpression(x) && Utils.isLiteral(x.property));
                };
                if ((Utils.isFunctionExpression(node)
                    || Utils.isArrowFunctionExpression(node)
                    || Utils.isFunctionDeclaration(node))
                    && Utils.isBlockStatement(node.body) && node.body.body.length > 0)
                {
                    for (let i = 0; i < node.body.body.length; ++i) {
                        const stmt = node.body.body[i];
                        if (!Utils.isVariableDeclaration(stmt)) {
                            break;
                        }
                        const id = stmt.declarations[0].id;
                        const obj = stmt.declarations[0].init;
                        if (Utils.isIdentifier(id) && obj
                            && Utils.isObjectExpression(obj)
                            && obj.properties.length > 0
                            && obj.properties.every(x => isString(x.key))
                            && obj.properties.every(x => checkProperty(x.value)))
                        {
                            const result = this.processProperties(obj.properties);
                            if (Object.keys(result).length > 0) {
                                this.data[id.name] = result;
                                this.decl[id.name] = stmt;
                            }
                        }
                    }
                }
            }
        });
        this.active = Object.keys(this.data).length > 0;
        return this.active;
    }

    private processProperties (props: estree.Property[]): Replace {
        let result: Replace = {};
        for (const p of props) {
            const key = (<estree.Literal> p.key).value as string;
            if (Utils.isLiteral(p.value) || Utils.isMemberExpression(p.value)) {
                result[key] = p.value;
            } else if (Utils.isFunctionExpression(p.value)) {
                const ret = p.value.body.body[0] as estree.ReturnStatement;
                assert(Utils.isReturnStatement(ret));
                assert(ret.argument);
                result[key] = p.value;
            } else {
                throw new Error('Unexpected expression: ' +
                    Utils.cutCode(this.code, p.value));
            }
        }
        return result;
    };

    remove(): estree.Program {
        if (!this.active)
            return this.ast;

        for (const $var in this.data) {
            if (this.data.hasOwnProperty($var)) {
                this.removeMemeberExpr($var);
                this.replaceValue($var);
            }
        }

        for (const $var in this.decl) {
            if (this.decl.hasOwnProperty($var)) {
                replace(this.ast, {
                    enter: (node, parent) => {
                        if (node === this.decl[$var]) {
                            return VisitorOption.Remove;
                        }
                    }
                });
            }
        }

        return this.ast;
    }

    private removeMemeberExpr(key: string): void {
        const obj = this.data[key];
        let hasMemberExpr = true;
        while (hasMemberExpr) {
            hasMemberExpr = false;
            for (let key in obj) {
                if (obj.hasOwnProperty(key) && Utils.isMemberExpression(obj[key])) {
                    hasMemberExpr = true;
                    const m = obj[key] as estree.MemberExpression;
                    const name = (m.object as estree.Identifier).name;
                    const prop = (m.property as estree.Literal).value as string;
                    obj[key] = this.data[name][prop];
                }
            }
        }
    }

    private replaceValue(name: string): void {
        replace(this.ast, {
            enter: (node, parent) => {
                if (Utils.isCallExpression(node)) {
                    if (!Utils.isMemberExpression(node.callee)
                        || !Utils.isIdentifier(node.callee.object)
                        || !Utils.isLiteral(node.callee.property)
                        || typeof node.callee.property.value !== 'string')
                    {
                        return undefined;
                    }
                    if (node.callee.object.name === name) {
                        const f = this.data[name][node.callee.property.value] as estree.FunctionExpression;
                        return this.substParameters(f, node.arguments as estree.Expression[]);
                    }
                } else if (Utils.isMemberExpression(node)) {
                    if (!Utils.isIdentifier(node.object)
                        || !Utils.isLiteral(node.property)
                        || typeof node.property.value !== 'string')
                    {
                        return undefined;
                    }
                    if (node.object.name === name) {
                        const l = this.data[name][node.property.value] as estree.Literal;
                        assert(l);
                        assert(l.type === 'Literal');
                        return <estree.Literal> {
                            type: 'Literal',
                            value: l.value,
                        };
                    }
                }
            }
        });
    }

    private substParameters(func: estree.FunctionExpression, args: estree.Expression[]): estree.Expression {
        let expr = (func.body.body[0] as estree.ReturnStatement).argument!;
        expr = JSON.parse(JSON.stringify(expr));
        for (let i = 0; i < args.length; ++i) {
            const param = func.params[i] as estree.Identifier;
            replace(expr, {
                enter: (node, parent) => {
                    if (Utils.isIdentifier(node) && node.name === param.name) {
                        return JSON.parse(JSON.stringify(args[i]));
                    }
                }
            });
        }
        return expr;
    }
}

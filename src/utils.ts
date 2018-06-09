import * as espree from 'espree';
import * as estree from 'estree';

export function cutCode(code: string, node: estree.BaseNodeWithoutComments): string {
    if (!node || !node.range || node.range.length < 2)
        throw new Error('Node range is not specified.');
    return code.slice(node.range[0], node.range[1]);
}

export function registerDecoders(): void {
    (function (that: any) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        that.atob || (
            that.atob = function(input: any) {
                var str = String(input).replace(/=+$/, '');
                for (
                    var bc = 0, bs = 0, buffer, idx = 0, output = '';
                    buffer = str.charAt(idx++);
                    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
                        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
                ) {
                    buffer = chars.indexOf(buffer);
                }
            return output;
        });
    })(global);

    (function (that: any) {
        that.rc4 || (
            that.rc4 = function (str: any, key: any) {
                var s = [], j = 0, x, res = '', newStr = '';

                str = that.atob(str);

                for (var k = 0, length = str.length; k < length; k++) {
                    newStr += '%' + ('00' + str.charCodeAt(k).toString(16)).slice(-2);
                }

                str = decodeURIComponent(newStr);

                for (var i = 0; i < 256; i++) {
                    s[i] = i;
                }

                for (i = 0; i < 256; i++) {
                    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
                    x = s[i];
                    s[i] = s[j];
                    s[j] = x;
                }

                i = 0;
                j = 0;

                for (var y = 0; y < str.length; y++) {
                    i = (i + 1) % 256;
                    j = (j + s[i]) % 256;
                    x = s[i];
                    s[i] = s[j];
                    s[j] = x;
                    res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
                }

                return res;
        });
    })(global);
}

export function decodeBase64(encoded: string): string {
    const g = <any> global;
    if (!g.atob)
        throw new Error('Call registerDecoders() first.');
    return g.atob(encoded);
}

export function decodeRC4(encoded: string, key: string): string {
    const g = <any> global;
    if (!g.rc4)
        throw new Error('Call registerDecoders() first.');
    return g.rc4(encoded, key);
}

export function isBinaryExpression(node: estree.Node): node is estree.BinaryExpression {
    return node.type === 'BinaryExpression';
}

export function isLiteral(node: estree.Node): node is estree.Literal {
    return node.type === 'Literal';
}

export function isVariableDeclaration(node: estree.Node): node is estree.VariableDeclaration {
    return node.type === 'VariableDeclaration';
}

export function isIdentifier(node: estree.Node): node is estree.Identifier {
    return node.type === 'Identifier';
}

export function isFunctionExpression(node: estree.Node): node is estree.FunctionExpression {
    return node.type === 'FunctionExpression';
}

export function isCallExpression(node: estree.Node): node is estree.CallExpression {
    return node.type === 'CallExpression';
}

export function isExpressionStatement(node: estree.Node): node is estree.ExpressionStatement {
    return node.type === 'ExpressionStatement';
}

export function isArrayExpression(node: estree.Node): node is estree.ArrayExpression {
    return node.type === 'ArrayExpression';
}

export function isUnaryExpression(node: estree.Node): node is estree.UnaryExpression {
    return node.type === 'UnaryExpression';
}

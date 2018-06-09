import * as espree from 'espree';
import * as estree from 'estree';

export function cutCode(code: string, node: estree.BaseNodeWithoutComments): string {
    if (!node || !node.range || node.range.length < 2)
        throw new Error('Node range is not specified.');
    return code.slice(node.range[0], node.range[1]);
}

export function registerDecoders(): void {
    (function (g: any) {
        var j='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        g.atob || (g.atob = function(k:any){var l=String(k)['replace'](/=+$/,'');for(var m=0x0,n=0,o,p=0x0,q='';o=l['charAt'](p++);~o&&(n=m%0x4?n*0x40+o:o,m++%0x4)?q+=String['fromCharCode'](0xff&n>>(-0x2*m&0x6)):0x0){o=j['indexOf'](o);}return q;});
    })(global);
    (function (g: any) {
        g.rc4 || (g.rc4 = function(s:any,t:any){var u=[],v=0x0,w,x='',y='';s=g.atob(s);for(var z=0x0,A=s['length'];z<A;z++){y+='%'+('00'+s['charCodeAt'](z)['toString'](0x10))['slice'](-0x2);}s=decodeURIComponent(y);for(var B=0x0;B<0x100;B++){u[B]=B;}for(B=0x0;B<0x100;B++){v=(v+u[B]+t['charCodeAt'](B%t['length']))%0x100;w=u[B];u[B]=u[v];u[v]=w;}B=0x0;v=0x0;for(var C=0x0;C<s['length'];C++){B=(B+0x1)%0x100;v=(v+u[B])%0x100;w=u[B];u[B]=u[v];u[v]=w;x+=String['fromCharCode'](s['charCodeAt'](C)^u[(u[B]+u[v])%0x100]);}return x;});
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


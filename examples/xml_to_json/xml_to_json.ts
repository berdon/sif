import { Lexer, Tokenizer, Grammar } from "../../out";
import data from "./token.json";

let root: any = {};
const grammar = new Grammar();
grammar
    .for("ROOT", p => p.expect("ELE", ctx => {
        return root = ctx.value
    }))
    .for("ELE", p => p
        .expect("ELE_TAG", ctx => ctx.bag.node = ctx.value)
        .expect("ELE_TAG_TAIL").do(ctx => { ctx.bag.node.children = ctx.value.length > 0 ? ctx.value : undefined; return ctx.bag.node }))
    .for("ELE_TAG_TAIL", p => p
        .expect("GTHAN", "ELE[]", ctx => ctx.bag.children = ctx.value)
        .expect("END_START IDENTIFIER GTHAN", ctx => ctx.bag.children))
    .for("ELE_TAG_TAIL", p => p.expect("FSLASH GTHAN", ctx => []))
    .for("ELE_TAG", p => p
        .expect("LTHAN IDENTIFIER", ctx => ctx.bag.tag = ctx.value)
        .expect("PROPERTY[]", ctx => ({ tag: ctx.bag.tag, properties: ctx.value.length > 0 ? ctx.value : undefined, children: [] })))
    .for("PROPERTY", p => p
        .expect("IDENTIFIER", ctx => ctx.bag.name = ctx.value)
        .expect("EQUAL PROPERTY_VALUE", ctx => ({ [ctx.bag.name]: ctx.value })))
    .for("PROPERTY_VALUE", p => p.expect("STRING", ctx => ctx.value.substring(1, ctx.value.length - 1)))
    .for("PROPERTY_VALUE", p => p.expect("INTEGER", ctx => Number(ctx.value)))
    .for("PROPERTY_VALUE", p => p.expect("FLOAT", ctx => Number(ctx.value)))

const tokenizer = Tokenizer.fromJson(data);
const lexer = new Lexer('ROOT', grammar, tokenizer);
lexer.parse(process.argv[2]);

console.log(JSON.stringify(root, null, 4));
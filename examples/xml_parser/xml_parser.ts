import { CategoryConfiguration, CategoryServiceFactory, LogLevel } from "typescript-logging";
import { Lexer, Tokenizer, Grammar } from "../../out";
import data from "./token.json";

CategoryServiceFactory.setDefaultConfiguration(new CategoryConfiguration(LogLevel.Info));

const grammar = new Grammar();
grammar
    .for("ROOT",         p => p.expect("ELE"))
    .for("ELE",          p => p.expect("ELE_TAG ELE_TAG_TAIL"))
    .for("ELE_TAG_TAIL", p => p.expect("GTHAN ELE[] END_START IDENTIFIER GTHAN"))
    .for("ELE_TAG_TAIL", p => p.expect("FSLASH GTHAN"))
    .for("ELE_TAG",      p => p.expect("LTHAN IDENTIFIER PROPERTY[]"))
    .for("PROPERTY",     p => p.expect("IDENTIFIER EQUAL VALUE"))
    .for("VALUE",        p => p.expect("STRING"))
    .for("VALUE",        p => p.expect("INTEGER"))
    .for("VALUE",        p => p.expect("FLOAT"))

const tokenizer = Tokenizer.fromJson(data);
const lexer = new Lexer('ROOT', grammar, tokenizer);
lexer.parse(process.argv[2]);
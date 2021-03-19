import { CategoryConfiguration, CategoryServiceFactory, LogLevel } from "typescript-logging";
import { Lexer, Tokenizer, Grammar } from "../../out";
import data from "./tokens.json";

CategoryServiceFactory.setDefaultConfiguration(new CategoryConfiguration(LogLevel.Info));

const grammar = new Grammar();
grammar
    .for("ROOT",         p => p.expect("OBJECT"))
    .for("ROOT",         p => p.expect("ARRAY"))
    
    // Objects
    .for("OBJECT",       p => p.expect("LBRACE OBJECT_BODY"))
    .for("OBJECT_BODY",  p => p.expect("PROPERTY OBJECT_END"))
    .for("OBJECT_END",   p => p.expect("COMMA OBJECT_BODY"))
    .for("OBJECT_END",   p => p.expect("RBRACE"))
    .for("PROPERTY",     p => p.expect("STRING COLON VALUE"))
    
    // Arrays
    .for("ARRAY",        p => p.expect("LBRACKET ARRAY_BODY"))
    .for("ARRAY_BODY",   p => p.expect("VALUE ARRAY_END"))
    .for("ARRAY_END",    p => p.expect("COMMA ARRAY_BODY"))
    .for("ARRAY_END",    p => p.expect("RBRACKET"))

    // Values
    .for("VALUE",        p => p.expect("STRING"))
    .for("VALUE",        p => p.expect("INTEGER"))
    .for("VALUE",        p => p.expect("OBJECT"))
    .for("VALUE",        p => p.expect("ARRAY"))

const tokenizer = Tokenizer.fromJson(data);
const lexer = new Lexer('ROOT', grammar, tokenizer);
lexer.parse(process.argv[2]);
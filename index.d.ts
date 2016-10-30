declare class Grammar {
    constructor()
    add(phrase: string, production: (string | Function)[])
}
declare class Lexer {
    constructor(startPhrase: string, grammar: Grammar, tokenizer: Tokenizer)
    parse(filename: string)
}
declare class Tokenizer {
    static fromJson(json: Object): Tokenizer
}

export {
    Grammar,
    Lexer,
    Tokenizer
}
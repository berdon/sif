import { Grammar, Phrase } from "./grammar"
import { Token, Tokenerator, Tokenizer } from "./tokenizer"
import { Category } from "typescript-logging"

const log = {
    lexer: new Category("Lexer"),
    parsed: new Category("Lexer.Parsed")
}
const vsprintf = require('sprintf-js').vsprintf
const fs = require('fs')

export class Lexeme
{
    private _token: Token | null;
    private _value: string | null;
    private _line: number;
    private _column: number;

    public get token(): Token | null { return this._token; }
    public get name(): string | null { return this._token?.name ?? null; }
    public get value(): string | null { return this._value; }
    public get line(): number { return this._line; }
    public get column(): number { return this._column; }

    constructor(token: Token | null, value: string | null, line: number, column: number)
    {
        this._token = token;
        this._value = value;
        this._line = line;
        this._column = column;
    }

    public toString(): string { return `${this.token?.name ?? null}(${this.value})`; }
}

export class Lexer
{
    private _startVariable: string;
    private _grammar: Grammar;
    private _tokenizer: Tokenizer;
    private _lexeme: Lexeme | null = null;
    private _nextLexeme: Lexeme | null = null;
    private _tokenerator: Tokenerator | null = null;
    private _parseLevel: string[] = [];

    public get startVariable(): string { return this._startVariable; }
    public get grammar(): Grammar { return this._grammar; }
    public get tokenizer(): Tokenizer { return this._tokenizer; }
    public get lexeme(): Lexeme | null { return this._lexeme; }
    public get nextLexeme(): Lexeme | null { return this._nextLexeme; }
    public get tokenerator(): Tokenerator | null { return this._tokenerator; }

    constructor(startVariable: string, grammar: Grammar, tokenizer: Tokenizer) {
        this._startVariable = startVariable;
        this._grammar = grammar;
        this._tokenizer = tokenizer;
    }

    public parse(filename: string) {
        // Validate the file
        if (!fs.existsSync(filename)) {
            throw ('Invalid source file - ' + filename);
        }

        // Read the file
        let file = fs.readFileSync(filename, "utf8");

        // Create the tokenerator
        this._tokenerator = this.tokenizer.parse(file);

        // Grab the next lexeme
        this.getNextLexeme();
        let lexeme = this.lexeme;
        let nextLexeme = this.nextLexeme;

        // Check to make sure we don't have an illegal token off the bat
        if (lexeme?.token === Token.UNKNOWN) {
            throw `Error: ${filename}:${lexeme!.line}:${lexeme!.column} - Unknown token found; \"${this.lexeme?.token}\"`;
        }

        // Call the internal parser
        this.innerParse(filename, this.startVariable, null, {});

        // Make sure we ended on the EOF token
        if (lexeme?.token === Token.EOF) {
            this.throwError(filename, lexeme, 'Expected end of file but found $s', lexeme);
        }
    }

    private throwError(filename: string, lexeme: Lexeme | null, error: string, ...params: any[]): void {
        var args = Array.prototype.slice.call(arguments);
        throw `Error: ${filename}:${lexeme?.line}:${lexeme?.column} - ${vsprintf(error, params)}`;
    }

    private getNextLexeme(): boolean {
        var tokenerator = this.tokenerator!;
    
        if (tokenerator?.next()) {
            this._lexeme = new Lexeme(tokenerator.token, tokenerator.value, tokenerator.line, tokenerator.column);
            this._nextLexeme = new Lexeme(tokenerator.nextToken, tokenerator.nextValue, tokenerator.nextLine, tokenerator.nextColumn);
    
            return true;
        }
    
        return false;
    }

    private innerParse(filename: string, variable: string, phrases: Phrase[] | null, context: any): boolean {
        // Make sure we're on a grammar token
        if (!(this.grammar.variables.has(variable))) {
            return false;
        }
    
        // Grab the corresponding phrases for the token
        phrases = this.grammar.rule(variable) ?? [];
    
        // Cycle through each phrase
        for (var i = 0; i < phrases.length; i++) {
            let wrongPhrase = false;
            var phrase = phrases[i];
    
            // Get the first possible tokens from the first word and see if we match
            var firstTokens, followTokens, nextFollowToken;
            firstTokens = this.grammar.getFirstTokens(phrase.production(0));
            followTokens = this.grammar.getFollowTokens(variable, phrase);
    
            // Check to see if we match or if the first tokens contain epsilon
            if ((firstTokens.has(this.lexeme!.name!) || firstTokens.has(Token.EPSILON.name)) &&
                ((followTokens.has(this.nextLexeme!.name!) || i == phrases.length - 1) || Object.keys(followTokens).length == 0)) {
                
                log.lexer.trace(`Potential phrase (${phrase}) match for ${this.lexeme?.name} ${this.nextLexeme?.name}`)
                
                // Either our current token or something is a match, so lets begin
                for (var j = 0; j < phrase.productions.length; j++) {
                    var word = phrase.production(j);
    
                    // See if the word is a grammar variable
                    if (this.grammar.variables.has(word)) {
                        // Following the successful parsing of a grammar token, call the callback
                        if (phrase.callback) {
                            phrase.callback(phrase, word, this.lexeme?.token ?? null, this.lexeme?.value ?? null, context, false);
                        }
    
                        // Create a child context
                        var childContext = {
                            token: this.lexeme?.token,
                            value: this.lexeme?.value,
                            _parent: context
                        };

                        this._parseLevel.push(word);
                        log.parsed.info(`${new Array(this._parseLevel.length).join('  ')}${word}`);
    
                        // If so, we need to go inside to check to see if it matches
                        var lastLexeme = this.lexeme;
                        if (this.innerParse(filename, word, phrases, childContext) == false) {
                            // If we're here, it didn't match, no worries
                            // Potentially wrong; might need to die fast and instead only rely on the if check / look ahead tokens
                            if (!firstTokens.has(Token.EPSILON.name)) {
                                this.throwError(filename, this.lexeme, 'Unmatched grammar token: %s(%s)', this.lexeme?.token ?? null, this.lexeme?.value ?? null);
                            }

                            log.lexer.warn(`Rolling back from wrong phrase: ${word} of ${phrase} {${phrase.production(j)}}`)
                            wrongPhrase = true;
                            break;
                        }

                        log.parsed.info(`${new Array(this._parseLevel.length).join('  ')}${this._parseLevel.pop()}`);
    
                        // Update the parent tag
                        delete childContext._parent;
                        context._child = childContext;
    
                        // Following the successful parsing of a grammar token, we issue a callback
                        if (phrase.callback) {
                            phrase.callback(phrase, word, childContext?.token ?? null, context.value, context, true);
                        }
                    } else {
                        // Not a grammar token, we're actually a token
                        // See if we failed - ergo, the token doesn't match what we expected
                        if (this.lexeme!.name != word && word != Token.EPSILON.name) {
                            // Throw the error
                            this.throwError(filename, this.lexeme, 'Expected %s found %s(%s) %s(%s)', word, this.lexeme?.name ?? null, this.lexeme?.value ?? null, this.nextLexeme?.name ?? null, this.nextLexeme?.value ?? null);
                        }
    
                        // Call the phrase action handler with null for a word
                        if (phrase.callback) {
                            phrase.callback(phrase, word, this.lexeme?.token ?? null, this.lexeme?.value ?? null, context, true);
                        }
    
                        // If we're here, the token did match, now see if it was epsilon
                        if (word !== Token.EPSILON.name) {
                            // Nope, grab the next token
                            this.getNextLexeme();
    
                            // Make sure we don't get an illegal token
                            if (this.lexeme?.token === Token.UNKNOWN) {
                                this.throwError(filename, this.lexeme, 'Unknown token found; %s', this.lexeme?.value ?? null);
                            }
                        }
                    }
                }

                // Potentially wrong; might need to die fast and instead only rely on the if check / look ahead tokens
                if (wrongPhrase) continue;
    
                // We've successfully parsed this token, so return true
                return true;
            }
        }
    
        //this.throwError(filename, this.lexeme, 'Unmatched grammar token: %s(%s)', this.lexeme?.token ?? null, this.lexeme?.value ?? null);

        return false;
    }
}
import * as fs from "fs";
import { Token } from "./tokenizer";

export class Grammar {
    private _variables: Map<string, string> = new Map<string, string>()
    private _rules: Map<string, Phrase[]> = new Map<string, Phrase[]>()

    public get variables() { return this._variables; }
    public get rules() { return this._rules; }
    public rule(variable: string) { return this._rules.get(variable); }

    public add(phrase: Phrase) {
        if (arguments.length == 1) {
            if (!this.rules.has(phrase.variable)) {
                this.variables.set(phrase.variable, phrase.variable);
                this.rules.set(phrase.variable, []);
            }

            this.rules.get(phrase.variable)?.push(phrase);
        }
    }

    public getFirstTokens(token: string, tokens: Map<string, string> = new Map<string, string>()) {
        if (!this.rules.has(token)) {
            tokens.set(token, token);
            return tokens;
        }

        let rules = this.rule(token);
        for (let i = 0; i < rules!.length; i++) {
            let phrase = rules![i];

            let newTokens = this.getFirstTokens(phrase.production(0), tokens);
            for (let key in newTokens) {
                tokens.set(key, key);
            }
        }

        return tokens;
    }

    public getFollowTokens(token: string, phrase: Phrase) {
        let seenPhrases: Phrase[] = [];
        let seenFirst = false;

        // Call the inner get tokens method
        let result = this.innerGetFollowTokens(phrase, new Map<string, string>(), seenPhrases, seenFirst);

        // Remove lambda from the list
        result.tokens.delete(Token.LAMBDA.name);

        return result.tokens;
    }

    private innerGetFollowTokens(phrase: Phrase, tokens: Map<string, string>, seenPhrases: Phrase[], seenFirst: boolean): { result: boolean, tokens: Map<string, string> } {
        for (let i = 0; i < phrase.productions.length; i++) {
            let word = phrase.production(i);

            // Check to see if the word is a grammar variable
            if (!this.variables.has(word)) {
                if (word === Token.LAMBDA.name) {
                    // Add lambda
                    tokens.set(Token.LAMBDA.name, Token.LAMBDA.name);
                } else if (seenFirst == false) {
                    seenFirst = true;
                } else {
                    tokens.set(word, word);
                    return {
                        result: true,
                        tokens: tokens
                    };
                }
            } else {
                let newSeenFirst = seenFirst;
                let finished = true;
                let subPhrases = this.rule(word);

                for (let j = 0; j < subPhrases!.length; j++) {
                    let subPhrase = subPhrases![j];
                    newSeenFirst = seenFirst;

                    let result = this.innerGetFollowTokens(subPhrase, tokens, seenPhrases, newSeenFirst);

                    finished = finished && result.result;
                    tokens = result.tokens;
                }

                if (tokens.has(Token.LAMBDA.name)) {
                    tokens.delete(Token.LAMBDA.name)
                    finished = false;
                } else {
                    seenFirst = true;
                }

                if (finished) {
                    return {
                        result: true,
                        tokens: tokens
                    };
                }
            }
        }

        return {
            result: false,
            tokens: tokens
        };
    }
}

type ProductionCallback = { Callback: (value: string | null, token: Token | null, phrase: Phrase | null, word: string, isFinal: boolean, context: PhraseContext) => void, IsPre?: boolean } | null;
type PhraseContext = { phrase: Phrase, word: string | null, token: Token | null, value: string | null, context: PhraseContext, isFinal: boolean }

export class Phrase {
    private _callback: (phrase: Phrase, word: string | null, token: Token | null, value: string | null, context: any, isFinal: boolean) => void;
    private _variable: any;
    private _productions: string[] = [];

    public get variable() { return this._variable; }
    public get productions() { return this._productions; }
    public get callback() { return this._callback; }

    public production(index: number) { return this._productions[index]; }
    public toString() { return this.variable + ' -> ' + this.productions.join(' '); }

    constructor(variable: string, productions: (string | (() => void))[], callback?: () => void) {
        this._variable = variable;
        let productionCallbacks: Map<string, ProductionCallback> = new Map<string, ProductionCallback>();
        if (productions) {
            var initialCallback: ProductionCallback = null;

            for (var i = 0; i < productions.length; i++) {
                var production = productions[i];
                if (typeof (production) === 'string') {
                    this._productions.push(production);
                } else if (typeof (production) === 'function') {
                    if (this._productions.length == 0) {
                        initialCallback = { Callback: production as () => void };
                    } else {
                        productionCallbacks.set(this._productions[this._productions.length - 1], { Callback: production as () => void });
                    }
                } else {
                    throw ('Invalid phrase production rule; expecting a string got ' + typeof (production));
                }
            }

            if (initialCallback && this._productions.length > 0) {
                initialCallback.IsPre = true;
                productionCallbacks.set(this._productions[0], initialCallback);
            }
        }

        if (callback) {
            this._callback = callback;
        } else {
            this._callback = function (phrase: Phrase, word: string | null, token: Token | null, value: string | null, context: PhraseContext, isFinal: boolean) {
                var innerCallback = word != null ? productionCallbacks.get(word) : null;
                if (innerCallback != null && (isFinal || innerCallback.IsPre)) {
                    var context: PhraseContext = { phrase: phrase, word: word, token: token, value: value, context: context, isFinal: isFinal };
                    innerCallback.Callback.apply(context, [value, token, phrase, word!, isFinal, context.context]);
                }
            }
        }
    }
}
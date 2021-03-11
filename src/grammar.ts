import { Token } from "./tokenizer";

import { Category } from "typescript-logging"
const log = new Category("Grammar")

export class Grammar {
    private _variables: Map<string, string> = new Map<string, string>()
    private _rules: Map<string, Phrase[]> = new Map<string, Phrase[]>()

    public get variables() { return this._variables; }
    public get rules() { return this._rules; }
    public rule(variable: string) { return this._rules.get(variable); }

    public for(variable: string, cb: (p: PhraseBuilder) => PhraseBuilder): Grammar {
        const phrase = new InternalPhraseBuilder(cb(new PhraseBuilder(variable))).build();

        // Translate the phrase
        const phrases = this.expandTailRecursions(phrase);
        for (let p of phrases) this.add(p.phrase)

        return this
    }

    private expandTailRecursions(phrase: InternalPhrase) {
        if (!phrase.productions.find((p) => p.indexOf('[]') >= 0)) return new Set([phrase]);

        const phrases: Set<InternalPhrase> = new Set<InternalPhrase>();
        while (phrase.productions.find((p) => p.indexOf('[]') >= 0)) {
            // Find the first many production
            const manyProductionIndex = phrase.productions.findIndex((p) => p.indexOf('[]') >= 0);
            const manyProduction = phrase.productions[manyProductionIndex];

            // Create the item/list phrase for the many production
            const itemVariable = manyProduction.substring(0, manyProduction.length - 2);
            const itemListVariable = `_${itemVariable}LIST_`;

            // Update the current phrase with the new list production
            phrase.productions[manyProductionIndex] = itemListVariable;
            if (phrase.productionCallbacks.has(manyProduction)) {
                phrase.productionCallbacks.set(itemListVariable, phrase.productionCallbacks.get(manyProduction)!);
                phrase.productionCallbacks.delete(manyProduction);
            }

            // Determine if we need to create aggregate phrases
            if (manyProductionIndex != phrase.productions.length - 1) {
                const aggregateVariable = `_${phrase.productions.slice(0, manyProductionIndex + 1).join('')}AGG_`;
                const aggregateProductions: any[] = phrase.productions.slice(0, manyProductionIndex + 1);
                aggregateProductions.push((ctx: any) => {
                    ctx.parent.value = ctx.bag;
                });
                const tailProductions = phrase.productions.slice(manyProductionIndex + 1);
                const tailPhrase = new InternalPhrase(new Phrase(phrase.variable, [aggregateVariable, ...tailProductions]));
                for (var v of tailProductions) {
                    if (phrase.productionCallbacks.has(v))
                        tailPhrase.productionCallbacks.set(v, phrase.productionCallbacks.get(v)!);
                }
                phrases.add(tailPhrase);

                // TODO: Aggregate phrase productions are empty somehow
                const aggregatePhrase = new InternalPhrase(new Phrase(aggregateVariable, aggregateProductions));
                aggregatePhrase.productionCallbacks = phrase.productionCallbacks;
                const aggregatePhraseLastProduction = aggregatePhrase.productions[aggregatePhrase.productions.length - 1];
                const lastProductionCallback = aggregatePhrase.productionCallbacks.get(aggregatePhraseLastProduction) ?? {};
                aggregatePhrase.productionCallbacks.set(aggregatePhraseLastProduction, {
                    Callback: (ctx: PhraseContext, value: string | null, token: Token | null, phrase: Phrase | null, word: string, isFinal: boolean, context: PhraseContext) => {
                        let result: any = undefined;
                        if (lastProductionCallback.Callback)
                            result = lastProductionCallback.Callback(ctx, value, token, phrase, word, isFinal, context);
                        ctx.parent.bag = ctx.bag;
                        return result;
                    },
                    PreCallback: lastProductionCallback?.PreCallback
                });
                phrases.add(aggregatePhrase);
            }
            else {
                phrases.add(phrase);
            }

            phrases.add(new InternalPhrase(new Phrase(itemListVariable, [
                itemVariable, ctx => ctx.bag.item = ctx.value,
                itemListVariable, ctx => {
                    ctx.value.unshift(ctx.bag.item);
                    ctx.parent.value = ctx.value;
                }
            ])));
            phrases.add(new InternalPhrase(new Phrase(itemListVariable, [Token.EPSILON, ctx => ctx.parent.value = []])));
        }
        return phrases;
    }

    public add(phrase: Phrase) {
        if (arguments.length == 1) {
            if (!this.rules.has(phrase.variable)) {
                this.variables.set(phrase.variable, phrase.variable);
                this.rules.set(phrase.variable, []);
            }

            log.trace(`Adding Phrase(${phrase})`)
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

        // Remove epsilon from the list
        result.tokens.delete(Token.EPSILON.name);

        return result.tokens;
    }

    private innerGetFollowTokens(phrase: Phrase, tokens: Map<string, string>, seenPhrases: Phrase[], seenFirst: boolean): { result: boolean, tokens: Map<string, string> } {
        for (let i = 0; i < phrase.productions.length; i++) {
            let word = phrase.production(i);

            // Check to see if the word is a grammar variable
            if (!this.variables.has(word)) {
                if (word === Token.EPSILON.name) {
                    // Add epsilon
                    tokens.set(Token.EPSILON.name, Token.EPSILON.name);
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

                if (tokens.has(Token.EPSILON.name)) {
                    tokens.delete(Token.EPSILON.name)
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

type ProductionCallback = (ctx: PhraseContext, value: string | null, token: Token | null, phrase: Phrase | null, word: string, isFinal: boolean, context: PhraseContext) => void | any
type ProductionCallbackWrapper = {
    PreCallback?: ProductionCallback,
    Callback?: ProductionCallback
} | null;

type PhraseContext = {
    phrase: Phrase,
    word: string | null,
    token: Token | null,
    value: string | null,
    bag: PhraseContext,
    isFinal: boolean,
    parent: PhraseContext,
    child: PhraseContext
} | any

class InternalPhraseBuilder {
    public variable: string
    public productions: string[] = []
    public initialCallbacks: ((ctx: PhraseContext) => void | any)[] = []
    public callbacks: Map<string, ((ctx: PhraseContext) => void | any)[]> = new Map<string, ((ctx: PhraseContext) => void)[]>()

    constructor(builder: PhraseBuilder) {
        this.variable = (builder as any)._variable
        this.productions = (builder as any)._productions
        this.initialCallbacks = (builder as any)._initialCallbacks
        this.callbacks = (builder as any)._callbacks
        this.variable = (builder as any)._variable
    }

    public build(): InternalPhrase {
        let productions: (string | Token | ((ctx: PhraseContext) => void | any))[] = []
        if (this.initialCallbacks.length > 0) {
            productions.push((ctx: PhraseContext) => {
                let result: any = undefined
                for (let cb of this.initialCallbacks) result = cb(ctx)
                return result
            })
        }

        for (let production of this.productions) {
            let callback = this.callbacks.has(production)
                ? (ctx: PhraseContext) => {
                    let result: any = undefined
                    for (let cb of this.callbacks.get(production)!) result = cb(ctx)
                    return result
                }
                : null
            productions.push(production)
            if (callback)
                productions.push(callback)
        }
        return new InternalPhrase(new Phrase(this.variable, productions))
    }
}

export class PhraseBuilder {
    private _variable: string
    private _productions: string[] = []
    private _initialCallbacks: ((ctx: PhraseContext) => void | any)[] = []
    private _callbacks: Map<string, ((ctx: PhraseContext) => void | any)[]> = new Map<string, ((ctx: PhraseContext) => void)[]>()
    private _currentWord: string | null = null;

    constructor(variable: string) {
        this._variable = variable
    }

    public expect(...words: (string | Token | ((ctx: PhraseContext) => void | any))[]): PhraseBuilder {
        // Normalize words array
        const normalizedWords: (string | ((ctx: PhraseContext) => void | any))[] = []
        for (let word of words) {
            if (word instanceof Token) normalizedWords.push(word.name)
            else if (word instanceof Function) normalizedWords.push(word)
            else if (word.split(/\s+/).length > 1) {
                let tokens = word.split(/\s+/)
                for (let t of tokens) {
                    normalizedWords.push(t)
                }
            }
            else {
                normalizedWords.push(word)
            }
        }

        for (let word of normalizedWords) {
            if (word instanceof Function)
                this.do(word)
            else {
                if (!this._callbacks.has(word)) this._callbacks.set(word, [])
                this._productions.push(word)
                this._currentWord = word
            }
        }

        return this;
    }

    public do(callback: (ctx: PhraseContext) => void | any): PhraseBuilder {
        if (!this._currentWord) this._initialCallbacks.push(callback)
        else this._callbacks.get(this._currentWord)!.push(callback)
        return this
    }
}

type PhraseCallback = (phrase: Phrase, word: string | null, token: Token | null, value: string | null, bag: any, isFinal: boolean) => void;

class InternalPhrase {
    private _phrase: any
    public get phrase() { return this._phrase as Phrase }
    public get variable() { return this._phrase._variable }
    public get productions() { return this._phrase._productions as string[] }
    public get productionCallbacks() { return this._phrase._productionCallbacks }
    public get callback() { return this._phrase._callback }
    public set callback(cb: PhraseCallback) { this._phrase._callback = cb }
    public set variable(variable: any) { this._phrase._variable = variable }
    public set productions(productions: string[]) { this._phrase._productions = productions }
    public set productionCallbacks(callbacks: Map<string, ProductionCallbackWrapper>) { this._phrase._productionCallbacks = callbacks }

    constructor(phrase: Phrase) {
        this._phrase = phrase
    }
}

export class Phrase {
    private _callback: PhraseCallback
    private _variable: any
    private _productions: string[] = []
    private _productionCallbacks: Map<string, ProductionCallbackWrapper> = new Map<string, ProductionCallbackWrapper>()

    public get variable() { return this._variable; }
    public get productions() { return this._productions; }
    public get callback() { return this._callback; }

    public production(index: number) { return this._productions[index]; }
    public toString() { return this.variable + ' -> ' + this.productions.join(' '); }

    public static for(variable: string) {
        return new PhraseBuilder(variable)
    }

    constructor(variable: string, productions: (string | Token | ((ctx: PhraseContext) => void))[], callback?: () => void) {
        this._variable = variable;
        if (productions) {
            var initialCallback: ProductionCallback | null = null;

            for (var i = 0; i < productions.length; i++) {
                var production = productions[i];
                if (production instanceof Token) {
                    this._productions.push(production.name);
                } else if (typeof (production) === 'string') {
                    this._productions.push(production);
                } else if (typeof (production) === 'function') {
                    if (this._productions.length == 0) {
                        initialCallback = production as () => void;
                    } else {
                        this._productionCallbacks.set(this._productions[this._productions.length - 1], { Callback: production as () => void });
                    }
                } else {
                    throw ('Invalid phrase production rule; expecting a string got ' + typeof (production));
                }
            }

            if (initialCallback && this._productions.length > 0) {
                if (this._productionCallbacks.has(this._productions[0])) this._productionCallbacks.get(this._productions[0])!.PreCallback = initialCallback;
                else this._productionCallbacks.set(this.productions[0], { PreCallback: initialCallback })
            }
        }

        if (callback) {
            this._callback = callback;
        } else {
            this._callback = function (phrase: Phrase, word: string | null, token: Token | null, value: string | null, context: PhraseContext, isFinal: boolean) {
                let innerCallback = word != null ? this._productionCallbacks.get(word) : null;
                if (innerCallback != null) {
                    var innerContext: PhraseContext = {
                        phrase: phrase,
                        word: word,
                        token: token,
                        value: value,
                        bag: context,
                        isFinal: isFinal,
                        parent: context._parent,
                        child: context._child
                    };

                    let result: any = undefined
                    if (isFinal)
                        result = innerCallback.Callback?.apply(innerContext, [innerContext, value, token, phrase, word!, isFinal, innerContext.context]);
                    else
                        result = innerCallback.PreCallback?.apply(innerContext, [innerContext, value, token, phrase, word!, isFinal, innerContext.context]);
                    
                    if (result && context._parent) context._parent.value = result

                    // We need to propagate up parent bag values for aggregation productions; however,
                    // we want to specifically exclude lexical variables
                    for (var i in context._parent?.bag ?? [])
                    {
                        if (["phrase", "word", "token", "value", "isFinal", "_parent", "_child"].indexOf(i) < 0)
                            context._parent[i] = context._parent.bag[i]
                    }
                }
            }
        }
    }
}
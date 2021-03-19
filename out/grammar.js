"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Phrase = exports.PhraseBuilder = exports.Grammar = void 0;
var tokenizer_1 = require("./tokenizer");
var typescript_logging_1 = require("typescript-logging");
var log = new typescript_logging_1.Category("Grammar");
var Grammar = /** @class */ (function () {
    function Grammar() {
        this._variables = new Map();
        this._rules = new Map();
    }
    Object.defineProperty(Grammar.prototype, "variables", {
        get: function () { return this._variables; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Grammar.prototype, "rules", {
        get: function () { return this._rules; },
        enumerable: false,
        configurable: true
    });
    Grammar.prototype.rule = function (variable) { return this._rules.get(variable); };
    Grammar.prototype.for = function (variable, cb) {
        var e_1, _a;
        var phrase = new InternalPhraseBuilder(cb(new PhraseBuilder(variable))).build();
        // Translate the phrase
        var phrases = this.expandTailRecursions(phrase);
        try {
            for (var phrases_1 = __values(phrases), phrases_1_1 = phrases_1.next(); !phrases_1_1.done; phrases_1_1 = phrases_1.next()) {
                var p = phrases_1_1.value;
                this.add(p.phrase);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (phrases_1_1 && !phrases_1_1.done && (_a = phrases_1.return)) _a.call(phrases_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return this;
    };
    Grammar.prototype.expandTailRecursions = function (phrase) {
        var _a;
        if (!phrase.productions.find(function (p) { return p.indexOf('[]') >= 0; }))
            return new Set([phrase]);
        var phrases = new Set();
        var _loop_1 = function () {
            var e_2, _b;
            // Find the first many production
            var manyProductionIndex = phrase.productions.findIndex(function (p) { return p.indexOf('[]') >= 0; });
            var manyProduction = phrase.productions[manyProductionIndex];
            // Create the item/list phrase for the many production
            var itemVariable = manyProduction.substring(0, manyProduction.length - 2);
            var itemListVariable = "_" + itemVariable + "LIST_";
            // Update the current phrase with the new list production
            phrase.productions[manyProductionIndex] = itemListVariable;
            if (phrase.productionCallbacks.has(manyProduction)) {
                phrase.productionCallbacks.set(itemListVariable, phrase.productionCallbacks.get(manyProduction));
                phrase.productionCallbacks.delete(manyProduction);
            }
            // Determine if we need to create aggregate phrases
            if (manyProductionIndex != phrase.productions.length - 1) {
                var aggregateVariable = "_" + phrase.productions.slice(0, manyProductionIndex + 1).join('') + "AGG_";
                var aggregateProductions = phrase.productions.slice(0, manyProductionIndex + 1);
                aggregateProductions.push(function (ctx) {
                    ctx.parent.value = ctx.bag;
                });
                var tailProductions = phrase.productions.slice(manyProductionIndex + 1);
                var tailPhrase = new InternalPhrase(new Phrase(phrase.variable, __spreadArray([aggregateVariable], __read(tailProductions))));
                try {
                    for (var tailProductions_1 = (e_2 = void 0, __values(tailProductions)), tailProductions_1_1 = tailProductions_1.next(); !tailProductions_1_1.done; tailProductions_1_1 = tailProductions_1.next()) {
                        var v = tailProductions_1_1.value;
                        if (phrase.productionCallbacks.has(v))
                            tailPhrase.productionCallbacks.set(v, phrase.productionCallbacks.get(v));
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (tailProductions_1_1 && !tailProductions_1_1.done && (_b = tailProductions_1.return)) _b.call(tailProductions_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                phrases.add(tailPhrase);
                // TODO: Aggregate phrase productions are empty somehow
                var aggregatePhrase = new InternalPhrase(new Phrase(aggregateVariable, aggregateProductions));
                aggregatePhrase.productionCallbacks = phrase.productionCallbacks;
                var aggregatePhraseLastProduction = aggregatePhrase.productions[aggregatePhrase.productions.length - 1];
                var lastProductionCallback_1 = (_a = aggregatePhrase.productionCallbacks.get(aggregatePhraseLastProduction)) !== null && _a !== void 0 ? _a : {};
                aggregatePhrase.productionCallbacks.set(aggregatePhraseLastProduction, {
                    Callback: function (ctx, value, token, phrase, word, isFinal, context) {
                        var result = undefined;
                        if (lastProductionCallback_1.Callback)
                            result = lastProductionCallback_1.Callback(ctx, value, token, phrase, word, isFinal, context);
                        ctx.parent.bag = ctx.bag;
                        return result;
                    },
                    PreCallback: lastProductionCallback_1 === null || lastProductionCallback_1 === void 0 ? void 0 : lastProductionCallback_1.PreCallback
                });
                phrases.add(aggregatePhrase);
            }
            else {
                phrases.add(phrase);
            }
            phrases.add(new InternalPhrase(new Phrase(itemListVariable, [
                itemVariable,
                function (ctx) { return ctx.bag.item = ctx.value; },
                itemListVariable,
                function (ctx) {
                    ctx.value.unshift(ctx.bag.item);
                    ctx.parent.value = ctx.value;
                }
            ])));
            phrases.add(new InternalPhrase(new Phrase(itemListVariable, [tokenizer_1.Token.EPSILON, function (ctx) { return ctx.parent.value = []; }])));
        };
        while (phrase.productions.find(function (p) { return p.indexOf('[]') >= 0; })) {
            _loop_1();
        }
        return phrases;
    };
    Grammar.prototype.add = function (phrase) {
        var _a;
        if (arguments.length == 1) {
            if (!this.rules.has(phrase.variable)) {
                this.variables.set(phrase.variable, phrase.variable);
                this.rules.set(phrase.variable, []);
            }
            log.trace("Adding Phrase(" + phrase + ")");
            (_a = this.rules.get(phrase.variable)) === null || _a === void 0 ? void 0 : _a.push(phrase);
        }
    };
    Grammar.prototype.getFirstTokens = function (token, tokens) {
        if (tokens === void 0) { tokens = new Map(); }
        if (!this.rules.has(token)) {
            tokens.set(token, token);
            return tokens;
        }
        var rules = this.rule(token);
        for (var i = 0; i < rules.length; i++) {
            var phrase = rules[i];
            var newTokens = this.getFirstTokens(phrase.production(0), tokens);
            for (var key in newTokens) {
                tokens.set(key, key);
            }
        }
        return tokens;
    };
    Grammar.prototype.getFollowTokens = function (token, phrase) {
        var seenPhrases = [];
        var seenFirst = false;
        // Call the inner get tokens method
        var result = this.innerGetFollowTokens(phrase, new Map(), seenPhrases, seenFirst);
        // Remove epsilon from the list
        result.tokens.delete(tokenizer_1.Token.EPSILON.name);
        return result.tokens;
    };
    Grammar.prototype.innerGetFollowTokens = function (phrase, tokens, seenPhrases, seenFirst) {
        for (var i = 0; i < phrase.productions.length; i++) {
            var word = phrase.production(i);
            // Check to see if the word is a grammar variable
            if (!this.variables.has(word)) {
                if (word === tokenizer_1.Token.EPSILON.name) {
                    // Add epsilon
                    tokens.set(tokenizer_1.Token.EPSILON.name, tokenizer_1.Token.EPSILON.name);
                }
                else if (seenFirst == false) {
                    seenFirst = true;
                }
                else {
                    tokens.set(word, word);
                    return {
                        result: true,
                        tokens: tokens
                    };
                }
            }
            else {
                var newSeenFirst = seenFirst;
                var finished = true;
                var subPhrases = this.rule(word);
                for (var j = 0; j < subPhrases.length; j++) {
                    var subPhrase = subPhrases[j];
                    newSeenFirst = seenFirst;
                    var result = this.innerGetFollowTokens(subPhrase, tokens, seenPhrases, newSeenFirst);
                    finished = finished && result.result;
                    tokens = result.tokens;
                }
                if (tokens.has(tokenizer_1.Token.EPSILON.name)) {
                    tokens.delete(tokenizer_1.Token.EPSILON.name);
                    finished = false;
                }
                else {
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
    };
    return Grammar;
}());
exports.Grammar = Grammar;
var InternalPhraseBuilder = /** @class */ (function () {
    function InternalPhraseBuilder(builder) {
        this.productions = [];
        this.initialCallbacks = [];
        this.callbacks = new Map();
        this.variable = builder._variable;
        this.productions = builder._productions;
        this.initialCallbacks = builder._initialCallbacks;
        this.callbacks = builder._callbacks;
        this.variable = builder._variable;
    }
    InternalPhraseBuilder.prototype.build = function () {
        var e_3, _a;
        var _this = this;
        var productions = [];
        if (this.initialCallbacks.length > 0) {
            productions.push(function (ctx) {
                var e_4, _a;
                var result = undefined;
                try {
                    for (var _b = __values(_this.initialCallbacks), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var cb = _c.value;
                        result = cb(ctx);
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                return result;
            });
        }
        var _loop_2 = function (production) {
            var callback = this_1.callbacks.has(production)
                ? function (ctx) {
                    var e_5, _a;
                    var result = undefined;
                    try {
                        for (var _b = (e_5 = void 0, __values(_this.callbacks.get(production))), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var cb = _c.value;
                            result = cb(ctx);
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                    return result;
                }
                : null;
            productions.push(production);
            if (callback)
                productions.push(callback);
        };
        var this_1 = this;
        try {
            for (var _b = __values(this.productions), _c = _b.next(); !_c.done; _c = _b.next()) {
                var production = _c.value;
                _loop_2(production);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return new InternalPhrase(new Phrase(this.variable, productions));
    };
    return InternalPhraseBuilder;
}());
var PhraseBuilder = /** @class */ (function () {
    function PhraseBuilder(variable) {
        this._productions = [];
        this._initialCallbacks = [];
        this._callbacks = new Map();
        this._currentWord = null;
        this._variable = variable;
    }
    PhraseBuilder.prototype.expect = function () {
        var e_6, _a, e_7, _b, e_8, _c;
        var words = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            words[_i] = arguments[_i];
        }
        // Normalize words array
        var normalizedWords = [];
        try {
            for (var words_1 = __values(words), words_1_1 = words_1.next(); !words_1_1.done; words_1_1 = words_1.next()) {
                var word = words_1_1.value;
                if (word instanceof tokenizer_1.Token)
                    normalizedWords.push(word.name);
                else if (word instanceof Function)
                    normalizedWords.push(word);
                else if (word.split(/\s+/).length > 1) {
                    var tokens = word.split(/\s+/);
                    try {
                        for (var tokens_1 = (e_7 = void 0, __values(tokens)), tokens_1_1 = tokens_1.next(); !tokens_1_1.done; tokens_1_1 = tokens_1.next()) {
                            var t = tokens_1_1.value;
                            normalizedWords.push(t);
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (tokens_1_1 && !tokens_1_1.done && (_b = tokens_1.return)) _b.call(tokens_1);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                }
                else {
                    normalizedWords.push(word);
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (words_1_1 && !words_1_1.done && (_a = words_1.return)) _a.call(words_1);
            }
            finally { if (e_6) throw e_6.error; }
        }
        try {
            for (var normalizedWords_1 = __values(normalizedWords), normalizedWords_1_1 = normalizedWords_1.next(); !normalizedWords_1_1.done; normalizedWords_1_1 = normalizedWords_1.next()) {
                var word = normalizedWords_1_1.value;
                if (word instanceof Function)
                    this.do(word);
                else {
                    if (!this._callbacks.has(word))
                        this._callbacks.set(word, []);
                    this._productions.push(word);
                    this._currentWord = word;
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (normalizedWords_1_1 && !normalizedWords_1_1.done && (_c = normalizedWords_1.return)) _c.call(normalizedWords_1);
            }
            finally { if (e_8) throw e_8.error; }
        }
        return this;
    };
    PhraseBuilder.prototype.do = function (callback) {
        if (!this._currentWord)
            this._initialCallbacks.push(callback);
        else
            this._callbacks.get(this._currentWord).push(callback);
        return this;
    };
    return PhraseBuilder;
}());
exports.PhraseBuilder = PhraseBuilder;
var InternalPhrase = /** @class */ (function () {
    function InternalPhrase(phrase) {
        this._phrase = phrase;
    }
    Object.defineProperty(InternalPhrase.prototype, "phrase", {
        get: function () { return this._phrase; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(InternalPhrase.prototype, "variable", {
        get: function () { return this._phrase._variable; },
        set: function (variable) { this._phrase._variable = variable; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(InternalPhrase.prototype, "productions", {
        get: function () { return this._phrase._productions; },
        set: function (productions) { this._phrase._productions = productions; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(InternalPhrase.prototype, "productionCallbacks", {
        get: function () { return this._phrase._productionCallbacks; },
        set: function (callbacks) { this._phrase._productionCallbacks = callbacks; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(InternalPhrase.prototype, "callback", {
        get: function () { return this._phrase._callback; },
        set: function (cb) { this._phrase._callback = cb; },
        enumerable: false,
        configurable: true
    });
    return InternalPhrase;
}());
var Phrase = /** @class */ (function () {
    function Phrase(variable, productions, callback) {
        this._productions = [];
        this._productionCallbacks = new Map();
        this._variable = variable;
        if (productions) {
            var initialCallback = null;
            for (var i = 0; i < productions.length; i++) {
                var production = productions[i];
                if (production instanceof tokenizer_1.Token) {
                    this._productions.push(production.name);
                }
                else if (typeof (production) === 'string') {
                    this._productions.push(production);
                }
                else if (typeof (production) === 'function') {
                    if (this._productions.length == 0) {
                        initialCallback = production;
                    }
                    else {
                        this._productionCallbacks.set(this._productions[this._productions.length - 1], { Callback: production });
                    }
                }
                else {
                    throw ('Invalid phrase production rule; expecting a string got ' + typeof (production));
                }
            }
            if (initialCallback && this._productions.length > 0) {
                if (this._productionCallbacks.has(this._productions[0]))
                    this._productionCallbacks.get(this._productions[0]).PreCallback = initialCallback;
                else
                    this._productionCallbacks.set(this.productions[0], { PreCallback: initialCallback });
            }
        }
        if (callback) {
            this._callback = callback;
        }
        else {
            this._callback = function (phrase, word, token, value, context, isFinal) {
                var _a, _b, _c, _d;
                var innerCallback = word != null ? this._productionCallbacks.get(word) : null;
                if (innerCallback != null) {
                    var innerContext = {
                        phrase: phrase,
                        word: word,
                        token: token,
                        value: value,
                        bag: context,
                        isFinal: isFinal,
                        parent: context._parent,
                        child: context._child
                    };
                    var result = undefined;
                    if (isFinal)
                        result = (_a = innerCallback.Callback) === null || _a === void 0 ? void 0 : _a.apply(innerContext, [innerContext, value, token, phrase, word, isFinal, innerContext.context]);
                    else
                        result = (_b = innerCallback.PreCallback) === null || _b === void 0 ? void 0 : _b.apply(innerContext, [innerContext, value, token, phrase, word, isFinal, innerContext.context]);
                    if (result && context._parent)
                        context._parent.value = result;
                    // We need to propagate up parent bag values for aggregation productions; however,
                    // we want to specifically exclude lexical variables
                    for (var i in (_d = (_c = context._parent) === null || _c === void 0 ? void 0 : _c.bag) !== null && _d !== void 0 ? _d : []) {
                        if (["phrase", "word", "token", "value", "isFinal", "_parent", "_child"].indexOf(i) < 0)
                            context._parent[i] = context._parent.bag[i];
                    }
                }
            };
        }
    }
    Object.defineProperty(Phrase.prototype, "variable", {
        get: function () { return this._variable; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Phrase.prototype, "productions", {
        get: function () { return this._productions; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Phrase.prototype, "callback", {
        get: function () { return this._callback; },
        enumerable: false,
        configurable: true
    });
    Phrase.prototype.production = function (index) { return this._productions[index]; };
    Phrase.prototype.toString = function () { return this.variable + ' -> ' + this.productions.join(' '); };
    Phrase.for = function (variable) {
        return new PhraseBuilder(variable);
    };
    return Phrase;
}());
exports.Phrase = Phrase;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhbW1hci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9ncmFtbWFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQW9DO0FBRXBDLHlEQUE2QztBQUM3QyxJQUFNLEdBQUcsR0FBRyxJQUFJLDZCQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7QUFFbkM7SUFBQTtRQUNZLGVBQVUsR0FBd0IsSUFBSSxHQUFHLEVBQWtCLENBQUE7UUFDM0QsV0FBTSxHQUEwQixJQUFJLEdBQUcsRUFBb0IsQ0FBQTtJQXNMdkUsQ0FBQztJQXBMRyxzQkFBVyw4QkFBUzthQUFwQixjQUF5QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDOzs7T0FBQTtJQUNsRCxzQkFBVywwQkFBSzthQUFoQixjQUFxQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7T0FBQTtJQUNuQyxzQkFBSSxHQUFYLFVBQVksUUFBZ0IsSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU1RCxxQkFBRyxHQUFWLFVBQVcsUUFBZ0IsRUFBRSxFQUF1Qzs7UUFDaEUsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxGLHVCQUF1QjtRQUN2QixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7O1lBQ2xELEtBQWMsSUFBQSxZQUFBLFNBQUEsT0FBTyxDQUFBLGdDQUFBO2dCQUFoQixJQUFJLENBQUMsb0JBQUE7Z0JBQWEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7YUFBQTs7Ozs7Ozs7O1FBRXpD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Q0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7cUJBQ2xEO2lCQUNKO1lBQ0wsQ0FBQyxDQUFBO1NBQ0o7SUFDTCxDQUFDO0lBMUVELHNCQUFXLDRCQUFRO2FBQW5CLGNBQXdCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7OztPQUFBO0lBQ2hELHNCQUFXLCtCQUFXO2FBQXRCLGNBQTJCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7OztPQUFBO0lBQ3RELHNCQUFXLDRCQUFRO2FBQW5CLGNBQXdCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7OztPQUFBO0lBRXpDLDJCQUFVLEdBQWpCLFVBQWtCLEtBQWEsSUFBSSxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlELHlCQUFRLEdBQWYsY0FBb0IsT0FBTyxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkUsVUFBRyxHQUFqQixVQUFrQixRQUFnQjtRQUM5QixPQUFPLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFrRUwsYUFBQztBQUFELENBQUMsQUFqRkQsSUFpRkM7QUFqRlksd0JBQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb2tlbiB9IGZyb20gXCIuL3Rva2VuaXplclwiO1xuXG5pbXBvcnQgeyBDYXRlZ29yeSB9IGZyb20gXCJ0eXBlc2NyaXB0LWxvZ2dpbmdcIlxuY29uc3QgbG9nID0gbmV3IENhdGVnb3J5KFwiR3JhbW1hclwiKVxuXG5leHBvcnQgY2xhc3MgR3JhbW1hciB7XG4gICAgcHJpdmF0ZSBfdmFyaWFibGVzOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuICAgIHByaXZhdGUgX3J1bGVzOiBNYXA8c3RyaW5nLCBQaHJhc2VbXT4gPSBuZXcgTWFwPHN0cmluZywgUGhyYXNlW10+KClcblxuICAgIHB1YmxpYyBnZXQgdmFyaWFibGVzKCkgeyByZXR1cm4gdGhpcy5fdmFyaWFibGVzOyB9XG4gICAgcHVibGljIGdldCBydWxlcygpIHsgcmV0dXJuIHRoaXMuX3J1bGVzOyB9XG4gICAgcHVibGljIHJ1bGUodmFyaWFibGU6IHN0cmluZykgeyByZXR1cm4gdGhpcy5fcnVsZXMuZ2V0KHZhcmlhYmxlKTsgfVxuXG4gICAgcHVibGljIGZvcih2YXJpYWJsZTogc3RyaW5nLCBjYjogKHA6IFBocmFzZUJ1aWxkZXIpID0+IFBocmFzZUJ1aWxkZXIpOiBHcmFtbWFyIHtcbiAgICAgICAgY29uc3QgcGhyYXNlID0gbmV3IEludGVybmFsUGhyYXNlQnVpbGRlcihjYihuZXcgUGhyYXNlQnVpbGRlcih2YXJpYWJsZSkpKS5idWlsZCgpO1xuXG4gICAgICAgIC8vIFRyYW5zbGF0ZSB0aGUgcGhyYXNlXG4gICAgICAgIGNvbnN0IHBocmFzZXMgPSB0aGlzLmV4cGFuZFRhaWxSZWN1cnNpb25zKHBocmFzZSk7XG4gICAgICAgIGZvciAobGV0IHAgb2YgcGhyYXNlcykgdGhpcy5hZGQocC5waHJhc2UpXG5cbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4cGFuZFRhaWxSZWN1cnNpb25zKHBocmFzZTogSW50ZXJuYWxQaHJhc2UpIHtcbiAgICAgICAgaWYgKCFwaHJhc2UucHJvZHVjdGlvbnMuZmluZCgocCkgPT4gcC5pbmRleE9mKCdbXScpID49IDApKSByZXR1cm4gbmV3IFNldChbcGhyYXNlXSk7XG5cbiAgICAgICAgY29uc3QgcGhyYXNlczogU2V0PEludGVybmFsUGhyYXNlPiA9IG5ldyBTZXQ8SW50ZXJuYWxQaHJhc2U+KCk7XG4gICAgICAgIHdoaWxlIChwaHJhc2UucHJvZHVjdGlvbnMuZmluZCgocCkgPT4gcC5pbmRleE9mKCdbXScpID49IDApKSB7XG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBmaXJzdCBtYW55IHByb2R1Y3Rpb25cbiAgICAgICAgICAgIGNvbnN0IG1hbnlQcm9kdWN0aW9uSW5kZXggPSBwaHJhc2UucHJvZHVjdGlvbnMuZmluZEluZGV4KChwKSA9PiBwLmluZGV4T2YoJ1tdJykgPj0gMCk7XG4gICAgICAgICAgICBjb25zdCBtYW55UHJvZHVjdGlvbiA9IHBocmFzZS5wcm9kdWN0aW9uc1ttYW55UHJvZHVjdGlvbkluZGV4XTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSBpdGVtL2xpc3QgcGhyYXNlIGZvciB0aGUgbWFueSBwcm9kdWN0aW9uXG4gICAgICAgICAgICBjb25zdCBpdGVtVmFyaWFibGUgPSBtYW55UHJvZHVjdGlvbi5zdWJzdHJpbmcoMCwgbWFueVByb2R1Y3Rpb24ubGVuZ3RoIC0gMik7XG4gICAgICAgICAgICBjb25zdCBpdGVtTGlzdFZhcmlhYmxlID0gYF8ke2l0ZW1WYXJpYWJsZX1MSVNUX2A7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudCBwaHJhc2Ugd2l0aCB0aGUgbmV3IGxpc3QgcHJvZHVjdGlvblxuICAgICAgICAgICAgcGhyYXNlLnByb2R1Y3Rpb25zW21hbnlQcm9kdWN0aW9uSW5kZXhdID0gaXRlbUxpc3RWYXJpYWJsZTtcbiAgICAgICAgICAgIGlmIChwaHJhc2UucHJvZHVjdGlvbkNhbGxiYWNrcy5oYXMobWFueVByb2R1Y3Rpb24pKSB7XG4gICAgICAgICAgICAgICAgcGhyYXNlLnByb2R1Y3Rpb25DYWxsYmFja3Muc2V0KGl0ZW1MaXN0VmFyaWFibGUsIHBocmFzZS5wcm9kdWN0aW9uQ2FsbGJhY2tzLmdldChtYW55UHJvZHVjdGlvbikhKTtcbiAgICAgICAgICAgICAgICBwaHJhc2UucHJvZHVjdGlvbkNhbGxiYWNrcy5kZWxldGUobWFueVByb2R1Y3Rpb24pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgd2UgbmVlZCB0byBjcmVhdGUgYWdncmVnYXRlIHBocmFzZXNcbiAgICAgICAgICAgIGlmIChtYW55UHJvZHVjdGlvbkluZGV4ICE9IHBocmFzZS5wcm9kdWN0aW9ucy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWdncmVnYXRlVmFyaWFibGUgPSBgXyR7cGhyYXNlLnByb2R1Y3Rpb25zLnNsaWNlKDAsIG1hbnlQcm9kdWN0aW9uSW5kZXggKyAxKS5qb2luKCcnKX1BR0dfYDtcbiAgICAgICAgICAgICAgICBjb25zdCBhZ2dyZWdhdGVQcm9kdWN0aW9uczogYW55W10gPSBwaHJhc2UucHJvZHVjdGlvbnMuc2xpY2UoMCwgbWFueVByb2R1Y3Rpb25JbmRleCArIDEpO1xuICAgICAgICAgICAgICAgIGFnZ3JlZ2F0ZVByb2R1Y3Rpb25zLnB1c2goKGN0eDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGN0eC5wYXJlbnQudmFsdWUgPSBjdHguYmFnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhaWxQcm9kdWN0aW9ucyA9IHBocmFzZS5wcm9kdWN0aW9ucy5zbGljZShtYW55UHJvZHVjdGlvbkluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFpbFBocmFzZSA9IG5ldyBJbnRlcm5hbFBocmFzZShuZXcgUGhyYXNlKHBocmFzZS52YXJpYWJsZSwgW2FnZ3JlZ2F0ZVZhcmlhYmxlLCAuLi50YWlsUHJvZHVjdGlvbnNdKSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgdiBvZiB0YWlsUHJvZHVjdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBocmFzZS5wcm9kdWN0aW9uQ2FsbGJhY2tzLmhhcyh2KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhaWxQaHJhc2UucHJvZHVjdGlvbkNhbGxiYWNrcy5zZXQodiwgcGhyYXNlLnByb2R1Y3Rpb25DYWxsYmFja3MuZ2V0KHYpISk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBocmFzZXMuYWRkKHRhaWxQaHJhc2UpO1xuXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogQWdncmVnYXRlIHBocmFzZSBwcm9kdWN0aW9ucyBhcmUgZW1wdHkgc29tZWhvd1xuICAgICAgICAgICAgICAgIGNvbnN0IGFnZ3JlZ2F0ZVBocmFzZSA9IG5ldyBJbnRlcm5hbFBocmFzZShuZXcgUGhyYXNlKGFnZ3JlZ2F0ZVZhcmlhYmxlLCBhZ2dyZWdhdGVQcm9kdWN0aW9ucykpO1xuICAgICAgICAgICAgICAgIGFnZ3JlZ2F0ZVBocmFzZS5wcm9kdWN0aW9uQ2FsbGJhY2tzID0gcGhyYXNlLnByb2R1Y3Rpb25DYWxsYmFja3M7XG4gICAgICAgICAgICAgICAgY29uc3QgYWdncmVnYXRlUGhyYXNlTGFzdFByb2R1Y3Rpb24gPSBhZ2dyZWdhdGVQaHJhc2UucHJvZHVjdGlvbnNbYWdncmVnYXRlUGhyYXNlLnByb2R1Y3Rpb25zLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhc3RQcm9kdWN0aW9uQ2FsbGJhY2sgPSBhZ2dyZWdhdGVQaHJhc2UucHJvZHVjdGlvbkNhbGxiYWNrcy5nZXQoYWdncmVnYXRlUGhyYXNlTGFzdFByb2R1Y3Rpb24pID8/IHt9O1xuICAgICAgICAgICAgICAgIGFnZ3JlZ2F0ZVBocmFzZS5wcm9kdWN0aW9uQ2FsbGJhY2tzLnNldChhZ2dyZWdhdGVQaHJhc2VMYXN0UHJvZHVjdGlvbiwge1xuICAgICAgICAgICAgICAgICAgICBDYWxsYmFjazogKGN0eDogUGhyYXNlQ29udGV4dCwgdmFsdWU6IHN0cmluZyB8IG51bGwsIHRva2VuOiBUb2tlbiB8IG51bGwsIHBocmFzZTogUGhyYXNlIHwgbnVsbCwgd29yZDogc3RyaW5nLCBpc0ZpbmFsOiBib29sZWFuLCBjb250ZXh0OiBQaHJhc2VDb250ZXh0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVzdWx0OiBhbnkgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdFByb2R1Y3Rpb25DYWxsYmFjay5DYWxsYmFjaylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBsYXN0UHJvZHVjdGlvbkNhbGxiYWNrLkNhbGxiYWNrKGN0eCwgdmFsdWUsIHRva2VuLCBwaHJhc2UsIHdvcmQsIGlzRmluYWwsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LnBhcmVudC5iYWcgPSBjdHguYmFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgUHJlQ2FsbGJhY2s6IGxhc3RQcm9kdWN0aW9uQ2FsbGJhY2s/LlByZUNhbGxiYWNrXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcGhyYXNlcy5hZGQoYWdncmVnYXRlUGhyYXNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBocmFzZXMuYWRkKHBocmFzZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHBocmFzZXMuYWRkKG5ldyBJbnRlcm5hbFBocmFzZShuZXcgUGhyYXNlKGl0ZW1MaXN0VmFyaWFibGUsIFtcbiAgICAgICAgICAgICAgICBpdGVtVmFyaWFibGUsIGN0eCA9PiBjdHguYmFnLml0ZW0gPSBjdHgudmFsdWUsXG4gICAgICAgICAgICAgICAgaXRlbUxpc3RWYXJpYWJsZSwgY3R4ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY3R4LnZhbHVlLnVuc2hpZnQoY3R4LmJhZy5pdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgY3R4LnBhcmVudC52YWx1ZSA9IGN0eC52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdKSkpO1xuICAgICAgICAgICAgcGhyYXNlcy5hZGQobmV3IEludGVybmFsUGhyYXNlKG5ldyBQaHJhc2UoaXRlbUxpc3RWYXJpYWJsZSwgW1Rva2VuLkVQU0lMT04sIGN0eCA9PiBjdHgucGFyZW50LnZhbHVlID0gW11dKSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwaHJhc2VzO1xuICAgIH1cblxuICAgIHB1YmxpYyBhZGQocGhyYXNlOiBQaHJhc2UpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnJ1bGVzLmhhcyhwaHJhc2UudmFyaWFibGUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52YXJpYWJsZXMuc2V0KHBocmFzZS52YXJpYWJsZSwgcGhyYXNlLnZhcmlhYmxlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJ1bGVzLnNldChwaHJhc2UudmFyaWFibGUsIFtdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbG9nLnRyYWNlKGBBZGRpbmcgUGhyYXNlKCR7cGhyYXNlfSlgKVxuICAgICAgICAgICAgdGhpcy5ydWxlcy5nZXQocGhyYXNlLnZhcmlhYmxlKT8ucHVzaChwaHJhc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGdldEZpcnN0VG9rZW5zKHRva2VuOiBzdHJpbmcsIHRva2VuczogTWFwPHN0cmluZywgc3RyaW5nPiA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCkpIHtcbiAgICAgICAgaWYgKCF0aGlzLnJ1bGVzLmhhcyh0b2tlbikpIHtcbiAgICAgICAgICAgIHRva2Vucy5zZXQodG9rZW4sIHRva2VuKTtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbnM7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcnVsZXMgPSB0aGlzLnJ1bGUodG9rZW4pO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJ1bGVzIS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IHBocmFzZSA9IHJ1bGVzIVtpXTtcblxuICAgICAgICAgICAgbGV0IG5ld1Rva2VucyA9IHRoaXMuZ2V0Rmlyc3RUb2tlbnMocGhyYXNlLnByb2R1Y3Rpb24oMCksIHRva2Vucyk7XG4gICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gbmV3VG9rZW5zKSB7XG4gICAgICAgICAgICAgICAgdG9rZW5zLnNldChrZXksIGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG9rZW5zO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRGb2xsb3dUb2tlbnModG9rZW46IHN0cmluZywgcGhyYXNlOiBQaHJhc2UpIHtcbiAgICAgICAgbGV0IHNlZW5QaHJhc2VzOiBQaHJhc2VbXSA9IFtdO1xuICAgICAgICBsZXQgc2VlbkZpcnN0ID0gZmFsc2U7XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgaW5uZXIgZ2V0IHRva2VucyBtZXRob2RcbiAgICAgICAgbGV0IHJlc3VsdCA9IHRoaXMuaW5uZXJHZXRGb2xsb3dUb2tlbnMocGhyYXNlLCBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpLCBzZWVuUGhyYXNlcywgc2VlbkZpcnN0KTtcblxuICAgICAgICAvLyBSZW1vdmUgZXBzaWxvbiBmcm9tIHRoZSBsaXN0XG4gICAgICAgIHJlc3VsdC50b2tlbnMuZGVsZXRlKFRva2VuLkVQU0lMT04ubmFtZSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdC50b2tlbnM7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbm5lckdldEZvbGxvd1Rva2VucyhwaHJhc2U6IFBocmFzZSwgdG9rZW5zOiBNYXA8c3RyaW5nLCBzdHJpbmc+LCBzZWVuUGhyYXNlczogUGhyYXNlW10sIHNlZW5GaXJzdDogYm9vbGVhbik6IHsgcmVzdWx0OiBib29sZWFuLCB0b2tlbnM6IE1hcDxzdHJpbmcsIHN0cmluZz4gfSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGhyYXNlLnByb2R1Y3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgd29yZCA9IHBocmFzZS5wcm9kdWN0aW9uKGkpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayB0byBzZWUgaWYgdGhlIHdvcmQgaXMgYSBncmFtbWFyIHZhcmlhYmxlXG4gICAgICAgICAgICBpZiAoIXRoaXMudmFyaWFibGVzLmhhcyh3b3JkKSkge1xuICAgICAgICAgICAgICAgIGlmICh3b3JkID09PSBUb2tlbi5FUFNJTE9OLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGVwc2lsb25cbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnNldChUb2tlbi5FUFNJTE9OLm5hbWUsIFRva2VuLkVQU0lMT04ubmFtZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZWVuRmlyc3QgPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VlbkZpcnN0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbnMuc2V0KHdvcmQsIHdvcmQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW5zOiB0b2tlbnNcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBuZXdTZWVuRmlyc3QgPSBzZWVuRmlyc3Q7XG4gICAgICAgICAgICAgICAgbGV0IGZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBsZXQgc3ViUGhyYXNlcyA9IHRoaXMucnVsZSh3b3JkKTtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgc3ViUGhyYXNlcyEubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN1YlBocmFzZSA9IHN1YlBocmFzZXMhW2pdO1xuICAgICAgICAgICAgICAgICAgICBuZXdTZWVuRmlyc3QgPSBzZWVuRmlyc3Q7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IHRoaXMuaW5uZXJHZXRGb2xsb3dUb2tlbnMoc3ViUGhyYXNlLCB0b2tlbnMsIHNlZW5QaHJhc2VzLCBuZXdTZWVuRmlyc3QpO1xuXG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaGVkID0gZmluaXNoZWQgJiYgcmVzdWx0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zID0gcmVzdWx0LnRva2VucztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodG9rZW5zLmhhcyhUb2tlbi5FUFNJTE9OLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2Vucy5kZWxldGUoVG9rZW4uRVBTSUxPTi5uYW1lKVxuICAgICAgICAgICAgICAgICAgICBmaW5pc2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlZW5GaXJzdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2tlbnM6IHRva2Vuc1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgdG9rZW5zOiB0b2tlbnNcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbnR5cGUgUHJvZHVjdGlvbkNhbGxiYWNrID0gKGN0eDogUGhyYXNlQ29udGV4dCwgdmFsdWU6IHN0cmluZyB8IG51bGwsIHRva2VuOiBUb2tlbiB8IG51bGwsIHBocmFzZTogUGhyYXNlIHwgbnVsbCwgd29yZDogc3RyaW5nLCBpc0ZpbmFsOiBib29sZWFuLCBjb250ZXh0OiBQaHJhc2VDb250ZXh0KSA9PiB2b2lkIHwgYW55XG50eXBlIFByb2R1Y3Rpb25DYWxsYmFja1dyYXBwZXIgPSB7XG4gICAgUHJlQ2FsbGJhY2s/OiBQcm9kdWN0aW9uQ2FsbGJhY2ssXG4gICAgQ2FsbGJhY2s/OiBQcm9kdWN0aW9uQ2FsbGJhY2tcbn0gfCBudWxsO1xuXG50eXBlIFBocmFzZUNvbnRleHQgPSB7XG4gICAgcGhyYXNlOiBQaHJhc2UsXG4gICAgd29yZDogc3RyaW5nIHwgbnVsbCxcbiAgICB0b2tlbjogVG9rZW4gfCBudWxsLFxuICAgIHZhbHVlOiBzdHJpbmcgfCBudWxsLFxuICAgIGJhZzogUGhyYXNlQ29udGV4dCxcbiAgICBpc0ZpbmFsOiBib29sZWFuLFxuICAgIHBhcmVudDogUGhyYXNlQ29udGV4dCxcbiAgICBjaGlsZDogUGhyYXNlQ29udGV4dFxufSB8IGFueVxuXG5jbGFzcyBJbnRlcm5hbFBocmFzZUJ1aWxkZXIge1xuICAgIHB1YmxpYyB2YXJpYWJsZTogc3RyaW5nXG4gICAgcHVibGljIHByb2R1Y3Rpb25zOiBzdHJpbmdbXSA9IFtdXG4gICAgcHVibGljIGluaXRpYWxDYWxsYmFja3M6ICgoY3R4OiBQaHJhc2VDb250ZXh0KSA9PiB2b2lkIHwgYW55KVtdID0gW11cbiAgICBwdWJsaWMgY2FsbGJhY2tzOiBNYXA8c3RyaW5nLCAoKGN0eDogUGhyYXNlQ29udGV4dCkgPT4gdm9pZCB8IGFueSlbXT4gPSBuZXcgTWFwPHN0cmluZywgKChjdHg6IFBocmFzZUNvbnRleHQpID0+IHZvaWQpW10+KClcblxuICAgIGNvbnN0cnVjdG9yKGJ1aWxkZXI6IFBocmFzZUJ1aWxkZXIpIHtcbiAgICAgICAgdGhpcy52YXJpYWJsZSA9IChidWlsZGVyIGFzIGFueSkuX3ZhcmlhYmxlXG4gICAgICAgIHRoaXMucHJvZHVjdGlvbnMgPSAoYnVpbGRlciBhcyBhbnkpLl9wcm9kdWN0aW9uc1xuICAgICAgICB0aGlzLmluaXRpYWxDYWxsYmFja3MgPSAoYnVpbGRlciBhcyBhbnkpLl9pbml0aWFsQ2FsbGJhY2tzXG4gICAgICAgIHRoaXMuY2FsbGJhY2tzID0gKGJ1aWxkZXIgYXMgYW55KS5fY2FsbGJhY2tzXG4gICAgICAgIHRoaXMudmFyaWFibGUgPSAoYnVpbGRlciBhcyBhbnkpLl92YXJpYWJsZVxuICAgIH1cblxuICAgIHB1YmxpYyBidWlsZCgpOiBJbnRlcm5hbFBocmFzZSB7XG4gICAgICAgIGxldCBwcm9kdWN0aW9uczogKHN0cmluZyB8IFRva2VuIHwgKChjdHg6IFBocmFzZUNvbnRleHQpID0+IHZvaWQgfCBhbnkpKVtdID0gW11cbiAgICAgICAgaWYgKHRoaXMuaW5pdGlhbENhbGxiYWNrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBwcm9kdWN0aW9ucy5wdXNoKChjdHg6IFBocmFzZUNvbnRleHQpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0OiBhbnkgPSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjYiBvZiB0aGlzLmluaXRpYWxDYWxsYmFja3MpIHJlc3VsdCA9IGNiKGN0eClcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgcHJvZHVjdGlvbiBvZiB0aGlzLnByb2R1Y3Rpb25zKSB7XG4gICAgICAgICAgICBsZXQgY2FsbGJhY2sgPSB0aGlzLmNhbGxiYWNrcy5oYXMocHJvZHVjdGlvbilcbiAgICAgICAgICAgICAgICA/IChjdHg6IFBocmFzZUNvbnRleHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdDogYW55ID0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGNiIG9mIHRoaXMuY2FsbGJhY2tzLmdldChwcm9kdWN0aW9uKSEpIHJlc3VsdCA9IGNiKGN0eClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICA6IG51bGxcbiAgICAgICAgICAgIHByb2R1Y3Rpb25zLnB1c2gocHJvZHVjdGlvbilcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaylcbiAgICAgICAgICAgICAgICBwcm9kdWN0aW9ucy5wdXNoKGNhbGxiYWNrKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgSW50ZXJuYWxQaHJhc2UobmV3IFBocmFzZSh0aGlzLnZhcmlhYmxlLCBwcm9kdWN0aW9ucykpXG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUGhyYXNlQnVpbGRlciB7XG4gICAgcHJpdmF0ZSBfdmFyaWFibGU6IHN0cmluZ1xuICAgIHByaXZhdGUgX3Byb2R1Y3Rpb25zOiBzdHJpbmdbXSA9IFtdXG4gICAgcHJpdmF0ZSBfaW5pdGlhbENhbGxiYWNrczogKChjdHg6IFBocmFzZUNvbnRleHQpID0+IHZvaWQgfCBhbnkpW10gPSBbXVxuICAgIHByaXZhdGUgX2NhbGxiYWNrczogTWFwPHN0cmluZywgKChjdHg6IFBocmFzZUNvbnRleHQpID0+IHZvaWQgfCBhbnkpW10+ID0gbmV3IE1hcDxzdHJpbmcsICgoY3R4OiBQaHJhc2VDb250ZXh0KSA9PiB2b2lkKVtdPigpXG4gICAgcHJpdmF0ZSBfY3VycmVudFdvcmQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gICAgY29uc3RydWN0b3IodmFyaWFibGU6IHN0cmluZykge1xuICAgICAgICB0aGlzLl92YXJpYWJsZSA9IHZhcmlhYmxlXG4gICAgfVxuXG4gICAgcHVibGljIGV4cGVjdCguLi53b3JkczogKHN0cmluZyB8IFRva2VuIHwgKChjdHg6IFBocmFzZUNvbnRleHQpID0+IHZvaWQgfCBhbnkpKVtdKTogUGhyYXNlQnVpbGRlciB7XG4gICAgICAgIC8vIE5vcm1hbGl6ZSB3b3JkcyBhcnJheVxuICAgICAgICBjb25zdCBub3JtYWxpemVkV29yZHM6IChzdHJpbmcgfCAoKGN0eDogUGhyYXNlQ29udGV4dCkgPT4gdm9pZCB8IGFueSkpW10gPSBbXVxuICAgICAgICBmb3IgKGxldCB3b3JkIG9mIHdvcmRzKSB7XG4gICAgICAgICAgICBpZiAod29yZCBpbnN0YW5jZW9mIFRva2VuKSBub3JtYWxpemVkV29yZHMucHVzaCh3b3JkLm5hbWUpXG4gICAgICAgICAgICBlbHNlIGlmICh3b3JkIGluc3RhbmNlb2YgRnVuY3Rpb24pIG5vcm1hbGl6ZWRXb3Jkcy5wdXNoKHdvcmQpXG4gICAgICAgICAgICBlbHNlIGlmICh3b3JkLnNwbGl0KC9cXHMrLykubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGxldCB0b2tlbnMgPSB3b3JkLnNwbGl0KC9cXHMrLylcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB0IG9mIHRva2Vucykge1xuICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkV29yZHMucHVzaCh0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRXb3Jkcy5wdXNoKHdvcmQpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCB3b3JkIG9mIG5vcm1hbGl6ZWRXb3Jkcykge1xuICAgICAgICAgICAgaWYgKHdvcmQgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAgICAgICAgICAgICAgICB0aGlzLmRvKHdvcmQpXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX2NhbGxiYWNrcy5oYXMod29yZCkpIHRoaXMuX2NhbGxiYWNrcy5zZXQod29yZCwgW10pXG4gICAgICAgICAgICAgICAgdGhpcy5fcHJvZHVjdGlvbnMucHVzaCh3b3JkKVxuICAgICAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRXb3JkID0gd29yZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcHVibGljIGRvKGNhbGxiYWNrOiAoY3R4OiBQaHJhc2VDb250ZXh0KSA9PiB2b2lkIHwgYW55KTogUGhyYXNlQnVpbGRlciB7XG4gICAgICAgIGlmICghdGhpcy5fY3VycmVudFdvcmQpIHRoaXMuX2luaXRpYWxDYWxsYmFja3MucHVzaChjYWxsYmFjaylcbiAgICAgICAgZWxzZSB0aGlzLl9jYWxsYmFja3MuZ2V0KHRoaXMuX2N1cnJlbnRXb3JkKSEucHVzaChjYWxsYmFjaylcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG59XG5cbnR5cGUgUGhyYXNlQ2FsbGJhY2sgPSAocGhyYXNlOiBQaHJhc2UsIHdvcmQ6IHN0cmluZyB8IG51bGwsIHRva2VuOiBUb2tlbiB8IG51bGwsIHZhbHVlOiBzdHJpbmcgfCBudWxsLCBiYWc6IGFueSwgaXNGaW5hbDogYm9vbGVhbikgPT4gdm9pZDtcblxuY2xhc3MgSW50ZXJuYWxQaHJhc2Uge1xuICAgIHByaXZhdGUgX3BocmFzZTogYW55XG4gICAgcHVibGljIGdldCBwaHJhc2UoKSB7IHJldHVybiB0aGlzLl9waHJhc2UgYXMgUGhyYXNlIH1cbiAgICBwdWJsaWMgZ2V0IHZhcmlhYmxlKCkgeyByZXR1cm4gdGhpcy5fcGhyYXNlLl92YXJpYWJsZSB9XG4gICAgcHVibGljIGdldCBwcm9kdWN0aW9ucygpIHsgcmV0dXJuIHRoaXMuX3BocmFzZS5fcHJvZHVjdGlvbnMgYXMgc3RyaW5nW10gfVxuICAgIHB1YmxpYyBnZXQgcHJvZHVjdGlvbkNhbGxiYWNrcygpIHsgcmV0dXJuIHRoaXMuX3BocmFzZS5fcHJvZHVjdGlvbkNhbGxiYWNrcyB9XG4gICAgcHVibGljIGdldCBjYWxsYmFjaygpIHsgcmV0dXJuIHRoaXMuX3BocmFzZS5fY2FsbGJhY2sgfVxuICAgIHB1YmxpYyBzZXQgY2FsbGJhY2soY2I6IFBocmFzZUNhbGxiYWNrKSB7IHRoaXMuX3BocmFzZS5fY2FsbGJhY2sgPSBjYiB9XG4gICAgcHVibGljIHNldCB2YXJpYWJsZSh2YXJpYWJsZTogYW55KSB7IHRoaXMuX3BocmFzZS5fdmFyaWFibGUgPSB2YXJpYWJsZSB9XG4gICAgcHVibGljIHNldCBwcm9kdWN0aW9ucyhwcm9kdWN0aW9uczogc3RyaW5nW10pIHsgdGhpcy5fcGhyYXNlLl9wcm9kdWN0aW9ucyA9IHByb2R1Y3Rpb25zIH1cbiAgICBwdWJsaWMgc2V0IHByb2R1Y3Rpb25DYWxsYmFja3MoY2FsbGJhY2tzOiBNYXA8c3RyaW5nLCBQcm9kdWN0aW9uQ2FsbGJhY2tXcmFwcGVyPikgeyB0aGlzLl9waHJhc2UuX3Byb2R1Y3Rpb25DYWxsYmFja3MgPSBjYWxsYmFja3MgfVxuXG4gICAgY29uc3RydWN0b3IocGhyYXNlOiBQaHJhc2UpIHtcbiAgICAgICAgdGhpcy5fcGhyYXNlID0gcGhyYXNlXG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUGhyYXNlIHtcbiAgICBwcml2YXRlIF9jYWxsYmFjazogUGhyYXNlQ2FsbGJhY2tcbiAgICBwcml2YXRlIF92YXJpYWJsZTogYW55XG4gICAgcHJpdmF0ZSBfcHJvZHVjdGlvbnM6IHN0cmluZ1tdID0gW11cbiAgICBwcml2YXRlIF9wcm9kdWN0aW9uQ2FsbGJhY2tzOiBNYXA8c3RyaW5nLCBQcm9kdWN0aW9uQ2FsbGJhY2tXcmFwcGVyPiA9IG5ldyBNYXA8c3RyaW5nLCBQcm9kdWN0aW9uQ2FsbGJhY2tXcmFwcGVyPigpXG5cbiAgICBwdWJsaWMgZ2V0IHZhcmlhYmxlKCkgeyByZXR1cm4gdGhpcy5fdmFyaWFibGU7IH1cbiAgICBwdWJsaWMgZ2V0IHByb2R1Y3Rpb25zKCkgeyByZXR1cm4gdGhpcy5fcHJvZHVjdGlvbnM7IH1cbiAgICBwdWJsaWMgZ2V0IGNhbGxiYWNrKCkgeyByZXR1cm4gdGhpcy5fY2FsbGJhY2s7IH1cblxuICAgIHB1YmxpYyBwcm9kdWN0aW9uKGluZGV4OiBudW1iZXIpIHsgcmV0dXJuIHRoaXMuX3Byb2R1Y3Rpb25zW2luZGV4XTsgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIHRoaXMudmFyaWFibGUgKyAnIC0+ICcgKyB0aGlzLnByb2R1Y3Rpb25zLmpvaW4oJyAnKTsgfVxuXG4gICAgcHVibGljIHN0YXRpYyBmb3IodmFyaWFibGU6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gbmV3IFBocmFzZUJ1aWxkZXIodmFyaWFibGUpXG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IodmFyaWFibGU6IHN0cmluZywgcHJvZHVjdGlvbnM6IChzdHJpbmcgfCBUb2tlbiB8ICgoY3R4OiBQaHJhc2VDb250ZXh0KSA9PiB2b2lkKSlbXSwgY2FsbGJhY2s/OiAoKSA9PiB2b2lkKSB7XG4gICAgICAgIHRoaXMuX3ZhcmlhYmxlID0gdmFyaWFibGU7XG4gICAgICAgIGlmIChwcm9kdWN0aW9ucykge1xuICAgICAgICAgICAgdmFyIGluaXRpYWxDYWxsYmFjazogUHJvZHVjdGlvbkNhbGxiYWNrIHwgbnVsbCA9IG51bGw7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvZHVjdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvZHVjdGlvbiA9IHByb2R1Y3Rpb25zW2ldO1xuICAgICAgICAgICAgICAgIGlmIChwcm9kdWN0aW9uIGluc3RhbmNlb2YgVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJvZHVjdGlvbnMucHVzaChwcm9kdWN0aW9uLm5hbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIChwcm9kdWN0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJvZHVjdGlvbnMucHVzaChwcm9kdWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiAocHJvZHVjdGlvbikgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX3Byb2R1Y3Rpb25zLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsQ2FsbGJhY2sgPSBwcm9kdWN0aW9uIGFzICgpID0+IHZvaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcm9kdWN0aW9uQ2FsbGJhY2tzLnNldCh0aGlzLl9wcm9kdWN0aW9uc1t0aGlzLl9wcm9kdWN0aW9ucy5sZW5ndGggLSAxXSwgeyBDYWxsYmFjazogcHJvZHVjdGlvbiBhcyAoKSA9PiB2b2lkIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgKCdJbnZhbGlkIHBocmFzZSBwcm9kdWN0aW9uIHJ1bGU7IGV4cGVjdGluZyBhIHN0cmluZyBnb3QgJyArIHR5cGVvZiAocHJvZHVjdGlvbikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGluaXRpYWxDYWxsYmFjayAmJiB0aGlzLl9wcm9kdWN0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3Byb2R1Y3Rpb25DYWxsYmFja3MuaGFzKHRoaXMuX3Byb2R1Y3Rpb25zWzBdKSkgdGhpcy5fcHJvZHVjdGlvbkNhbGxiYWNrcy5nZXQodGhpcy5fcHJvZHVjdGlvbnNbMF0pIS5QcmVDYWxsYmFjayA9IGluaXRpYWxDYWxsYmFjaztcbiAgICAgICAgICAgICAgICBlbHNlIHRoaXMuX3Byb2R1Y3Rpb25DYWxsYmFja3Muc2V0KHRoaXMucHJvZHVjdGlvbnNbMF0sIHsgUHJlQ2FsbGJhY2s6IGluaXRpYWxDYWxsYmFjayB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2sgPSBmdW5jdGlvbiAocGhyYXNlOiBQaHJhc2UsIHdvcmQ6IHN0cmluZyB8IG51bGwsIHRva2VuOiBUb2tlbiB8IG51bGwsIHZhbHVlOiBzdHJpbmcgfCBudWxsLCBjb250ZXh0OiBQaHJhc2VDb250ZXh0LCBpc0ZpbmFsOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgbGV0IGlubmVyQ2FsbGJhY2sgPSB3b3JkICE9IG51bGwgPyB0aGlzLl9wcm9kdWN0aW9uQ2FsbGJhY2tzLmdldCh3b3JkKSA6IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKGlubmVyQ2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5uZXJDb250ZXh0OiBQaHJhc2VDb250ZXh0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGhyYXNlOiBwaHJhc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JkOiB3b3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW46IHRva2VuLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFnOiBjb250ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNGaW5hbDogaXNGaW5hbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogY29udGV4dC5fcGFyZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGQ6IGNvbnRleHQuX2NoaWxkXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdDogYW55ID0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0ZpbmFsKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gaW5uZXJDYWxsYmFjay5DYWxsYmFjaz8uYXBwbHkoaW5uZXJDb250ZXh0LCBbaW5uZXJDb250ZXh0LCB2YWx1ZSwgdG9rZW4sIHBocmFzZSwgd29yZCEsIGlzRmluYWwsIGlubmVyQ29udGV4dC5jb250ZXh0XSk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGlubmVyQ2FsbGJhY2suUHJlQ2FsbGJhY2s/LmFwcGx5KGlubmVyQ29udGV4dCwgW2lubmVyQ29udGV4dCwgdmFsdWUsIHRva2VuLCBwaHJhc2UsIHdvcmQhLCBpc0ZpbmFsLCBpbm5lckNvbnRleHQuY29udGV4dF0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBjb250ZXh0Ll9wYXJlbnQpIGNvbnRleHQuX3BhcmVudC52YWx1ZSA9IHJlc3VsdFxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIG5lZWQgdG8gcHJvcGFnYXRlIHVwIHBhcmVudCBiYWcgdmFsdWVzIGZvciBhZ2dyZWdhdGlvbiBwcm9kdWN0aW9uczsgaG93ZXZlcixcbiAgICAgICAgICAgICAgICAgICAgLy8gd2Ugd2FudCB0byBzcGVjaWZpY2FsbHkgZXhjbHVkZSBsZXhpY2FsIHZhcmlhYmxlc1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIGNvbnRleHQuX3BhcmVudD8uYmFnID8/IFtdKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoW1wicGhyYXNlXCIsIFwid29yZFwiLCBcInRva2VuXCIsIFwidmFsdWVcIiwgXCJpc0ZpbmFsXCIsIFwiX3BhcmVudFwiLCBcIl9jaGlsZFwiXS5pbmRleE9mKGkpIDwgMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0Ll9wYXJlbnRbaV0gPSBjb250ZXh0Ll9wYXJlbnQuYmFnW2ldXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59Il19
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = exports.Lexeme = void 0;
var tokenizer_1 = require("./tokenizer");
var typescript_logging_1 = require("typescript-logging");
var log = {
    lexer: new typescript_logging_1.Category("Lexer"),
    parsed: new typescript_logging_1.Category("Lexer.Parsed")
};
var vsprintf = require('sprintf-js').vsprintf;
var fs = require('fs');
var Lexeme = /** @class */ (function () {
    function Lexeme(token, value, line, column) {
        this._token = token;
        this._value = value;
        this._line = line;
        this._column = column;
    }
    Object.defineProperty(Lexeme.prototype, "token", {
        get: function () { return this._token; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Lexeme.prototype, "name", {
        get: function () { var _a, _b; return (_b = (_a = this._token) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : null; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Lexeme.prototype, "value", {
        get: function () { return this._value; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Lexeme.prototype, "line", {
        get: function () { return this._line; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Lexeme.prototype, "column", {
        get: function () { return this._column; },
        enumerable: false,
        configurable: true
    });
    Lexeme.prototype.toString = function () { var _a, _b; return ((_b = (_a = this.token) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : null) + "(" + this.value + ")"; };
    return Lexeme;
}());
exports.Lexeme = Lexeme;
var Lexer = /** @class */ (function () {
    function Lexer(startVariable, grammar, tokenizer) {
        this._lexeme = null;
        this._nextLexeme = null;
        this._tokenerator = null;
        this._parseLevel = [];
        this._startVariable = startVariable;
        this._grammar = grammar;
        this._tokenizer = tokenizer;
    }
    Object.defineProperty(Lexer.prototype, "startVariable", {
        get: function () { return this._startVariable; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Lexer.prototype, "grammar", {
        get: function () { return this._grammar; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Lexer.prototype, "tokenizer", {
        get: function () { return this._tokenizer; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Lexer.prototype, "lexeme", {
        get: function () { return this._lexeme; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Lexer.prototype, "nextLexeme", {
        get: function () { return this._nextLexeme; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Lexer.prototype, "tokenerator", {
        get: function () { return this._tokenerator; },
        enumerable: false,
        configurable: true
    });
    Lexer.prototype.parse = function (filename) {
        var _a;
        // Validate the file
        if (!fs.existsSync(filename)) {
            throw ('Invalid source file - ' + filename);
        }
        // Read the file
        var file = fs.readFileSync(filename, "utf8");
        // Create the tokenerator
        this._tokenerator = this.tokenizer.parse(file);
        // Grab the next lexeme
        this.getNextLexeme();
        var lexeme = this.lexeme;
        var nextLexeme = this.nextLexeme;
        // Check to make sure we don't have an illegal token off the bat
        if ((lexeme === null || lexeme === void 0 ? void 0 : lexeme.token) === tokenizer_1.Token.UNKNOWN) {
            throw "Error: " + filename + ":" + lexeme.line + ":" + lexeme.column + " - Unknown token found; \"" + ((_a = this.lexeme) === null || _a === void 0 ? void 0 : _a.token) + "\"";
        }
        // Call the internal parser
        this.innerParse(filename, this.startVariable, null, {});
        // Make sure we ended on the EOF token
        if ((lexeme === null || lexeme === void 0 ? void 0 : lexeme.token) === tokenizer_1.Token.EOF) {
            this.throwError(filename, lexeme, 'Expected end of file but found $s', lexeme);
        }
    };
    Lexer.prototype.throwError = function (filename, lexeme, error) {
        var params = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            params[_i - 3] = arguments[_i];
        }
        var args = Array.prototype.slice.call(arguments);
        throw "Error: " + filename + ":" + (lexeme === null || lexeme === void 0 ? void 0 : lexeme.line) + ":" + (lexeme === null || lexeme === void 0 ? void 0 : lexeme.column) + " - " + vsprintf(error, params);
    };
    Lexer.prototype.getNextLexeme = function () {
        var tokenerator = this.tokenerator;
        if (tokenerator === null || tokenerator === void 0 ? void 0 : tokenerator.next()) {
            this._lexeme = new Lexeme(tokenerator.token, tokenerator.value, tokenerator.line, tokenerator.column);
            this._nextLexeme = new Lexeme(tokenerator.nextToken, tokenerator.nextValue, tokenerator.nextLine, tokenerator.nextColumn);
            return true;
        }
        return false;
    };
    Lexer.prototype.innerParse = function (filename, variable, phrases, context) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
        // Make sure we're on a grammar token
        if (!(this.grammar.variables.has(variable))) {
            return false;
        }
        // Grab the corresponding phrases for the token
        phrases = (_a = this.grammar.rule(variable)) !== null && _a !== void 0 ? _a : [];
        // Cycle through each phrase
        for (var i = 0; i < phrases.length; i++) {
            var wrongPhrase = false;
            var phrase = phrases[i];
            // Get the first possible tokens from the first word and see if we match
            var firstTokens, followTokens, nextFollowToken;
            firstTokens = this.grammar.getFirstTokens(phrase.production(0));
            followTokens = this.grammar.getFollowTokens(variable, phrase);
            // Check to see if we match or if the first tokens contain epsilon
            if ((firstTokens.has(this.lexeme.name) || firstTokens.has(tokenizer_1.Token.EPSILON.name)) &&
                ((followTokens.has(this.nextLexeme.name) || i == phrases.length - 1) || Object.keys(followTokens).length == 0)) {
                log.lexer.trace("Potential phrase (" + phrase + ") match for " + ((_b = this.lexeme) === null || _b === void 0 ? void 0 : _b.name) + " " + ((_c = this.nextLexeme) === null || _c === void 0 ? void 0 : _c.name));
                // Either our current token or something is a match, so lets begin
                for (var j = 0; j < phrase.productions.length; j++) {
                    var word = phrase.production(j);
                    // See if the word is a grammar variable
                    if (this.grammar.variables.has(word)) {
                        // Following the successful parsing of a grammar token, call the callback
                        if (phrase.callback) {
                            phrase.callback(phrase, word, (_e = (_d = this.lexeme) === null || _d === void 0 ? void 0 : _d.token) !== null && _e !== void 0 ? _e : null, (_g = (_f = this.lexeme) === null || _f === void 0 ? void 0 : _f.value) !== null && _g !== void 0 ? _g : null, context, false);
                        }
                        // Create a child context
                        var childContext = {
                            token: (_h = this.lexeme) === null || _h === void 0 ? void 0 : _h.token,
                            value: (_j = this.lexeme) === null || _j === void 0 ? void 0 : _j.value,
                            _parent: context
                        };
                        this._parseLevel.push(word);
                        log.parsed.info("" + new Array(this._parseLevel.length).join('  ') + word);
                        // If so, we need to go inside to check to see if it matches
                        var lastLexeme = this.lexeme;
                        if (this.innerParse(filename, word, phrases, childContext) == false) {
                            // If we're here, it didn't match, no worries
                            // Potentially wrong; might need to die fast and instead only rely on the if check / look ahead tokens
                            if (!firstTokens.has(tokenizer_1.Token.EPSILON.name)) {
                                this.throwError(filename, this.lexeme, 'Unmatched grammar token: %s(%s)', (_l = (_k = this.lexeme) === null || _k === void 0 ? void 0 : _k.token) !== null && _l !== void 0 ? _l : null, (_o = (_m = this.lexeme) === null || _m === void 0 ? void 0 : _m.value) !== null && _o !== void 0 ? _o : null);
                            }
                            log.lexer.warn("Rolling back from wrong phrase: " + word + " of " + phrase + " {" + phrase.production(j) + "}");
                            wrongPhrase = true;
                            break;
                        }
                        log.parsed.info("" + new Array(this._parseLevel.length).join('  ') + this._parseLevel.pop());
                        // Update the parent tag
                        delete childContext._parent;
                        context._child = childContext;
                        // Following the successful parsing of a grammar token, we issue a callback
                        if (phrase.callback) {
                            phrase.callback(phrase, word, (_p = childContext === null || childContext === void 0 ? void 0 : childContext.token) !== null && _p !== void 0 ? _p : null, context.value, context, true);
                        }
                    }
                    else {
                        // Not a grammar token, we're actually a token
                        // See if we failed - ergo, the token doesn't match what we expected
                        if (this.lexeme.name != word && word != tokenizer_1.Token.EPSILON.name) {
                            // Throw the error
                            this.throwError(filename, this.lexeme, 'Expected %s found %s(%s) %s(%s)', word, (_r = (_q = this.lexeme) === null || _q === void 0 ? void 0 : _q.name) !== null && _r !== void 0 ? _r : null, (_t = (_s = this.lexeme) === null || _s === void 0 ? void 0 : _s.value) !== null && _t !== void 0 ? _t : null, (_v = (_u = this.nextLexeme) === null || _u === void 0 ? void 0 : _u.name) !== null && _v !== void 0 ? _v : null, (_x = (_w = this.nextLexeme) === null || _w === void 0 ? void 0 : _w.value) !== null && _x !== void 0 ? _x : null);
                        }
                        // Call the phrase action handler with null for a word
                        if (phrase.callback) {
                            phrase.callback(phrase, word, (_z = (_y = this.lexeme) === null || _y === void 0 ? void 0 : _y.token) !== null && _z !== void 0 ? _z : null, (_1 = (_0 = this.lexeme) === null || _0 === void 0 ? void 0 : _0.value) !== null && _1 !== void 0 ? _1 : null, context, true);
                        }
                        // If we're here, the token did match, now see if it was epsilon
                        if (word !== tokenizer_1.Token.EPSILON.name) {
                            // Nope, grab the next token
                            this.getNextLexeme();
                            // Make sure we don't get an illegal token
                            if (((_2 = this.lexeme) === null || _2 === void 0 ? void 0 : _2.token) === tokenizer_1.Token.UNKNOWN) {
                                this.throwError(filename, this.lexeme, 'Unknown token found; %s', (_4 = (_3 = this.lexeme) === null || _3 === void 0 ? void 0 : _3.value) !== null && _4 !== void 0 ? _4 : null);
                            }
                        }
                    }
                }
                // Potentially wrong; might need to die fast and instead only rely on the if check / look ahead tokens
                if (wrongPhrase)
                    continue;
                // We've successfully parsed this token, so return true
                return true;
            }
        }
        //this.throwError(filename, this.lexeme, 'Unmatched grammar token: %s(%s)', this.lexeme?.token ?? null, this.lexeme?.value ?? null);
        return false;
    };
    return Lexer;
}());
exports.Lexer = Lexer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGV4ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbGV4ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EseUNBQTJEO0FBQzNELHlEQUE2QztBQUU3QyxJQUFNLEdBQUcsR0FBRztJQUNSLEtBQUssRUFBRSxJQUFJLDZCQUFRLENBQUMsT0FBTyxDQUFDO0lBQzVCLE1BQU0sRUFBRSxJQUFJLDZCQUFRLENBQUMsY0FBYyxDQUFDO0NBQ3ZDLENBQUE7QUFDRCxJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFBO0FBQy9DLElBQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUV4QjtJQWFJLGdCQUFZLEtBQW1CLEVBQUUsS0FBb0IsRUFBRSxJQUFZLEVBQUUsTUFBYztRQUUvRSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztJQUMxQixDQUFDO0lBWkQsc0JBQVcseUJBQUs7YUFBaEIsY0FBbUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7O09BQUE7SUFDeEQsc0JBQVcsd0JBQUk7YUFBZiwwQkFBbUMsT0FBTyxNQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sMENBQUUsSUFBSSxtQ0FBSSxJQUFJLENBQUMsQ0FBQyxDQUFDOzs7T0FBQTtJQUN0RSxzQkFBVyx5QkFBSzthQUFoQixjQUFvQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7T0FBQTtJQUN6RCxzQkFBVyx3QkFBSTthQUFmLGNBQTRCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7OztPQUFBO0lBQ2hELHNCQUFXLDBCQUFNO2FBQWpCLGNBQThC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LElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQzs0QkFFckIsMENBQTBDOzRCQUMxQyxJQUFJLENBQUEsTUFBQSxJQUFJLENBQUMsTUFBTSwwQ0FBRSxLQUFLLE1BQUssaUJBQUssQ0FBQyxPQUFPLEVBQUU7Z0NBQ3RDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUseUJBQXlCLEVBQUUsTUFBQSxNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLEtBQUssbUNBQUksSUFBSSxDQUFDLENBQUM7NkJBQ2pHO3lCQUNKO3FCQUNKO2lCQUNKO2dCQUVELHNHQUFzRztnQkFDdEcsSUFBSSxXQUFXO29CQUFFLFNBQVM7Z0JBRTFCLHVEQUF1RDtnQkFDdkQsT0FBTyxJQUFJLENBQUM7YUFDZjtTQUNKO1FBRUQsb0lBQW9JO1FBRXBJLE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFDTCxZQUFDO0FBQUQsQ0FBQyxBQXBMRCxJQW9MQztBQXBMWSxzQkFBSyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEdyYW1tYXIsIFBocmFzZSB9IGZyb20gXCIuL2dyYW1tYXJcIlxuaW1wb3J0IHsgVG9rZW4sIFRva2VuZXJhdG9yLCBUb2tlbml6ZXIgfSBmcm9tIFwiLi90b2tlbml6ZXJcIlxuaW1wb3J0IHsgQ2F0ZWdvcnkgfSBmcm9tIFwidHlwZXNjcmlwdC1sb2dnaW5nXCJcblxuY29uc3QgbG9nID0ge1xuICAgIGxleGVyOiBuZXcgQ2F0ZWdvcnkoXCJMZXhlclwiKSxcbiAgICBwYXJzZWQ6IG5ldyBDYXRlZ29yeShcIkxleGVyLlBhcnNlZFwiKVxufVxuY29uc3QgdnNwcmludGYgPSByZXF1aXJlKCdzcHJpbnRmLWpzJykudnNwcmludGZcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKVxuXG5leHBvcnQgY2xhc3MgTGV4ZW1lXG57XG4gICAgcHJpdmF0ZSBfdG9rZW46IFRva2VuIHwgbnVsbDtcbiAgICBwcml2YXRlIF92YWx1ZTogc3RyaW5nIHwgbnVsbDtcbiAgICBwcml2YXRlIF9saW5lOiBudW1iZXI7XG4gICAgcHJpdmF0ZSBfY29sdW1uOiBudW1iZXI7XG5cbiAgICBwdWJsaWMgZ2V0IHRva2VuKCk6IFRva2VuIHwgbnVsbCB7IHJldHVybiB0aGlzLl90b2tlbjsgfVxuICAgIHB1YmxpYyBnZXQgbmFtZSgpOiBzdHJpbmcgfCBudWxsIHsgcmV0dXJuIHRoaXMuX3Rva2VuPy5uYW1lID8/IG51bGw7IH1cbiAgICBwdWJsaWMgZ2V0IHZhbHVlKCk6IHN0cmluZyB8IG51bGwgeyByZXR1cm4gdGhpcy5fdmFsdWU7IH1cbiAgICBwdWJsaWMgZ2V0IGxpbmUoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuX2xpbmU7IH1cbiAgICBwdWJsaWMgZ2V0IGNvbHVtbigpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5fY29sdW1uOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcih0b2tlbjogVG9rZW4gfCBudWxsLCB2YWx1ZTogc3RyaW5nIHwgbnVsbCwgbGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcilcbiAgICB7XG4gICAgICAgIHRoaXMuX3Rva2VuID0gdG9rZW47XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX2xpbmUgPSBsaW5lO1xuICAgICAgICB0aGlzLl9jb2x1bW4gPSBjb2x1bW47XG4gICAgfVxuXG4gICAgcHVibGljIHRvU3RyaW5nKCk6IHN0cmluZyB7IHJldHVybiBgJHt0aGlzLnRva2VuPy5uYW1lID8/IG51bGx9KCR7dGhpcy52YWx1ZX0pYDsgfVxufVxuXG5leHBvcnQgY2xhc3MgTGV4ZXJcbntcbiAgICBwcml2YXRlIF9zdGFydFZhcmlhYmxlOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfZ3JhbW1hcjogR3JhbW1hcjtcbiAgICBwcml2YXRlIF90b2tlbml6ZXI6IFRva2VuaXplcjtcbiAgICBwcml2YXRlIF9sZXhlbWU6IExleGVtZSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX25leHRMZXhlbWU6IExleGVtZSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX3Rva2VuZXJhdG9yOiBUb2tlbmVyYXRvciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX3BhcnNlTGV2ZWw6IHN0cmluZ1tdID0gW107XG5cbiAgICBwdWJsaWMgZ2V0IHN0YXJ0VmFyaWFibGUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX3N0YXJ0VmFyaWFibGU7IH1cbiAgICBwdWJsaWMgZ2V0IGdyYW1tYXIoKTogR3JhbW1hciB7IHJldHVybiB0aGlzLl9ncmFtbWFyOyB9XG4gICAgcHVibGljIGdldCB0b2tlbml6ZXIoKTogVG9rZW5pemVyIHsgcmV0dXJuIHRoaXMuX3Rva2VuaXplcjsgfVxuICAgIHB1YmxpYyBnZXQgbGV4ZW1lKCk6IExleGVtZSB8IG51bGwgeyByZXR1cm4gdGhpcy5fbGV4ZW1lOyB9XG4gICAgcHVibGljIGdldCBuZXh0TGV4ZW1lKCk6IExleGVtZSB8IG51bGwgeyByZXR1cm4gdGhpcy5fbmV4dExleGVtZTsgfVxuICAgIHB1YmxpYyBnZXQgdG9rZW5lcmF0b3IoKTogVG9rZW5lcmF0b3IgfCBudWxsIHsgcmV0dXJuIHRoaXMuX3Rva2VuZXJhdG9yOyB9XG5cbiAgICBjb25zdHJ1Y3RvcihzdGFydFZhcmlhYmxlOiBzdHJpbmcsIGdyYW1tYXI6IEdyYW1tYXIsIHRva2VuaXplcjogVG9rZW5pemVyKSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0VmFyaWFibGUgPSBzdGFydFZhcmlhYmxlO1xuICAgICAgICB0aGlzLl9ncmFtbWFyID0gZ3JhbW1hcjtcbiAgICAgICAgdGhpcy5fdG9rZW5pemVyID0gdG9rZW5pemVyO1xuICAgIH1cblxuICAgIHB1YmxpYyBwYXJzZShmaWxlbmFtZTogc3RyaW5nKSB7XG4gICAgICAgIC8vIFZhbGlkYXRlIHRoZSBmaWxlXG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhmaWxlbmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93ICgnSW52YWxpZCBzb3VyY2UgZmlsZSAtICcgKyBmaWxlbmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWFkIHRoZSBmaWxlXG4gICAgICAgIGxldCBmaWxlID0gZnMucmVhZEZpbGVTeW5jKGZpbGVuYW1lLCBcInV0ZjhcIik7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSB0b2tlbmVyYXRvclxuICAgICAgICB0aGlzLl90b2tlbmVyYXRvciA9IHRoaXMudG9rZW5pemVyLnBhcnNlKGZpbGUpO1xuXG4gICAgICAgIC8vIEdyYWIgdGhlIG5leHQgbGV4ZW1lXG4gICAgICAgIHRoaXMuZ2V0TmV4dExleGVtZSgpO1xuICAgICAgICBsZXQgbGV4ZW1lID0gdGhpcy5sZXhlbWU7XG4gICAgICAgIGxldCBuZXh0TGV4ZW1lID0gdGhpcy5uZXh0TGV4ZW1lO1xuXG4gICAgICAgIC8vIENoZWNrIHRvIG1ha2Ugc3VyZSB3ZSBkb24ndCBoYXZlIGFuIGlsbGVnYWwgdG9rZW4gb2ZmIHRoZSBiYXRcbiAgICAgICAgaWYgKGxleGVtZT8udG9rZW4gPT09IFRva2VuLlVOS05PV04pIHtcbiAgICAgICAgICAgIHRocm93IGBFcnJvcjogJHtmaWxlbmFtZX06JHtsZXhlbWUhLmxpbmV9OiR7bGV4ZW1lIS5jb2x1bW59IC0gVW5rbm93biB0b2tlbiBmb3VuZDsgXFxcIiR7dGhpcy5sZXhlbWU/LnRva2VufVxcXCJgO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgaW50ZXJuYWwgcGFyc2VyXG4gICAgICAgIHRoaXMuaW5uZXJQYXJzZShmaWxlbmFtZSwgdGhpcy5zdGFydFZhcmlhYmxlLCBudWxsLCB7fSk7XG5cbiAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGVuZGVkIG9uIHRoZSBFT0YgdG9rZW5cbiAgICAgICAgaWYgKGxleGVtZT8udG9rZW4gPT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgdGhpcy50aHJvd0Vycm9yKGZpbGVuYW1lLCBsZXhlbWUsICdFeHBlY3RlZCBlbmQgb2YgZmlsZSBidXQgZm91bmQgJHMnLCBsZXhlbWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB0aHJvd0Vycm9yKGZpbGVuYW1lOiBzdHJpbmcsIGxleGVtZTogTGV4ZW1lIHwgbnVsbCwgZXJyb3I6IHN0cmluZywgLi4ucGFyYW1zOiBhbnlbXSk6IHZvaWQge1xuICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHRocm93IGBFcnJvcjogJHtmaWxlbmFtZX06JHtsZXhlbWU/LmxpbmV9OiR7bGV4ZW1lPy5jb2x1bW59IC0gJHt2c3ByaW50ZihlcnJvciwgcGFyYW1zKX1gO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0TmV4dExleGVtZSgpOiBib29sZWFuIHtcbiAgICAgICAgdmFyIHRva2VuZXJhdG9yID0gdGhpcy50b2tlbmVyYXRvciE7XG4gICAgXG4gICAgICAgIGlmICh0b2tlbmVyYXRvcj8ubmV4dCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9sZXhlbWUgPSBuZXcgTGV4ZW1lKHRva2VuZXJhdG9yLnRva2VuLCB0b2tlbmVyYXRvci52YWx1ZSwgdG9rZW5lcmF0b3IubGluZSwgdG9rZW5lcmF0b3IuY29sdW1uKTtcbiAgICAgICAgICAgIHRoaXMuX25leHRMZXhlbWUgPSBuZXcgTGV4ZW1lKHRva2VuZXJhdG9yLm5leHRUb2tlbiwgdG9rZW5lcmF0b3IubmV4dFZhbHVlLCB0b2tlbmVyYXRvci5uZXh0TGluZSwgdG9rZW5lcmF0b3IubmV4dENvbHVtbik7XG4gICAgXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbm5lclBhcnNlKGZpbGVuYW1lOiBzdHJpbmcsIHZhcmlhYmxlOiBzdHJpbmcsIHBocmFzZXM6IFBocmFzZVtdIHwgbnVsbCwgY29udGV4dDogYW55KTogYm9vbGVhbiB7XG4gICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSdyZSBvbiBhIGdyYW1tYXIgdG9rZW5cbiAgICAgICAgaWYgKCEodGhpcy5ncmFtbWFyLnZhcmlhYmxlcy5oYXModmFyaWFibGUpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIC8vIEdyYWIgdGhlIGNvcnJlc3BvbmRpbmcgcGhyYXNlcyBmb3IgdGhlIHRva2VuXG4gICAgICAgIHBocmFzZXMgPSB0aGlzLmdyYW1tYXIucnVsZSh2YXJpYWJsZSkgPz8gW107XG4gICAgXG4gICAgICAgIC8vIEN5Y2xlIHRocm91Z2ggZWFjaCBwaHJhc2VcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwaHJhc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgd3JvbmdQaHJhc2UgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBwaHJhc2UgPSBwaHJhc2VzW2ldO1xuICAgIFxuICAgICAgICAgICAgLy8gR2V0IHRoZSBmaXJzdCBwb3NzaWJsZSB0b2tlbnMgZnJvbSB0aGUgZmlyc3Qgd29yZCBhbmQgc2VlIGlmIHdlIG1hdGNoXG4gICAgICAgICAgICB2YXIgZmlyc3RUb2tlbnMsIGZvbGxvd1Rva2VucywgbmV4dEZvbGxvd1Rva2VuO1xuICAgICAgICAgICAgZmlyc3RUb2tlbnMgPSB0aGlzLmdyYW1tYXIuZ2V0Rmlyc3RUb2tlbnMocGhyYXNlLnByb2R1Y3Rpb24oMCkpO1xuICAgICAgICAgICAgZm9sbG93VG9rZW5zID0gdGhpcy5ncmFtbWFyLmdldEZvbGxvd1Rva2Vucyh2YXJpYWJsZSwgcGhyYXNlKTtcbiAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiB3ZSBtYXRjaCBvciBpZiB0aGUgZmlyc3QgdG9rZW5zIGNvbnRhaW4gZXBzaWxvblxuICAgICAgICAgICAgaWYgKChmaXJzdFRva2Vucy5oYXModGhpcy5sZXhlbWUhLm5hbWUhKSB8fCBmaXJzdFRva2Vucy5oYXMoVG9rZW4uRVBTSUxPTi5uYW1lKSkgJiZcbiAgICAgICAgICAgICAgICAoKGZvbGxvd1Rva2Vucy5oYXModGhpcy5uZXh0TGV4ZW1lIS5uYW1lISkgfHwgaSA9PSBwaHJhc2VzLmxlbmd0aCAtIDEpIHx8IE9iamVjdC5rZXlzKGZvbGxvd1Rva2VucykubGVuZ3RoID09IDApKSB7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbG9nLmxleGVyLnRyYWNlKGBQb3RlbnRpYWwgcGhyYXNlICgke3BocmFzZX0pIG1hdGNoIGZvciAke3RoaXMubGV4ZW1lPy5uYW1lfSAke3RoaXMubmV4dExleGVtZT8ubmFtZX1gKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVpdGhlciBvdXIgY3VycmVudCB0b2tlbiBvciBzb21ldGhpbmcgaXMgYSBtYXRjaCwgc28gbGV0cyBiZWdpblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcGhyYXNlLnByb2R1Y3Rpb25zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB3b3JkID0gcGhyYXNlLnByb2R1Y3Rpb24oaik7XG4gICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNlZSBpZiB0aGUgd29yZCBpcyBhIGdyYW1tYXIgdmFyaWFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZ3JhbW1hci52YXJpYWJsZXMuaGFzKHdvcmQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb2xsb3dpbmcgdGhlIHN1Y2Nlc3NmdWwgcGFyc2luZyBvZiBhIGdyYW1tYXIgdG9rZW4sIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGhyYXNlLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGhyYXNlLmNhbGxiYWNrKHBocmFzZSwgd29yZCwgdGhpcy5sZXhlbWU/LnRva2VuID8/IG51bGwsIHRoaXMubGV4ZW1lPy52YWx1ZSA/PyBudWxsLCBjb250ZXh0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYSBjaGlsZCBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGRDb250ZXh0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuOiB0aGlzLmxleGVtZT8udG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMubGV4ZW1lPy52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcGFyZW50OiBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wYXJzZUxldmVsLnB1c2god29yZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2cucGFyc2VkLmluZm8oYCR7bmV3IEFycmF5KHRoaXMuX3BhcnNlTGV2ZWwubGVuZ3RoKS5qb2luKCcgICcpfSR7d29yZH1gKTtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHNvLCB3ZSBuZWVkIHRvIGdvIGluc2lkZSB0byBjaGVjayB0byBzZWUgaWYgaXQgbWF0Y2hlc1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxhc3RMZXhlbWUgPSB0aGlzLmxleGVtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlubmVyUGFyc2UoZmlsZW5hbWUsIHdvcmQsIHBocmFzZXMsIGNoaWxkQ29udGV4dCkgPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSdyZSBoZXJlLCBpdCBkaWRuJ3QgbWF0Y2gsIG5vIHdvcnJpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQb3RlbnRpYWxseSB3cm9uZzsgbWlnaHQgbmVlZCB0byBkaWUgZmFzdCBhbmQgaW5zdGVhZCBvbmx5IHJlbHkgb24gdGhlIGlmIGNoZWNrIC8gbG9vayBhaGVhZCB0b2tlbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpcnN0VG9rZW5zLmhhcyhUb2tlbi5FUFNJTE9OLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGhyb3dFcnJvcihmaWxlbmFtZSwgdGhpcy5sZXhlbWUsICdVbm1hdGNoZWQgZ3JhbW1hciB0b2tlbjogJXMoJXMpJywgdGhpcy5sZXhlbWU/LnRva2VuID8/IG51bGwsIHRoaXMubGV4ZW1lPy52YWx1ZSA/PyBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cubGV4ZXIud2FybihgUm9sbGluZyBiYWNrIGZyb20gd3JvbmcgcGhyYXNlOiAke3dvcmR9IG9mICR7cGhyYXNlfSB7JHtwaHJhc2UucHJvZHVjdGlvbihqKX19YClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cm9uZ1BocmFzZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZy5wYXJzZWQuaW5mbyhgJHtuZXcgQXJyYXkodGhpcy5fcGFyc2VMZXZlbC5sZW5ndGgpLmpvaW4oJyAgJyl9JHt0aGlzLl9wYXJzZUxldmVsLnBvcCgpfWApO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBwYXJlbnQgdGFnXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgY2hpbGRDb250ZXh0Ll9wYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0Ll9jaGlsZCA9IGNoaWxkQ29udGV4dDtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvbGxvd2luZyB0aGUgc3VjY2Vzc2Z1bCBwYXJzaW5nIG9mIGEgZ3JhbW1hciB0b2tlbiwgd2UgaXNzdWUgYSBjYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBocmFzZS5jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBocmFzZS5jYWxsYmFjayhwaHJhc2UsIHdvcmQsIGNoaWxkQ29udGV4dD8udG9rZW4gPz8gbnVsbCwgY29udGV4dC52YWx1ZSwgY29udGV4dCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb3QgYSBncmFtbWFyIHRva2VuLCB3ZSdyZSBhY3R1YWxseSBhIHRva2VuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWUgaWYgd2UgZmFpbGVkIC0gZXJnbywgdGhlIHRva2VuIGRvZXNuJ3QgbWF0Y2ggd2hhdCB3ZSBleHBlY3RlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubGV4ZW1lIS5uYW1lICE9IHdvcmQgJiYgd29yZCAhPSBUb2tlbi5FUFNJTE9OLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaHJvdyB0aGUgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRocm93RXJyb3IoZmlsZW5hbWUsIHRoaXMubGV4ZW1lLCAnRXhwZWN0ZWQgJXMgZm91bmQgJXMoJXMpICVzKCVzKScsIHdvcmQsIHRoaXMubGV4ZW1lPy5uYW1lID8/IG51bGwsIHRoaXMubGV4ZW1lPy52YWx1ZSA/PyBudWxsLCB0aGlzLm5leHRMZXhlbWU/Lm5hbWUgPz8gbnVsbCwgdGhpcy5uZXh0TGV4ZW1lPy52YWx1ZSA/PyBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENhbGwgdGhlIHBocmFzZSBhY3Rpb24gaGFuZGxlciB3aXRoIG51bGwgZm9yIGEgd29yZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBocmFzZS5jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBocmFzZS5jYWxsYmFjayhwaHJhc2UsIHdvcmQsIHRoaXMubGV4ZW1lPy50b2tlbiA/PyBudWxsLCB0aGlzLmxleGVtZT8udmFsdWUgPz8gbnVsbCwgY29udGV4dCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSdyZSBoZXJlLCB0aGUgdG9rZW4gZGlkIG1hdGNoLCBub3cgc2VlIGlmIGl0IHdhcyBlcHNpbG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAod29yZCAhPT0gVG9rZW4uRVBTSUxPTi5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm9wZSwgZ3JhYiB0aGUgbmV4dCB0b2tlblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0TmV4dExleGVtZSgpO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBkb24ndCBnZXQgYW4gaWxsZWdhbCB0b2tlblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmxleGVtZT8udG9rZW4gPT09IFRva2VuLlVOS05PV04pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aHJvd0Vycm9yKGZpbGVuYW1lLCB0aGlzLmxleGVtZSwgJ1Vua25vd24gdG9rZW4gZm91bmQ7ICVzJywgdGhpcy5sZXhlbWU/LnZhbHVlID8/IG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFBvdGVudGlhbGx5IHdyb25nOyBtaWdodCBuZWVkIHRvIGRpZSBmYXN0IGFuZCBpbnN0ZWFkIG9ubHkgcmVseSBvbiB0aGUgaWYgY2hlY2sgLyBsb29rIGFoZWFkIHRva2Vuc1xuICAgICAgICAgICAgICAgIGlmICh3cm9uZ1BocmFzZSkgY29udGludWU7XG4gICAgXG4gICAgICAgICAgICAgICAgLy8gV2UndmUgc3VjY2Vzc2Z1bGx5IHBhcnNlZCB0aGlzIHRva2VuLCBzbyByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgXG4gICAgICAgIC8vdGhpcy50aHJvd0Vycm9yKGZpbGVuYW1lLCB0aGlzLmxleGVtZSwgJ1VubWF0Y2hlZCBncmFtbWFyIHRva2VuOiAlcyglcyknLCB0aGlzLmxleGVtZT8udG9rZW4gPz8gbnVsbCwgdGhpcy5sZXhlbWU/LnZhbHVlID8/IG51bGwpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59Il19
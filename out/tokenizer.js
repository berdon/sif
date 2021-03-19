"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tokenerator = exports.Tokenizer = exports.Token = void 0;
var Token = /** @class */ (function () {
    function Token(name, matcher) {
        this._name = name;
        this._matcher = matcher != null ? matcher instanceof RegExp ? matcher : new RegExp(matcher) : null;
    }
    Object.defineProperty(Token.prototype, "name", {
        get: function () { return this._name; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Token.prototype, "matcher", {
        get: function () { return this._matcher; },
        enumerable: false,
        configurable: true
    });
    Token.prototype.toString = function () { return this.name; };
    Token.fromJson = function (json) {
        var tokens = [];
        if (Array.isArray(json)) {
            for (var i = 0; i < json.length; i++) {
                if ('name' in json[i] && 'matcher' in json[i]) {
                    tokens.push(new Token(json[i].name, json[i].matcher));
                }
                else if (json[i].length == 2) {
                    tokens.push(new Token(json[i][0], json[i][1]));
                }
            }
        }
        else {
            for (var key in json) {
                tokens.push(new Token(key, json[key]));
            }
        }
        return tokens;
    };
    Token.EPSILON = new Token('EPSILON');
    Token.UNKNOWN = new Token('UNKNOWN');
    Token.EOF = new Token('EOF');
    return Token;
}());
exports.Token = Token;
var Tokenizer = /** @class */ (function () {
    function Tokenizer(tokens) {
        this._tokens = tokens;
    }
    Object.defineProperty(Tokenizer.prototype, "tokens", {
        get: function () { return this._tokens; },
        enumerable: false,
        configurable: true
    });
    Tokenizer.prototype.parse = function (text) {
        return new Tokenerator(this, text);
    };
    Tokenizer.prototype.toString = function () {
        var result = '';
        for (var key in this.tokens) {
            result += key + ' -> ' + this.tokens[key].matcher + '\r\n';
        }
        return result;
    };
    Tokenizer.fromJson = function (json) {
        return new Tokenizer(Token.fromJson(json));
    };
    return Tokenizer;
}());
exports.Tokenizer = Tokenizer;
var Tokenerator = /** @class */ (function () {
    function Tokenerator(tokenizer, text) {
        this._token = null;
        this._value = null;
        this._nextToken = null;
        this._nextValue = null;
        this._line = 0;
        this._column = 0;
        this._nextLine = 0;
        this._nextColumn = 0;
        this._linesSinceLastToken = 0;
        this._lastNewline = 0;
        this._tokenizer = tokenizer;
        this._text = text;
        var whitespaceCount = this._text.length - this._text.trimLeft().length;
        this._position = whitespaceCount;
    }
    Object.defineProperty(Tokenerator.prototype, "tokenizer", {
        get: function () { return this._tokenizer; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "text", {
        get: function () { return this._text; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "position", {
        get: function () { return this._position; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "token", {
        get: function () { return this._token; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "value", {
        get: function () { return this._value; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "nextToken", {
        get: function () { return this._nextToken; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "nextValue", {
        get: function () { return this._nextValue; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "line", {
        get: function () { return this._line; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "column", {
        get: function () { return this._column; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "nextLine", {
        get: function () { return this._nextLine; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "nextColumn", {
        get: function () { return this._nextColumn; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "linesSinceLastToken", {
        get: function () { return this._linesSinceLastToken; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenerator.prototype, "lastNewline", {
        get: function () { return this._lastNewline; },
        enumerable: false,
        configurable: true
    });
    Tokenerator.prototype.toString = function () {
        return this.token + '(' + this.value + ')@' + this.line + ':' + this.column + ' ' + (this.nextToken != null ? ('> ' + this.nextToken + '(' + this.nextValue + ')@' + this.nextLine + ':' + this.nextColumn) : '');
    };
    Tokenerator.prototype.next = function () {
        var _a, _b;
        var value = '';
        // Pull up the next token stats
        this._token = this.nextToken;
        this._value = this.nextValue;
        this._line = this.nextLine;
        this._column = this.nextColumn;
        if (this.position >= this.text.length) {
            if (this.nextToken === Token.EOF) {
                this._nextToken = null;
                this._nextLine = -1;
                this._nextColumn = -1;
                this._nextValue = null;
            }
            else {
                this._nextToken = Token.EOF;
                this._nextValue = 'eof';
            }
            return this.token != null;
        }
        do {
            // Grab the next text block to match against
            var originalBlock = this.text.substring(this.position);
            var block = originalBlock.trimLeft();
            var whitespaceCount = originalBlock.length - block.length;
            var originalPosition = this._position;
            this._position += whitespaceCount;
            var matchFound = false;
            for (var i = 0; i < this.tokenizer.tokens.length; i++) {
                var token = this.tokenizer.tokens[i];
                var matchResult = (_a = token.matcher) === null || _a === void 0 ? void 0 : _a.exec(block);
                if (matchResult && matchResult.index == 0) {
                    var newLineMatchResult = originalBlock.substring(0, this.position - originalPosition).match(/\n/) || [];
                    this._nextLine = this.nextLine + newLineMatchResult.length;
                    this._nextColumn = newLineMatchResult.length > 0 ? this.position - (originalPosition + newLineMatchResult.index) - 1 : (this.nextColumn + whitespaceCount + matchResult[0].length);
                    this._position += matchResult[0].length;
                    this._nextToken = token;
                    this._nextValue = matchResult[0].trim();
                    matchFound = true;
                    break;
                }
            }
        } while (((_b = this.nextToken) === null || _b === void 0 ? void 0 : _b.name) === 'IGNORE');
        if (!this.token && this.nextToken) {
            return this.next();
        }
        if (!matchFound && this.position < this.text.length) {
            // If we're here we weren't able to figure out what the next token is supposed to be
            this._nextToken = Token.UNKNOWN;
            this._nextValue = block;
        }
        return this.token != null;
    };
    return Tokenerator;
}());
exports.Tokenerator = Tokenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Rva2VuaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTtJQWFJLGVBQVksSUFBWSxFQUFFLE9BQXlCO1FBRS9DLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxZQUFZLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3ZHLENBQUM7SUFURCxzQkFBVyx1QkFBSTthQUFmLGNBQW9CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7OztPQUFBO0lBQ3hDLHNCQUFXLDBCQUFPO2FBQWxCLGNBQXVCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7OztPQUFBO0lBRXZDLHdCQUFRLEdBQWYsY0FBNEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBLENBQUMsQ0FBQztJQVFoQyxjQUFRLEdBQXRCLFVBQXVCLElBQVM7UUFFNUIsSUFBSSxNQUFNLEdBQVksRUFBRSxDQUFDO1FBQ3pCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNyQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDbEMsSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzNDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMs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YyBzdGF0aWMgcmVhZG9ubHkgRVBTSUxPTiA9IG5ldyBUb2tlbignRVBTSUxPTicpO1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgVU5LTk9XTiA9IG5ldyBUb2tlbignVU5LTk9XTicpO1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgRU9GID0gbmV3IFRva2VuKCdFT0YnKTtcblxuICAgIHByaXZhdGUgX25hbWU6IHN0cmluZztcbiAgICBwcml2YXRlIF9tYXRjaGVyOiBSZWdFeHAgfCBudWxsO1xuXG4gICAgcHVibGljIGdldCBuYW1lKCkgeyByZXR1cm4gdGhpcy5fbmFtZTsgfVxuICAgIHB1YmxpYyBnZXQgbWF0Y2hlcigpIHsgcmV0dXJuIHRoaXMuX21hdGNoZXI7IH1cblxuICAgIHB1YmxpYyB0b1N0cmluZygpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5uYW1lIH1cblxuICAgIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgbWF0Y2hlcj86IHN0cmluZyB8IFJlZ0V4cClcbiAgICB7XG4gICAgICAgIHRoaXMuX25hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLl9tYXRjaGVyID0gbWF0Y2hlciAhPSBudWxsID8gbWF0Y2hlciBpbnN0YW5jZW9mIFJlZ0V4cCA/IG1hdGNoZXIgOiBuZXcgUmVnRXhwKG1hdGNoZXIpIDogbnVsbDtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RhdGljIGZyb21Kc29uKGpzb246IGFueSk6IFRva2VuW11cbiAgICB7XG4gICAgICAgIHZhciB0b2tlbnM6IFRva2VuW10gPSBbXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoanNvbikpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwganNvbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICgnbmFtZScgaW4ganNvbltpXSAmJiAnbWF0Y2hlcicgaW4ganNvbltpXSkge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChuZXcgVG9rZW4oanNvbltpXS5uYW1lLCBqc29uW2ldLm1hdGNoZXIpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGpzb25baV0ubGVuZ3RoID09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnB1c2gobmV3IFRva2VuKGpzb25baV1bMF0sIGpzb25baV1bMV0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4ganNvbikge1xuICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKG5ldyBUb2tlbihrZXksIGpzb25ba2V5XSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b2tlbnM7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVG9rZW5pemVyIHtcbiAgICBwcml2YXRlIF90b2tlbnM6IFRva2VuW11cbiAgICBwdWJsaWMgZ2V0IHRva2VucygpIHsgcmV0dXJuIHRoaXMuX3Rva2VuczsgfVxuXG4gICAgY29uc3RydWN0b3IodG9rZW5zOiBUb2tlbltdKVxuICAgIHtcbiAgICAgICAgdGhpcy5fdG9rZW5zID0gdG9rZW5zO1xuICAgIH1cblxuICAgIHB1YmxpYyBwYXJzZSh0ZXh0OiBzdHJpbmcpOiBUb2tlbmVyYXRvclxuICAgIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUb2tlbmVyYXRvcih0aGlzLCB0ZXh0KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgdG9TdHJpbmcoKTogc3RyaW5nXG4gICAge1xuICAgICAgICB2YXIgcmVzdWx0ID0gJyc7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLnRva2Vucykge1xuICAgICAgICAgICAgcmVzdWx0ICs9IGtleSArICcgLT4gJyArIHRoaXMudG9rZW5zW2tleV0ubWF0Y2hlciArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcHVibGljIHN0YXRpYyBmcm9tSnNvbihqc29uOiBhbnkpOiBUb2tlbml6ZXJcbiAgICB7XG4gICAgICAgIHJldHVybiBuZXcgVG9rZW5pemVyKFRva2VuLmZyb21Kc29uKGpzb24pKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUb2tlbmVyYXRvclxue1xuICAgIHByaXZhdGUgX3Rva2VuaXplcjogVG9rZW5pemVyO1xuICAgIHByaXZhdGUgX3RleHQ6IHN0cmluZztcbiAgICBwcml2YXRlIF9wb3NpdGlvbjogbnVtYmVyO1xuICAgIHByaXZhdGUgX3Rva2VuOiBUb2tlbiB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX3ZhbHVlOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIF9uZXh0VG9rZW46IFRva2VuIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBfbmV4dFZhbHVlOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIF9saW5lOiBudW1iZXIgPSAwO1xuICAgIHByaXZhdGUgX2NvbHVtbjogbnVtYmVyID0gMDtcbiAgICBwcml2YXRlIF9uZXh0TGluZTogbnVtYmVyID0gMDtcbiAgICBwcml2YXRlIF9uZXh0Q29sdW1uOiBudW1iZXIgPSAwO1xuICAgIHByaXZhdGUgX2xpbmVzU2luY2VMYXN0VG9rZW46IG51bWJlciA9IDA7XG4gICAgcHJpdmF0ZSBfbGFzdE5ld2xpbmU6IG51bWJlciA9IDA7XG5cbiAgICBwdWJsaWMgZ2V0IHRva2VuaXplcigpIHsgcmV0dXJuIHRoaXMuX3Rva2VuaXplcjsgfVxuICAgIHB1YmxpYyBnZXQgdGV4dCgpIHsgcmV0dXJuIHRoaXMuX3RleHQ7IH1cbiAgICBwdWJsaWMgZ2V0IHBvc2l0aW9uKCkgeyByZXR1cm4gdGhpcy5fcG9zaXRpb247IH1cbiAgICBwdWJsaWMgZ2V0IHRva2VuKCkgeyByZXR1cm4gdGhpcy5fdG9rZW47IH1cbiAgICBwdWJsaWMgZ2V0IHZhbHVlKCkgeyByZXR1cm4gdGhpcy5fdmFsdWU7IH1cbiAgICBwdWJsaWMgZ2V0IG5leHRUb2tlbigpIHsgcmV0dXJuIHRoaXMuX25leHRUb2tlbjsgfVxuICAgIHB1YmxpYyBnZXQgbmV4dFZhbHVlKCkgeyByZXR1cm4gdGhpcy5fbmV4dFZhbHVlOyB9XG4gICAgcHVibGljIGdldCBsaW5lKCkgeyByZXR1cm4gdGhpcy5fbGluZTsgfVxuICAgIHB1YmxpYyBnZXQgY29sdW1uKCkgeyByZXR1cm4gdGhpcy5fY29sdW1uOyB9XG4gICAgcHVibGljIGdldCBuZXh0TGluZSgpIHsgcmV0dXJuIHRoaXMuX25leHRMaW5lOyB9XG4gICAgcHVibGljIGdldCBuZXh0Q29sdW1uKCkgeyByZXR1cm4gdGhpcy5fbmV4dENvbHVtbjsgfVxuICAgIHB1YmxpYyBnZXQgbGluZXNTaW5jZUxhc3RUb2tlbigpIHsgcmV0dXJuIHRoaXMuX2xpbmVzU2luY2VMYXN0VG9rZW47IH1cbiAgICBwdWJsaWMgZ2V0IGxhc3ROZXdsaW5lKCkgeyByZXR1cm4gdGhpcy5fbGFzdE5ld2xpbmU7IH1cblxuICAgIGNvbnN0cnVjdG9yKHRva2VuaXplcjogVG9rZW5pemVyLCB0ZXh0OiBzdHJpbmcpXG4gICAge1xuICAgICAgICB0aGlzLl90b2tlbml6ZXIgPSB0b2tlbml6ZXI7XG4gICAgICAgIHRoaXMuX3RleHQgPSB0ZXh0O1xuICAgICAgICBjb25zdCB3aGl0ZXNwYWNlQ291bnQgPSB0aGlzLl90ZXh0Lmxlbmd0aCAtIHRoaXMuX3RleHQudHJpbUxlZnQoKS5sZW5ndGg7XG4gICAgICAgIHRoaXMuX3Bvc2l0aW9uID0gd2hpdGVzcGFjZUNvdW50O1xuICAgIH1cblxuICAgIHB1YmxpYyB0b1N0cmluZygpOiBzdHJpbmdcbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLnRva2VuICsgJygnICsgdGhpcy52YWx1ZSArICcpQCcgKyB0aGlzLmxpbmUgKyAnOicgKyB0aGlzLmNvbHVtbiArICcgJyArICh0aGlzLm5leHRUb2tlbiAhPSBudWxsID8gKCc+ICcgKyB0aGlzLm5leHRUb2tlbiArICcoJyArIHRoaXMubmV4dFZhbHVlICsgJylAJyArIHRoaXMubmV4dExpbmUgKyAnOicgKyB0aGlzLm5leHRDb2x1bW4pIDogJycpO1xuICAgIH1cblxuICAgIHB1YmxpYyBuZXh0KCk6IGJvb2xlYW5cbiAgICB7XG4gICAgICAgIHZhciB2YWx1ZSA9ICcnO1xuXG4gICAgICAgIC8vIFB1bGwgdXAgdGhlIG5leHQgdG9rZW4gc3RhdHNcbiAgICAgICAgdGhpcy5fdG9rZW4gPSB0aGlzLm5leHRUb2tlbjtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSB0aGlzLm5leHRWYWx1ZTtcbiAgICAgICAgdGhpcy5fbGluZSA9IHRoaXMubmV4dExpbmU7XG4gICAgICAgIHRoaXMuX2NvbHVtbiA9IHRoaXMubmV4dENvbHVtbjtcblxuICAgICAgICBpZiAodGhpcy5wb3NpdGlvbiA+PSB0aGlzLnRleHQubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5uZXh0VG9rZW4gPT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgICAgIHRoaXMuX25leHRUb2tlbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dExpbmUgPSAtMTtcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q29sdW1uID0gLTE7XG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dFZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dFRva2VuID0gVG9rZW4uRU9GO1xuICAgICAgICAgICAgICAgIHRoaXMuX25leHRWYWx1ZSA9ICdlb2YnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b2tlbiAhPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgLy8gR3JhYiB0aGUgbmV4dCB0ZXh0IGJsb2NrIHRvIG1hdGNoIGFnYWluc3RcbiAgICAgICAgICAgIHZhciBvcmlnaW5hbEJsb2NrID0gdGhpcy50ZXh0LnN1YnN0cmluZyh0aGlzLnBvc2l0aW9uKTtcbiAgICAgICAgICAgIHZhciBibG9jayA9IG9yaWdpbmFsQmxvY2sudHJpbUxlZnQoKTtcbiAgICAgICAgICAgIHZhciB3aGl0ZXNwYWNlQ291bnQgPSBvcmlnaW5hbEJsb2NrLmxlbmd0aCAtIGJsb2NrLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciBvcmlnaW5hbFBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XG4gICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiArPSB3aGl0ZXNwYWNlQ291bnQ7XG5cbiAgICAgICAgICAgIHZhciBtYXRjaEZvdW5kID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50b2tlbml6ZXIudG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRva2VuID0gdGhpcy50b2tlbml6ZXIudG9rZW5zW2ldO1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaFJlc3VsdCA9IHRva2VuLm1hdGNoZXI/LmV4ZWMoYmxvY2spO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoUmVzdWx0ICYmIG1hdGNoUmVzdWx0LmluZGV4ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0xpbmVNYXRjaFJlc3VsdDogYW55ID0gb3JpZ2luYWxCbG9jay5zdWJzdHJpbmcoMCwgdGhpcy5wb3NpdGlvbiAtIG9yaWdpbmFsUG9zaXRpb24pLm1hdGNoKC9cXG4vKSB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbmV4dExpbmUgPSB0aGlzLm5leHRMaW5lICsgbmV3TGluZU1hdGNoUmVzdWx0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbmV4dENvbHVtbiA9IG5ld0xpbmVNYXRjaFJlc3VsdC5sZW5ndGggPiAwID8gdGhpcy5wb3NpdGlvbiAtIChvcmlnaW5hbFBvc2l0aW9uICsgbmV3TGluZU1hdGNoUmVzdWx0LmluZGV4KSAtIDEgOiAodGhpcy5uZXh0Q29sdW1uICsgd2hpdGVzcGFjZUNvdW50ICsgbWF0Y2hSZXN1bHRbMF0ubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiArPSBtYXRjaFJlc3VsdFswXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX25leHRUb2tlbiA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9uZXh0VmFsdWUgPSBtYXRjaFJlc3VsdFswXS50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSB3aGlsZSAodGhpcy5uZXh0VG9rZW4/Lm5hbWUgPT09ICdJR05PUkUnKVxuXG4gICAgICAgIGlmICghdGhpcy50b2tlbiAmJiB0aGlzLm5leHRUb2tlbikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubmV4dCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFtYXRjaEZvdW5kICYmIHRoaXMucG9zaXRpb24gPCB0aGlzLnRleHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSdyZSBoZXJlIHdlIHdlcmVuJ3QgYWJsZSB0byBmaWd1cmUgb3V0IHdoYXQgdGhlIG5leHQgdG9rZW4gaXMgc3VwcG9zZWQgdG8gYmVcbiAgICAgICAgICAgIHRoaXMuX25leHRUb2tlbiA9IFRva2VuLlVOS05PV047XG4gICAgICAgICAgICB0aGlzLl9uZXh0VmFsdWUgPSBibG9jaztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLnRva2VuICE9IG51bGw7XG4gICAgfVxufSJdfQ==
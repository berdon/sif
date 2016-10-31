var utils = require('./utils.js');

function Token(name, matcher) {
    this._name = name;
    this._matcher = typeof(matcher) === 'string' ? new RegExp(matcher) : matcher;
}

Token.fromJson = function(json) {
    var tokens = [];
    if (Array.isArray(json)) {
        for (var i = 0; i < json.length; i++) {
            if ('name' in json[i] && 'matcher' in json[i]) {
                tokens.push(new Token(json[i].name, json[i].matcher));
            } else if (json[i].length == 2) {
                tokens.push(new Token(json[i][0], json[i][1]));
            }
        }
    } else {
        for (var key in json) {
            tokens.push(new Token(key, json[key]));
        }
    }
    return tokens;
}

Token.prototype = {
    name: utils.property.call(this, 'name'),
    matcher: utils.property.call(this, 'matcher'),
    toString: function() {
        return this.name();
    }
}

function Tokenizer(tokens) {
    if (!Array.isArray(tokens)) {
        throw ("Tokenizer(tokens) - tokens must be an array of Token objects");
    }
    this._tokens = tokens;
}

Tokenizer.prototype = {
    tokens: utils.property.call(this, 'tokens'),
    parse: function(text) {
        return new Tokenerator(this, text);
    },
    toString: function() {
        var result = '';
        for (var key in this.tokens()) {
            result += key + ' -> ' + this.tokens()[key].matcher() + '\r\n';
        }
        return result;
    }
}

Tokenizer.fromJson = function(json) {
    return new Tokenizer(Token.fromJson(json));
}

function Tokenerator(tokenizer, text) {
    this._tokenizer = tokenizer;
    this._text = text;
    var whitespaceCount = this._text.length - this._text.trimLeft().length;
    this._position = whitespaceCount;
    this._token = null;
    this._nextToken = null;
    this._line = 0;
    this._column = 0;
    this._nextLine = 0;
    this._nextColumn = 0;

    this._linesSinceLastToken = 0;
    this._lastNewline = 0;
}

Tokenerator.prototype = {
    tokenizer: utils.getter.call(this, 'tokenizer'),

    text: utils.getter.call(this, 'text'),

    position: utils.getter.call(this, 'position'),

    token: utils.getter.call(this, 'token'),
    value: utils.getter.call(this, 'value'),
    line: utils.getter.call(this, 'line'),
    column: utils.getter.call(this, 'column'),

    nextToken: utils.getter.call(this, 'nextToken'),
    nextValue: utils.getter.call(this, 'nextValue'),
    nextLine: utils.getter.call(this, 'nextLine'),
    nextColumn: utils.getter.call(this, 'nextColumn'),

    toString: function() {
        return this.token() + '(' + this.value() + ')@' + this.line() + ':' + this.column() + ' ' + (this.nextToken() == true ? ('> ' + this.nextToken() + '(' + this.nextValue() + ')@' + this.nextLine() + ':' + this.nextColumn()) : '');
    },

    next: function() {
        var value = '';

        // Pull up the next token stats
        this._token = this.nextToken();
        this._value = this.nextValue();
        this._line = this.nextLine();
        this._column = this.nextColumn();

        if (this.position() >= this.text().length) {
            if (this.nextToken() === Token.EOF) {
                this._nextToken = null;
                this._nextLine = null;
                this._nextColumn = null;
                this._nextValue = undefined;
            } else {
                this._nextToken = Token.EOF;
                this._nextValue = 'eof';
            }

            return this.token();
        }

        do {
            // Grab the next text block to match against
            var originalBlock = this.text().substring(this.position());
            var block = originalBlock.trimLeft();
            var whitespaceCount = originalBlock.length - block.length;
            var originalPosition = this._position;
            this._position += whitespaceCount;

            var matchFound = false;

            for (var i = 0; i < this.tokenizer().tokens().length; i++) {
                var token = this.tokenizer().tokens()[i];
                var matchResult = token.matcher().exec(block);

                if (matchResult && matchResult.index == 0) {
                    var newLineMatchResult = originalBlock.substring(0, this.position() - originalPosition).match(/\n/) || [];
                    this._nextLine = this.nextLine() + newLineMatchResult.length;
                    this._nextColumn = newLineMatchResult.length > 0 ? this.position() - (originalPosition + newLineMatchResult.index) - 1 : (this.nextColumn() + whitespaceCount + matchResult[0].length);

                    this._position += matchResult[matchResult.length - 1].length;
                    this._nextToken = token;
                    this._nextValue = matchResult[matchResult.length - 1].trim();

                    matchFound = true;
                    break;
                }
            }
        } while (this.nextToken().name() === 'IGNORE')

        if (!this.token() && this.nextToken()) {
            return this.next();
        }

        if (!matchFound && this.position() < this.text().length) {
            // If we're here we weren't able to figure out what the next token is supposed to be
            this._nextToken = Token.UNKNOWN;
            this._nextValue = block;
        }

        return this.token() !== undefined;
    }
}

Token.LAMBDA = new Token('LAMBDA');
Token.UNKNOWN = new Token('UNKNOWN');
Token.EOF = new Token('EOF');

module.exports = {
    Tokenizer: Tokenizer,
    Token: Token
}
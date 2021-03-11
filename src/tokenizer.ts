export class Token {
    public static readonly EPSILON = new Token('EPSILON');
    public static readonly UNKNOWN = new Token('UNKNOWN');
    public static readonly EOF = new Token('EOF');

    private _name: string;
    private _matcher: RegExp | null;

    public get name() { return this._name; }
    public get matcher() { return this._matcher; }

    public toString(): string { return this.name }

    constructor(name: string, matcher?: string | RegExp)
    {
        this._name = name;
        this._matcher = matcher != null ? matcher instanceof RegExp ? matcher : new RegExp(matcher) : null;
    }

    public static fromJson(json: any): Token[]
    {
        var tokens: Token[] = [];
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
}

export class Tokenizer {
    private _tokens: Token[]
    public get tokens() { return this._tokens; }

    constructor(tokens: Token[])
    {
        this._tokens = tokens;
    }

    public parse(text: string): Tokenerator
    {
        return new Tokenerator(this, text);
    }

    public toString(): string
    {
        var result = '';
        for (var key in this.tokens) {
            result += key + ' -> ' + this.tokens[key].matcher + '\r\n';
        }
        return result;
    }

    public static fromJson(json: any): Tokenizer
    {
        return new Tokenizer(Token.fromJson(json));
    }
}

export class Tokenerator
{
    private _tokenizer: Tokenizer;
    private _text: string;
    private _position: number;
    private _token: Token | null = null;
    private _value: string | null = null;
    private _nextToken: Token | null = null;
    private _nextValue: string | null = null;
    private _line: number = 0;
    private _column: number = 0;
    private _nextLine: number = 0;
    private _nextColumn: number = 0;
    private _linesSinceLastToken: number = 0;
    private _lastNewline: number = 0;

    public get tokenizer() { return this._tokenizer; }
    public get text() { return this._text; }
    public get position() { return this._position; }
    public get token() { return this._token; }
    public get value() { return this._value; }
    public get nextToken() { return this._nextToken; }
    public get nextValue() { return this._nextValue; }
    public get line() { return this._line; }
    public get column() { return this._column; }
    public get nextLine() { return this._nextLine; }
    public get nextColumn() { return this._nextColumn; }
    public get linesSinceLastToken() { return this._linesSinceLastToken; }
    public get lastNewline() { return this._lastNewline; }

    constructor(tokenizer: Tokenizer, text: string)
    {
        this._tokenizer = tokenizer;
        this._text = text;
        const whitespaceCount = this._text.length - this._text.trimLeft().length;
        this._position = whitespaceCount;
    }

    public toString(): string
    {
        return this.token + '(' + this.value + ')@' + this.line + ':' + this.column + ' ' + (this.nextToken != null ? ('> ' + this.nextToken + '(' + this.nextValue + ')@' + this.nextLine + ':' + this.nextColumn) : '');
    }

    public next(): boolean
    {
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
            } else {
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
                var matchResult = token.matcher?.exec(block);

                if (matchResult && matchResult.index == 0) {
                    var newLineMatchResult: any = originalBlock.substring(0, this.position - originalPosition).match(/\n/) || [];
                    this._nextLine = this.nextLine + newLineMatchResult.length;
                    this._nextColumn = newLineMatchResult.length > 0 ? this.position - (originalPosition + newLineMatchResult.index) - 1 : (this.nextColumn + whitespaceCount + matchResult[0].length);

                    this._position += matchResult[0].length;
                    this._nextToken = token;
                    this._nextValue = matchResult[0].trim();

                    matchFound = true;
                    break;
                }
            }
        } while (this.nextToken?.name === 'IGNORE')

        if (!this.token && this.nextToken) {
            return this.next();
        }

        if (!matchFound && this.position < this.text.length) {
            // If we're here we weren't able to figure out what the next token is supposed to be
            this._nextToken = Token.UNKNOWN;
            this._nextValue = block;
        }

        return this.token != null;
    }
}